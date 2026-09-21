import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactTjbaDocumentUrl, isExactTjbaGraphqlUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TJBA_GRAPHQL = 'https://jurisprudenciaws.tjba.jus.br/graphql';
const TJBA_DOC_BASE = 'https://jurisprudenciaws.tjba.jus.br/inteiroTeor/';
type FetchLike = typeof fetch;

interface TjbaDecisionRecord {
  dataPublicacao?: string;
  relator?: { id?: string; nome?: string };
  orgaoJulgador?: { id?: string; nome?: string };
  classe?: { id?: string; descricao?: string };
  conteudo?: string;
  tipoDecisao?: string;
  ementa?: string;
  hash?: string;
  numeroProcesso?: string;
}
interface TjbaPayload {
  data?: {
    filter?: {
      decisoes?: TjbaDecisionRecord[];
      pageCount?: number;
      itemCount?: number;
    };
  };
  errors?: Array<{ message?: string }>;
}

export interface TjbaSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  totalRecords: number;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function textOnly(value?: string): string {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/<br\s*\/?\s*>/gi, ' ')
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
const FILTER_QUERY = `
query filter($decisaoFilter: DecisaoFilter!,$pageNumber: Int!,$itemsPerPage: Int!) {
  filter(decisaoFilter:$decisaoFilter,pageNumber:$pageNumber,itemsPerPage:$itemsPerPage) {
    decisoes {
      dataPublicacao
      relator { id nome }
      orgaoJulgador { id nome }
      classe { id descricao }
      conteudo
      tipoDecisao
      ementa
      hash
      numeroProcesso
    }
    pageCount
    itemCount
  }
}`;

function buildVariables(query: string, limit: number) {
  return {
    decisaoFilter: {
      assunto: query,
      numeroRecurso: '',
      orgaos: [],
      relatores: [],
      classes: [],
      dataInicial: null,
      dataFinal: null,
      segundoGrau: true,
      turmasRecursais: true,
      tipoAcordaos: true,
      tipoDecisoesMonocraticas: false,
      ordenadoPor: 'dataPublicacao',
    },
    pageNumber: 0,
    itemsPerPage: limit,
  };
}

export class TjbaJurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 35_000
  ) {}

  public async searchOfficialJurisprudence(query: string, limit = 5): Promise<TjbaSearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const safeQuery = String(query || '').trim().slice(0, 500);
    const safeLimit = Math.max(1, Math.min(limit, 10));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (!safeQuery) throw new Error('Consulta TJBA vazia.');
      if (!isExactTjbaGraphqlUrl(TJBA_GRAPHQL)) {
        throw new Error('Endpoint GraphQL TJBA fora da allowlist exata.');
      }

      const requestBody = JSON.stringify({
        query: FILTER_QUERY,
        variables: buildVariables(safeQuery, safeLimit),
      });
      const querySha256 = sha256(requestBody);

      const searchResponse = await this.fetchImpl(TJBA_GRAPHQL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
        },
        body: requestBody,
        redirect: 'follow',
        signal: controller.signal,
      });

      const searchBytes = Buffer.from(await searchResponse.arrayBuffer());
      if (!searchResponse.ok) {
        return this.failure(timestamp, startedAt, searchResponse.status, 'SOURCE_UNAVAILABLE',
          'HTTP ' + searchResponse.status + ' no GraphQL TJBA.');
      }

      let payload: TjbaPayload;
      try {
        payload = JSON.parse(searchBytes.toString('utf8'));
      } catch {
        return this.failure(timestamp, startedAt, 502, 'PARSER_ERROR',
          'GraphQL TJBA retornou JSON inválido.');
      }

      if (payload.errors?.length) {
        return this.failure(timestamp, startedAt, 502, 'SOURCE_UNAVAILABLE',
          payload.errors.map((item) => item.message || 'Erro GraphQL').join('; '));
      }

      const records = (payload.data?.filter?.decisoes || []).slice(0, safeLimit);
      const decisions: CanonicalLegalDecision[] = [];
      const rejectionReasons: string[] = [];

      for (const record of records) {
        const hash = String(record.hash || '').trim().toLowerCase();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(hash)) {
          rejectionReasons.push('Registro TJBA sem hash UUID válido.');
          continue;
        }

        const documentUrl = TJBA_DOC_BASE + hash;
        if (!isExactTjbaDocumentUrl(documentUrl, hash)) {
          rejectionReasons.push('URL individual TJBA rejeitada pela allowlist.');
          continue;
        }

        const documentResponse = await this.fetchImpl(documentUrl, {
          method: 'GET',
          headers: {
            Accept: 'text/html,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
          },
          redirect: 'follow',
          signal: controller.signal,
        });
        const documentBytes = Buffer.from(await documentResponse.arrayBuffer());
        const contentType = documentResponse.headers.get('content-type') || '';

        if (
          !documentResponse.ok
          || !/text\/html/i.test(contentType)
          || documentBytes.length < 1000
        ) {
          rejectionReasons.push(
            'Inteiro teor TJBA inválido para ' + (record.numeroProcesso || hash)
            + ': HTTP ' + documentResponse.status + '.'
          );
          continue;
        }

        const decision = this.normalizeDecision(
          record,
          documentUrl,
          documentBytes,
          requestBody,
          querySha256,
          timestamp
        );
        if (decision.verificationStatus === 'VERIFIED_OFFICIAL') {
          decisions.push(decision);
        } else {
          rejectionReasons.push(...(decision.rejectionReasons || ['Registro TJBA rejeitado.']));
        }
      }

      return {
        decisions,
        totalRecords: Number(payload.data?.filter?.itemCount || records.length),
        diagnostic: {
          adapter: 'tjba-jurisprudencia',
          sourceName: 'Tribunal de Justiça do Estado da Bahia - Jurisprudência GraphQL',
          courtCode: 'TJBA',
          officialUrl: TJBA_GRAPHQL,
          timestamp,
          httpStatus: searchResponse.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length > 0 ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length > 0
            ? 'Pesquisa TJBA concluída com inteiro teor individual confirmado por hash.'
            : 'TJBA respondeu, mas nenhum registro reuniu evidência suficiente para verificação.',
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
      const isTimeout = error?.name === 'AbortError';
      return this.failure(
        timestamp,
        startedAt,
        isTimeout ? 408 : 503,
        'SOURCE_UNAVAILABLE',
        isTimeout ? 'Tempo limite ao consultar jurisprudência TJBA.' : String(error?.message || error)
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeDecision(
    record: TjbaDecisionRecord,
    documentUrl: string,
    documentBytes: Buffer,
    requestBody: string,
    querySha256: string,
    timestamp: string
  ): CanonicalLegalDecision {
    const rawCaseNumber = String(record.numeroProcesso || '').trim();
    const normalizedCnjNumber = DataJudAdapter.normalizeCnjNumber(rawCaseNumber);
    const hash = String(record.hash || '').trim().toLowerCase();
    const officialHeadnote = textOnly(record.ementa);
    const fullText = textOnly(documentBytes.toString('utf8'));
    const contentSha256 = sha256(documentBytes);
    const responseRecordSha256 = sha256(JSON.stringify(record));

    const decision: CanonicalLegalDecision = {
      id: 'tjba-' + contentSha256.slice(0, 20),
      sourceId: 'tjba-jurisprudencia',
      officialUrl: documentUrl,
      fullTextUrl: documentUrl,
      court: 'Tribunal de Justiça do Estado da Bahia',
      courtCode: 'TJBA',
      judicialBranch: 'ESTADUAL',
      jurisdiction: 'BA',
      courtOrgan: String(record.orgaoJulgador?.nome || '').trim(),
      processClass: String(record.classe?.descricao || '').trim(),
      rawCaseNumber,
      normalizedCnjNumber: normalizedCnjNumber || undefined,
      alternativeNumber: hash,
      rapporteur: String(record.relator?.nome || '').trim(),
      publicationDate: isoDate(record.dataPublicacao),
      officialHeadnote,
      fullText,
      documentType: 'ACORDAO',
      precedentSituation: 'JULGADO',
      precedentStrength: 'PERSUASIVO_REGIONAL',
      language: 'pt-BR',
      contentSha256,
      collectedAt: timestamp,
      lastVerifiedAt: timestamp,
      verificationStatus: 'FOUND_UNVERIFIED',
      parserVersion: 'tjba-graphql-2026.1',
      documentVersion: 1,
      rawPayloadPreserved: {
        hash,
        tipoDecisao: record.tipoDecisao,
        verificationEvidence: {
          individualDocument: {
            confirmed: true,
            url: documentUrl,
            httpStatus: 200,
            contentSha256,
            bytes: documentBytes.length,
            fetchedAt: timestamp,
          },
          originatingQuery: {
            id: 'tjba-query-' + querySha256.slice(0, 24),
            endpoint: TJBA_GRAPHQL,
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
    decision.verificationBadge = verification.isPassed ? '[OFICIAL TJBA - VERIFICADO]' : undefined;
    decision.rejectionReasons = verification.isPassed ? undefined : verification.issues;
    return decision;
  }

  private failure(
    timestamp: string,
    startedAt: number,
    httpStatus: number,
    lifecycleState: 'SOURCE_UNAVAILABLE' | 'PARSER_ERROR',
    message: string
  ): TjbaSearchResult {
    return {
      decisions: [],
      totalRecords: 0,
      diagnostic: {
        adapter: 'tjba-jurisprudencia',
        sourceName: 'Tribunal de Justiça do Estado da Bahia - Jurisprudência GraphQL',
        courtCode: 'TJBA',
        officialUrl: TJBA_GRAPHQL,
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
