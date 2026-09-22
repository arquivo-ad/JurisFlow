import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactFalcaoDocumentUrl, isExactFalcaoSearchUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const FALCAO_API = 'https://jurisprudencia.jt.jus.br/jurisprudencia-nacional-backend/api/no-auth';
const FALCAO_SEARCH = FALCAO_API + '/pesquisa';

type FetchLike = typeof fetch;

interface FalcaoDocument {
  numeroProcesso?: string;
  siglaClasseProcesso?: string;
  classeProcesso?: string;
  relator?: string;
  tribunal?: string;
  turma?: string;
  textoAcordao?: string;
  ementa?: string;
  possuiEmenta?: string;
  idDocumentoAcordao?: string | number;
  dataJulgamento?: string;
  dataJuntada?: string;
  referenciaLegislativa?: string[];
  prioridades?: string[] | null;
}

interface FalcaoSearchPayload {
  documentos?: FalcaoDocument[];
  quantidadeTotal?: number;
  userMessage?: string;
  developerMessage?: string;
}

export interface FalcaoSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  totalRecords: number;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sessionId(seed: string): string {
  return '_' + sha256(seed).slice(0, 7);
}

function brDate(value?: string): string | undefined {
  const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? match[3] + '-' + match[2] + '-' + match[1] : undefined;
}

function textOnly(value?: string): string {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function courtName(code: string): string {
  const match = code.match(/^TRT(\d{1,2})$/);
  return match ? 'Tribunal Regional do Trabalho da ' + Number(match[1]) + 'ª Região' : code;
}

function buildDetailUrl(courtCode: string, documentId: string): string {
  const url = new URL(FALCAO_SEARCH + '/acordaos/' + courtCode + '/' + documentId);
  url.searchParams.set('sessionId', sessionId(courtCode + ':' + documentId));
  url.searchParams.set('latitude', '');
  url.searchParams.set('longitude', '');
  return url.toString();
}

export class FalcaoJurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 35_000
  ) {}

  public async searchOfficialJurisprudence(query: string, courtCode: string, limit = 5): Promise<FalcaoSearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const normalizedCourt = String(courtCode || '').trim().toUpperCase();
    const safeQuery = String(query || '').trim().slice(0, 500);
    const safeLimit = Math.max(1, Math.min(limit, 5));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (!/^TRT(?:[1-9]|1\d|2[0-4])$/.test(normalizedCourt)) {
        throw new Error('Tribunal Falcão inválido: use TRT1 a TRT24.');
      }
      if (!safeQuery) throw new Error('Consulta Falcão vazia.');

      const queryUrl = new URL(FALCAO_SEARCH);
      queryUrl.searchParams.set('sessionId', sessionId(normalizedCourt + ':' + safeQuery));
      queryUrl.searchParams.set('latitude', '');
      queryUrl.searchParams.set('longitude', '');
      queryUrl.searchParams.set('texto', safeQuery);
      queryUrl.searchParams.set('tribunais', normalizedCourt);
      queryUrl.searchParams.set('colecao', 'acordaos');
      queryUrl.searchParams.set('page', '0');
      queryUrl.searchParams.set('size', '5');

      if (!isExactFalcaoSearchUrl(queryUrl.toString(), normalizedCourt)) {
        throw new Error('Endpoint de pesquisa Falcão fora da allowlist exata.');
      }

      const searchResponse = await this.fetchImpl(queryUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      const searchBytes = Buffer.from(await searchResponse.arrayBuffer());
      const searchText = searchBytes.toString('utf8');

      if (searchResponse.status === 429) {
        return this.failureDiagnostic(normalizedCourt, queryUrl.toString(), timestamp, startedAt, 429, 'RATE_LIMITED', 'Falcão retornou HTTP 429; nenhuma decisão foi reutilizada ou fabricada.');
      }
      if (!searchResponse.ok) {
        return this.failureDiagnostic(normalizedCourt, queryUrl.toString(), timestamp, startedAt, searchResponse.status, 'SOURCE_UNAVAILABLE', 'HTTP ' + searchResponse.status + ' na pesquisa Falcão.');
      }

      let payload: FalcaoSearchPayload;
      try {
        payload = JSON.parse(searchText);
      } catch {
        return this.failureDiagnostic(normalizedCourt, queryUrl.toString(), timestamp, startedAt, 502, 'PARSER_ERROR', 'Falcão retornou JSON inválido.');
      }

      if (payload.userMessage && !Array.isArray(payload.documentos)) {
        return this.failureDiagnostic(normalizedCourt, queryUrl.toString(), timestamp, startedAt, 502, 'SOURCE_UNAVAILABLE', payload.userMessage);
      }

      const records = (payload.documentos || [])
        .filter((doc) => String(doc.tribunal || '').toUpperCase() === normalizedCourt)
        .slice(0, safeLimit);

      const querySha256 = sha256(queryUrl.searchParams.toString());
      const decisions: CanonicalLegalDecision[] = [];
      const rejectionReasons: string[] = [];

      for (const record of records) {
        const id = String(record.idDocumentoAcordao || '').trim();
        if (!/^\d+$/.test(id)) {
          rejectionReasons.push('Registro Falcão sem idDocumentoAcordao válido.');
          continue;
        }

        const detailUrl = buildDetailUrl(normalizedCourt, id);
        if (!isExactFalcaoDocumentUrl(detailUrl, normalizedCourt, id)) {
          rejectionReasons.push('URL individual Falcão rejeitada pela allowlist.');
          continue;
        }

        const detailResponse = await this.fetchImpl(detailUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
          },
          redirect: 'follow',
          signal: controller.signal,
        });
        const detailBytes = Buffer.from(await detailResponse.arrayBuffer());

        if (detailResponse.status === 429) {
          rejectionReasons.push('RATE_LIMITED: Falcão retornou HTTP 429 ao confirmar documento ' + id + '.');
          break;
        }
        if (!detailResponse.ok) {
          rejectionReasons.push('Documento Falcão ' + id + ' retornou HTTP ' + detailResponse.status + '.');
          continue;
        }

        let detailPayload: FalcaoSearchPayload;
        try {
          detailPayload = JSON.parse(detailBytes.toString('utf8'));
        } catch {
          rejectionReasons.push('Documento Falcão ' + id + ' retornou JSON inválido.');
          continue;
        }

        const individual = detailPayload.documentos?.[0];
        if (!individual || String(individual.idDocumentoAcordao || '') !== id || String(individual.tribunal || '').toUpperCase() !== normalizedCourt) {
          rejectionReasons.push('Documento individual Falcão divergente do registro de busca.');
          continue;
        }

        const decision = this.normalizeDecision(
          individual,
          detailUrl,
          detailBytes,
          queryUrl.toString(),
          querySha256,
          sha256(JSON.stringify(record)),
          timestamp
        );

        if (decision.verificationStatus === 'VERIFIED_OFFICIAL') decisions.push(decision);
        else rejectionReasons.push(...(decision.rejectionReasons || ['Registro Falcão rejeitado pelo verificador.']));
      }

      return {
        decisions,
        totalRecords: Number(payload.quantidadeTotal || records.length),
        diagnostic: {
          adapter: 'falcao-jurisprudencia',
          sourceName: 'Sistema Falcão - Repositório Nacional de Jurisprudência da Justiça do Trabalho',
          courtCode: normalizedCourt,
          officialUrl: queryUrl.toString(),
          timestamp,
          httpStatus: searchResponse.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length > 0 ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length > 0
            ? 'Pesquisa Falcão concluída com confirmação individual dos acórdãos.'
            : 'Falcão respondeu, mas nenhum acórdão reuniu evidência suficiente para verificação.',
          bytesTransferred: searchBytes.length,
          contentSha256: sha256(searchBytes),
          documentsReceived: records.length,
          documentsNormalized: decisions.length,
          documentsRejected: records.length - decisions.length,
          recordsRead: records.length,
          recordsAccepted: decisions.length,
          recordsRejected: records.length - decisions.length,
          parsingErrors: [],
          rejectionReasons,
          normalizedQueryNumber: safeQuery,
          connectorStatus: rejectionReasons.some((reason) => reason.includes('RATE_LIMITED')) ? 'DEGRADED' : 'HEALTHY',
        },
      };
    } catch (error: any) {
      const isTimeout = error?.name === 'AbortError';
      return this.failureDiagnostic(
        normalizedCourt || courtCode,
        FALCAO_SEARCH,
        timestamp,
        startedAt,
        isTimeout ? 408 : 503,
        'SOURCE_UNAVAILABLE',
        isTimeout ? 'Tempo limite ao consultar o Sistema Falcão.' : String(error?.message || error)
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  public normalizeDecision(
    record: FalcaoDocument,
    detailUrl: string,
    detailBytes: Buffer,
    queryEndpoint: string,
    querySha256: string,
    responseRecordSha256: string,
    timestamp: string
  ): CanonicalLegalDecision {
    const courtCode = String(record.tribunal || '').toUpperCase();
    const rawCaseNumber = String(record.numeroProcesso || '').trim();
    const normalizedCnjNumber = DataJudAdapter.normalizeCnjNumber(rawCaseNumber);
    const documentId = String(record.idDocumentoAcordao || '').trim();
    const ementa = textOnly(record.ementa);
    const contentSha256 = sha256(detailBytes);

    const decision: CanonicalLegalDecision = {
      id: 'falcao-' + courtCode.toLowerCase() + '-' + contentSha256.slice(0, 20),
      sourceId: 'falcao-jurisprudencia',
      officialUrl: detailUrl,
      fullTextUrl: detailUrl,
      court: courtName(courtCode),
      courtCode,
      judicialBranch: 'TRABALHO',
      jurisdiction: courtCode,
      courtOrgan: String(record.turma || '').trim(),
      processClass: String(record.siglaClasseProcesso || record.classeProcesso || '').trim(),
      rawCaseNumber,
      normalizedCnjNumber: normalizedCnjNumber || undefined,
      alternativeNumber: documentId,
      rapporteur: String(record.relator || '').trim(),
      judgmentDate: brDate(record.dataJulgamento),
      availabilityDate: brDate(record.dataJuntada),
      officialHeadnote: ementa,
      fullText: textOnly(record.textoAcordao),
      citedLegislation: Array.isArray(record.referenciaLegislativa) ? record.referenciaLegislativa : undefined,
      documentType: 'ACORDAO',
      precedentSituation: 'JULGADO',
      precedentStrength: 'PERSUASIVO_REGIONAL',
      language: 'pt-BR',
      contentSha256,
      collectedAt: timestamp,
      lastVerifiedAt: timestamp,
      verificationStatus: 'FOUND_UNVERIFIED',
      parserVersion: 'falcao-json-2026.1',
      documentVersion: 1,
      rawPayloadPreserved: {
        verificationEvidence: {
          individualDocument: {
            confirmed: true,
            url: detailUrl,
            httpStatus: 200,
            contentSha256,
            bytes: detailBytes.length,
            fetchedAt: timestamp,
          },
          originatingQuery: {
            id: 'falcao-query-' + querySha256.slice(0, 24),
            endpoint: queryEndpoint,
            querySha256,
            responseRecordSha256,
            executedAt: timestamp,
          },
        },
        documentId,
        tribunal: courtCode,
      },
    };

    const verification = PrecedentVerifier.verifyDecision(decision);
    decision.verificationStatus = verification.status;
    decision.lastVerifiedAt = verification.verificationTimestamp;
    decision.verificationBadge = verification.isPassed ? '[OFICIAL FALCÃO/' + courtCode + ' - VERIFICADO]' : undefined;
    decision.rejectionReasons = verification.isPassed ? undefined : verification.issues;
    return decision;
  }

  private failureDiagnostic(
    courtCode: string,
    officialUrl: string,
    timestamp: string,
    startedAt: number,
    httpStatus: number,
    lifecycleState: 'SOURCE_UNAVAILABLE' | 'PARSER_ERROR' | 'RATE_LIMITED',
    message: string
  ): FalcaoSearchResult {
    return {
      decisions: [],
      totalRecords: 0,
      diagnostic: {
        adapter: 'falcao-jurisprudencia',
        sourceName: 'Sistema Falcão - Repositório Nacional de Jurisprudência da Justiça do Trabalho',
        courtCode: String(courtCode || '').toUpperCase(),
        officialUrl,
        timestamp,
        httpStatus,
        latencyMs: Date.now() - startedAt,
        lifecycleState: lifecycleState === 'RATE_LIMITED' ? 'SOURCE_UNAVAILABLE' : lifecycleState,
        stateDescription: message,
        bytesTransferred: 0,
        documentsReceived: 0,
        documentsNormalized: 0,
        documentsRejected: 0,
        recordsRead: 0,
        recordsAccepted: 0,
        recordsRejected: 0,
        parsingErrors: lifecycleState === 'PARSER_ERROR' ? [message] : [],
        rejectionReasons: [message],
        normalizedQueryNumber: '',
        connectorStatus: httpStatus === 429 ? 'DEGRADED' : 'FAILED',
      },
    };
  }
}
