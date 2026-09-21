import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactTjpaDetailUrl, isExactTjpaSearchUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TJPA_BASE = 'https://jurisprudencia.tjpa.jus.br';
const TJPA_SEARCH = TJPA_BASE + '/bff/api/decisoes/buscar';
const TJPA_DETAIL = TJPA_BASE + '/bff/api/decisoes/buscar-por-numero-documento';
type FetchLike = typeof fetch;

interface TjpaRecord {
  id?: number;
  numeroprocesso?: string;
  tipo?: string;
  origem?: string;
  datapublicacao?: string;
  datajulgamento?: string;
  datadocumento?: string;
  pessoas?: string[];
  orgaojulgadorcolegiado?: { nome?: string };
  classe?: { nome?: string; codigo?: string };
  textoementa?: string;
  textooriginal?: string;
  textopuro?: string;
}
interface TjpaEnvelope {
  message?: string;
  data?: {
    content?: TjpaRecord[];
    totalElements?: number;
    totalAcordaos?: number;
    totalDecisoesMonocraticas?: number;
  };
}

export interface TjpaSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  totalRecords: number;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function textOnly(value?: string): string {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function isoDate(value?: string): string | undefined {
  const text = String(value || '').trim();
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function buildSearchBody(query: string, limit: number) {
  return {
    query,
    queryType: 'free',
    queryScope: 'ementa',
    origem: ['Tribunal de Justiça do Estado do Pará'],
    tipo: ['Acórdão'],
    page: 0,
    size: limit,
    sortBy: 'relevancia',
    sortOrder: 'desc',
  };
}

export class TjpaJurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 35_000
  ) {}

  async searchOfficialJurisprudence(query: string, limit = 5): Promise<TjpaSearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const safeQuery = String(query || '').trim().slice(0, 500);
    const safeLimit = Math.max(1, Math.min(limit, 10));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      if (!safeQuery) throw new Error('Consulta TJPA vazia.');
      if (!isExactTjpaSearchUrl(TJPA_SEARCH)) throw new Error('Endpoint TJPA fora da allowlist exata.');

      const requestBody = JSON.stringify(buildSearchBody(safeQuery, safeLimit));
      const searchResponse = await this.fetchImpl(TJPA_SEARCH, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Referer: TJPA_BASE + '/',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
        },
        body: requestBody,
        signal: controller.signal,
      });

      const searchBytes = Buffer.from(await searchResponse.arrayBuffer());
      if (!searchResponse.ok) {
        return this.failure(timestamp, startedAt, searchResponse.status, 'SOURCE_UNAVAILABLE',
          'HTTP ' + searchResponse.status + ' na busca TJPA.');
      }

      let payload: TjpaEnvelope;
      try {
        payload = JSON.parse(searchBytes.toString('utf8'));
      } catch {
        return this.failure(timestamp, startedAt, 502, 'PARSER_ERROR', 'Busca TJPA retornou JSON inválido.');
      }

      const records = (payload.data?.content || []).slice(0, safeLimit);
      const decisions: CanonicalLegalDecision[] = [];
      const rejectionReasons: string[] = [];
      const querySha256 = sha256(requestBody);
      for (const record of records) {
        const id = Number(record.id);
        const cnj = DataJudAdapter.normalizeCnjNumber(String(record.numeroprocesso || ''));
        if (!Number.isInteger(id) || id <= 0 || !cnj || record.tipo !== 'Acórdão') {
          rejectionReasons.push('Registro TJPA sem identidade processual válida.');
          continue;
        }

        if (!isExactTjpaDetailUrl(TJPA_DETAIL)) {
          rejectionReasons.push('Endpoint individual TJPA fora da allowlist.');
          continue;
        }

        const detailBody = JSON.stringify({ id });
        const detailResponse = await this.fetchImpl(TJPA_DETAIL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Referer: TJPA_BASE + '/',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
          },
          body: detailBody,
          signal: controller.signal,
        });
        const detailBytes = Buffer.from(await detailResponse.arrayBuffer());
        if (!detailResponse.ok) {
          rejectionReasons.push('Documento TJPA ' + id + ' retornou HTTP ' + detailResponse.status + '.');
          continue;
        }

        let detailPayload: TjpaEnvelope;
        try {
          detailPayload = JSON.parse(detailBytes.toString('utf8'));
        } catch {
          rejectionReasons.push('Documento TJPA ' + id + ' retornou JSON inválido.');
          continue;
        }
        const matches = detailPayload.data?.content || [];
        if (matches.length !== 1) {
          rejectionReasons.push('Documento individual TJPA não retornou correspondência única.');
          continue;
        }
        const detail = matches[0]!;
        if (
          detail.id !== record.id
          || detail.numeroprocesso !== record.numeroprocesso
          || detail.tipo !== 'Acórdão'
        ) {
          rejectionReasons.push('Documento individual TJPA divergente do resultado de busca.');
          continue;
        }

        const decision = this.normalizeDecision(
          detail,
          detailBytes,
          requestBody,
          querySha256,
          sha256(JSON.stringify(record)),
          timestamp
        );
        if (decision.verificationStatus === 'VERIFIED_OFFICIAL') decisions.push(decision);
        else rejectionReasons.push(...(decision.rejectionReasons || ['Registro TJPA rejeitado.']));
      }

      return {
        decisions,
        totalRecords: Number(payload.data?.totalElements || records.length),
        diagnostic: {
          adapter: 'tjpa-jurisprudencia',
          sourceName: 'Tribunal de Justiça do Estado do Pará - Banco de Jurisprudência',
          courtCode: 'TJPA',
          officialUrl: TJPA_SEARCH,
          timestamp,
          httpStatus: searchResponse.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length > 0 ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length > 0
            ? 'Pesquisa TJPA concluída com confirmação individual exata por id e SHA-256.'
            : 'TJPA respondeu, mas nenhum registro reuniu evidência suficiente para verificação.',
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
          connectorStatus: 'HEALTHY',
        },
      };
    } catch (error: any) {
      const timeoutHit = error?.name === 'AbortError';
      return this.failure(
        timestamp,
        startedAt,
        timeoutHit ? 408 : 503,
        'SOURCE_UNAVAILABLE',
        timeoutHit ? 'Tempo limite ao consultar TJPA.' : String(error?.message || error)
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeDecision(
    record: TjpaRecord,
    detailBytes: Buffer,
    requestBody: string,
    querySha256: string,
    responseRecordSha256: string,
    timestamp: string
  ): CanonicalLegalDecision {
    const id = Number(record.id);
    const cnj = DataJudAdapter.normalizeCnjNumber(String(record.numeroprocesso || ''));
    const contentSha256 = sha256(detailBytes);
    const headnote = textOnly(record.textoementa);
    const fullText = textOnly(record.textooriginal || record.textopuro);
    const detailPublicUrl = TJPA_BASE + '/documento/' + id;

    const decision: CanonicalLegalDecision = {
      id: 'tjpa-' + contentSha256.slice(0, 20),
      sourceId: 'tjpa-jurisprudencia',
      officialUrl: detailPublicUrl,
      fullTextUrl: detailPublicUrl,
      court: 'Tribunal de Justiça do Estado do Pará',
      courtCode: 'TJPA',
      judicialBranch: 'ESTADUAL',
      jurisdiction: 'PA',
      courtOrgan: textOnly(record.orgaojulgadorcolegiado?.nome),
      processClass: textOnly(record.classe?.nome),
      rawCaseNumber: cnj || String(record.numeroprocesso || ''),
      normalizedCnjNumber: cnj || undefined,
      alternativeNumber: String(id),
      rapporteur: textOnly(record.pessoas?.[0]),
      judgmentDate: isoDate(record.datajulgamento || record.datadocumento),
      publicationDate: isoDate(record.datapublicacao),
      officialHeadnote: headnote,
      fullText,
      documentType: 'ACORDAO',
      precedentSituation: 'JULGADO',
      precedentStrength: 'PERSUASIVO_REGIONAL',
      language: 'pt-BR',
      contentSha256,
      collectedAt: timestamp,
      lastVerifiedAt: timestamp,
      verificationStatus: 'FOUND_UNVERIFIED',
      parserVersion: 'tjpa-bff-2026.1',
      documentVersion: 1,
      rawPayloadPreserved: {
        id,
        origem: record.origem,
        verificationEvidence: {
          individualDocument: {
            confirmed: true,
            url: detailPublicUrl,
            httpStatus: 200,
            contentSha256,
            bytes: detailBytes.length,
            fetchedAt: timestamp,
          },
          originatingQuery: {
            id: 'tjpa-query-' + querySha256.slice(0, 24),
            endpoint: TJPA_SEARCH,
            querySha256,
            responseRecordSha256,
            requestBodySha256: sha256(requestBody),
            executedAt: timestamp,
          },
        },
      },
    };

    const verification = PrecedentVerifier.verifyDecision(decision);
    decision.verificationStatus = verification.status;
    decision.lastVerifiedAt = verification.verificationTimestamp;
    decision.verificationBadge = verification.isPassed ? '[OFICIAL TJPA - VERIFICADO]' : undefined;
    decision.rejectionReasons = verification.isPassed ? undefined : verification.issues;
    return decision;
  }

  private failure(
    timestamp: string,
    startedAt: number,
    httpStatus: number,
    lifecycleState: 'SOURCE_UNAVAILABLE' | 'PARSER_ERROR',
    message: string
  ): TjpaSearchResult {
    return {
      decisions: [],
      totalRecords: 0,
      diagnostic: {
        adapter: 'tjpa-jurisprudencia',
        sourceName: 'Tribunal de Justiça do Estado do Pará - Banco de Jurisprudência',
        courtCode: 'TJPA',
        officialUrl: TJPA_SEARCH,
        timestamp,
        httpStatus,
        latencyMs: Date.now() - startedAt,
        lifecycleState,
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
        connectorStatus: httpStatus === 408 ? 'DEGRADED' : 'FAILED',
      },
    };
  }
}
