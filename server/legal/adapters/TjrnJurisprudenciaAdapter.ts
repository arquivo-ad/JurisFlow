import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { isExactTjrnSearchUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TJRN_BASE = 'https://jurisprudencia.tjrn.jus.br';
const TJRN_SEARCH = TJRN_BASE + '/api/pesquisar';
type FetchLike = typeof fetch;

interface TjrnHitSource {
  numero_processo?: string;
  classe_judicial?: string;
  orgao_julgador?: string;
  colegiado?: string;
  sigiloso?: boolean;
  sistema?: string;
  inteiro_teor?: string;
  id_documento_teor?: string;
  ementa?: string;
  id_documento_ementa?: string;
  tipo_teor?: string;
  grau?: number;
  dt_assinatura_teor?: string;
  dt_publicacao?: string;
  magistrado?: string;
}

interface TjrnEnvelope {
  hits?: {
    total?: number;
    hits?: Array<{ _id?: string; _source?: TjrnHitSource }>;
  };
}

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function textOnly(value?: string): string {
  return String(value || '')
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

export class TjrnJurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 35_000
  ) {}

  async searchOfficialJurisprudence(query: string, limit = 10) {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const safeQuery = String(query || '').trim().slice(0, 500);
    const safeLimit = Math.max(1, Math.min(limit, 10));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (!safeQuery) throw new Error('Consulta TJRN vazia.');
      if (!isExactTjrnSearchUrl(TJRN_SEARCH)) throw new Error('Endpoint TJRN fora da allowlist.');

      const today = new Date().toISOString().slice(0, 10).split('-').reverse().join('-');
      const body = {
        jurisprudencia: {
          ementa: safeQuery,
          inteiro_teor: '',
          nr_processo: '',
          id_classe_judicial: '',
          id_orgao_julgador: '',
          id_relator: '',
          id_colegiado: '',
          id_juiz: '',
          id_vara: '',
          dt_inicio: '',
          dt_fim: today,
          origem: '',
          sistema: 'PJE',
          decisoes: 'Acórdão',
          jurisdicoes: '',
          grau: '2',
        },
        page: 1,
        usuario: null,
      };
      const requestBody = JSON.stringify(body);
      const response = await this.fetchImpl(TJRN_SEARCH, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Referer: TJRN_BASE + '/',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
        },
        body: requestBody,
        signal: controller.signal,
      });

      const bytes = Buffer.from(await response.arrayBuffer());
      if (!response.ok) throw new Error('HTTP ' + response.status + ' na busca TJRN.');

      const payload = JSON.parse(bytes.toString('utf8')) as TjrnEnvelope;
      const hits = (payload.hits?.hits || []).slice(0, safeLimit);
      const decisions: CanonicalLegalDecision[] = [];
      const rejected: string[] = [];

      for (const hit of hits) {
        const src = hit._source || {};
        if (src.sigiloso || src.tipo_teor !== 'Acórdão' || Number(src.grau) !== 2) continue;
        const cnj = DataJudAdapter.normalizeCnjNumber(String(src.numero_processo || ''));
        const headnote = textOnly(src.ementa);
        const fullText = textOnly(src.inteiro_teor);
        if (!cnj || headnote.length < 25 || fullText.length < 100) {
          rejected.push('Registro TJRN sem identidade ou conteúdo suficiente.');
          continue;
        }

        const recordHash = sha256(JSON.stringify(src));
        const documentId = String(src.id_documento_teor || '');
        decisions.push({
          id: 'tjrn-' + recordHash.slice(0, 20),
          sourceId: 'tjrn-jurisprudencia',
          officialUrl: TJRN_SEARCH,
          court: 'Tribunal de Justiça do Estado do Rio Grande do Norte',
          courtCode: 'TJRN',
          judicialBranch: 'ESTADUAL',
          jurisdiction: 'RN',
          courtOrgan: textOnly(src.colegiado || src.orgao_julgador),
          processClass: textOnly(src.classe_judicial),
          rawCaseNumber: cnj,
          normalizedCnjNumber: cnj,
          alternativeNumber: documentId || hit._id,
          rapporteur: textOnly(src.magistrado),
          judgmentDate: isoDate(src.dt_assinatura_teor),
          publicationDate: isoDate(src.dt_publicacao),
          officialHeadnote: headnote,
          fullText,
          documentType: 'ACORDAO',
          precedentSituation: 'JULGADO',
          precedentStrength: 'PERSUASIVO_REGIONAL',
          language: 'pt-BR',
          contentSha256: recordHash,
          collectedAt: timestamp,
          lastVerifiedAt: timestamp,
          verificationStatus: 'FOUND_UNVERIFIED',
          parserVersion: 'tjrn-api-2026.1',
          documentVersion: 1,
          rejectionReasons: [
            'TJRN_DOCUMENTO_INDIVIDUAL_SSO: o inteiro teor individual do PJe exige autenticação SSO; resultado permanece não verificado.',
          ],
          rawPayloadPreserved: {
            elasticId: hit._id,
            idDocumentoTeor: documentId,
            idDocumentoEmenta: src.id_documento_ementa,
            sistema: src.sistema,
            verificationEvidence: {
              originatingQuery: {
                id: 'tjrn-query-' + sha256(requestBody).slice(0, 24),
                endpoint: TJRN_SEARCH,
                querySha256: sha256(requestBody),
                responseRecordSha256: recordHash,
                executedAt: timestamp,
              },
              individualDocument: {
                confirmed: false,
                url: documentId
                  ? 'https://pje2g.tjrn.jus.br/pje/seam/resource/rest/pje-legacy/documento/download/' + documentId
                  : TJRN_SEARCH,
                httpStatus: 0,
                contentSha256: '',
                bytes: 0,
                fetchedAt: timestamp,
              },
            },
          },
        });
      }
      return {
        decisions,
        totalRecords: Number(payload.hits?.total || hits.length),
        diagnostic: {
          adapter: 'tjrn-jurisprudencia',
          sourceName: 'Tribunal de Justiça do Rio Grande do Norte - Banco de Jurisprudência',
          courtCode: 'TJRN',
          officialUrl: TJRN_SEARCH,
          timestamp,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length
            ? 'API TJRN retornou acórdãos e inteiro teor reais; documento individual PJe exige SSO, mantendo FOUND_UNVERIFIED.'
            : 'TJRN respondeu sem acórdãos válidos para normalização.',
          bytesTransferred: bytes.length,
          contentSha256: sha256(bytes),
          documentsReceived: hits.length,
          documentsNormalized: decisions.length,
          documentsRejected: hits.length - decisions.length,
          recordsRead: hits.length,
          recordsAccepted: decisions.length,
          recordsRejected: hits.length - decisions.length,
          parsingErrors: [],
          rejectionReasons: rejected,
          normalizedQueryNumber: safeQuery,
          connectorStatus: 'DEGRADED',
        } as OfficialSourceDiagnostic,
      };
    } catch (error: any) {
      return {
        decisions: [],
        totalRecords: 0,
        diagnostic: {
          adapter: 'tjrn-jurisprudencia',
          sourceName: 'Tribunal de Justiça do Rio Grande do Norte - Banco de Jurisprudência',
          courtCode: 'TJRN',
          officialUrl: TJRN_SEARCH,
          timestamp,
          httpStatus: error?.name === 'AbortError' ? 408 : 503,
          latencyMs: Date.now() - startedAt,
          lifecycleState: 'SOURCE_UNAVAILABLE',
          stateDescription: String(error?.message || error),
          bytesTransferred: 0,
          documentsReceived: 0,
          documentsNormalized: 0,
          documentsRejected: 0,
          recordsRead: 0,
          recordsAccepted: 0,
          recordsRejected: 0,
          parsingErrors: [String(error?.message || error)],
          rejectionReasons: [String(error?.message || error)],
          normalizedQueryNumber: safeQuery,
          connectorStatus: 'FAILED',
        } as OfficialSourceDiagnostic,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
