import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { secureTjpeFetch } from '../tjpeSecureFetch.ts';
import { isExactTjpeCandidatePdfUrl, isExactTjpeSearchUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TJPE_BASE = 'https://consultajurisprudencia.app.tjpe.jus.br';
const TJPE_SEARCH = TJPE_BASE + '/api/v1/jurisprudencias';
type FetchLike = typeof fetch;

interface TjpeRecord {
  chave?: string;
  codigoProcesso?: string;
  npu?: string;
  npuSemFormatacao?: string;
  relator?: string;
  nomeOrgaoJulgador?: string;
  descrClasseCNJ?: string;
  dataJulgamento?: string;
  dataPublicacao?: string;
  textoEmenta?: string | null;
  textoAcordao?: string | null;
  textoDecisao?: string | null;
  tipoSentenca?: string;
  origem?: string;
  assuntoCNJ?: string;
  descrAssuntoCNJ?: string;
}
export interface TjpeSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  totalRecords: number;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function decodeHtml(value?: string | null): string {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&ordf;/gi, 'ª')
    .replace(/&ordm;/gi, 'º')
    .replace(/<mark>/gi, '')
    .replace(/<\/mark>/gi, '');
}
function textOnly(value?: string | null): string {
  return decodeHtml(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function isoDate(value?: string): string | undefined {
  const text = String(value || '').trim();
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function extractHeadnote(fullText: string): string {
  if (!fullText) return '';
  const normalized = fullText.replace(/\r/g, '');
  const match = /(?:^|\n)\s*EMENTA\s*:?\s*/i.exec(normalized);
  if (!match || match.index === undefined) return '';
  const start = match.index + match[0].length;
  const rest = normalized.slice(start);
  const end = /(?:^|\n)\s*AC[ÓO]RD[ÃA]O\s*(?:$|\n|:)/im.exec(rest);
  return (end ? rest.slice(0, end.index) : rest).replace(/\s+/g, ' ').trim();
}
function buildSearchUrl(query: string, limit: number): string {
  const url = new URL(TJPE_SEARCH);
  url.searchParams.set('page', '0');
  url.searchParams.set('size', String(limit));
  url.searchParams.append('sort', 'dataJulgamento,desc');
  url.searchParams.set('pesquisaLivre.contains', query);
  url.searchParams.set('origem.in', 'ELETRONICO,FISICO');
  url.searchParams.set('tipoSentenca.in', 'A');
  return url.toString();
}

export class TjpeJurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = secureTjpeFetch,
    private readonly timeoutMs = 35_000
  ) {}

  public async searchOfficialJurisprudence(query: string, limit = 10): Promise<TjpeSearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const safeQuery = String(query || '').trim().slice(0, 500);
    const safeLimit = Math.max(1, Math.min(limit, 10));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      if (!safeQuery) throw new Error('Consulta TJPE vazia.');
      const searchUrl = buildSearchUrl(safeQuery, safeLimit);
      if (!isExactTjpeSearchUrl(searchUrl)) {
        throw new Error('Endpoint TJPE fora da allowlist exata.');
      }

      const response = await this.fetchImpl(searchUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Referer: TJPE_BASE + '/',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      const bytes = Buffer.from(await response.arrayBuffer());
      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ' na busca oficial TJPE.');
      }

      let records: TjpeRecord[];
      try {
        const parsed = JSON.parse(bytes.toString('utf8'));
        records = Array.isArray(parsed) ? parsed : [];
      } catch {
        throw new Error('Resposta TJPE não é JSON válido.');
      }
      const querySha256 = sha256(searchUrl);
      const decisions = records
        .slice(0, safeLimit)
        .map((record) => this.normalizeDecision(record, searchUrl, querySha256, timestamp))
        .filter((item): item is CanonicalLegalDecision => Boolean(item));

      const totalHeader = Number(response.headers.get('x-total-count') || records.length);
      return {
        decisions,
        totalRecords: Number.isFinite(totalHeader) ? totalHeader : records.length,
        diagnostic: {
          adapter: 'tjpe-jurisprudencia',
          sourceName: 'Tribunal de Justiça de Pernambuco - Consulta Jurisprudência',
          courtCode: 'TJPE',
          officialUrl: searchUrl,
          timestamp,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length > 0 ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length > 0
            ? 'Pesquisa TJPE concluída. Resultados oficiais permanecem FOUND_UNVERIFIED porque o endpoint de inteiro teor pode devolver PDF de processo divergente.'
            : 'TJPE respondeu sem acórdãos válidos para normalização.',
          bytesTransferred: bytes.length,
          contentSha256: sha256(bytes),
          documentsReceived: records.length,
          documentsNormalized: decisions.length,
          documentsRejected: records.length - decisions.length,
          recordsRead: records.length,
          recordsAccepted: decisions.length,
          recordsRejected: records.length - decisions.length,
          parsingErrors: [],
          rejectionReasons: decisions.length > 0
            ? ['TJPE_INTEIRO_TEOR_DIVERGENTE: PDF individual não é confiável para promoção automática.']
            : [],
          normalizedQueryNumber: safeQuery,
          connectorStatus: 'DEGRADED',
        },
      };
    } catch (error: any) {
      const isTimeout = error?.name === 'AbortError';
      return {
        decisions: [],
        totalRecords: 0,
        diagnostic: {
          adapter: 'tjpe-jurisprudencia',
          sourceName: 'Tribunal de Justiça de Pernambuco - Consulta Jurisprudência',
          courtCode: 'TJPE',
          officialUrl: TJPE_SEARCH,
          timestamp,
          httpStatus: isTimeout ? 408 : 503,
          latencyMs: Date.now() - startedAt,
          lifecycleState: 'SOURCE_UNAVAILABLE',
          stateDescription: isTimeout ? 'Tempo limite ao consultar TJPE.' : String(error?.message || error),
          bytesTransferred: 0,
          documentsReceived: 0,
          documentsNormalized: 0,
          documentsRejected: 0,
          recordsRead: 0,
          recordsAccepted: 0,
          recordsRejected: 0,
          parsingErrors: [error?.message || String(error)],
          rejectionReasons: [error?.message || String(error)],
          normalizedQueryNumber: safeQuery,
          connectorStatus: isTimeout ? 'DEGRADED' : 'FAILED',
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeDecision(
    record: TjpeRecord,
    searchUrl: string,
    querySha256: string,
    timestamp: string
  ): CanonicalLegalDecision | null {
    if (record.tipoSentenca !== 'A') return null;
    const normalizedCnjNumber = DataJudAdapter.normalizeCnjNumber(String(record.npu || ''));
    if (!normalizedCnjNumber) return null;

    const fullText = textOnly(record.textoAcordao);
    if (fullText.length < 100) return null;

    const headnote = textOnly(record.textoEmenta) || extractHeadnote(fullText);
    const recordSha256 = sha256(JSON.stringify(record));
    const processId = String(record.codigoProcesso || '').trim();
    const candidatePdfUrl = processId
      ? TJPE_BASE + '/api/v1/processo/' + encodeURIComponent(processId) + '/inteiro-teor'
      : '';

    const decision: CanonicalLegalDecision = {
      id: 'tjpe-' + recordSha256.slice(0, 20),
      sourceId: 'tjpe-jurisprudencia',
      officialUrl: searchUrl,
      court: 'Tribunal de Justiça do Estado de Pernambuco',
      courtCode: 'TJPE',
      judicialBranch: 'ESTADUAL',
      jurisdiction: 'PE',
      courtOrgan: textOnly(record.nomeOrgaoJulgador),
      processClass: textOnly(record.descrClasseCNJ),
      rawCaseNumber: normalizedCnjNumber,
      normalizedCnjNumber,
      alternativeNumber: String(record.chave || ''),
      rapporteur: textOnly(record.relator),
      judgmentDate: isoDate(record.dataJulgamento),
      publicationDate: isoDate(record.dataPublicacao),
      officialHeadnote: headnote,
      fullText,
      documentType: 'ACORDAO',
      precedentSituation: 'JULGADO',
      precedentStrength: 'PERSUASIVO_REGIONAL',
      language: 'pt-BR',
      contentSha256: recordSha256,
      collectedAt: timestamp,
      lastVerifiedAt: timestamp,
      verificationStatus: 'FOUND_UNVERIFIED',
      parserVersion: 'tjpe-rest-2026.1',
      documentVersion: 1,
      rejectionReasons: [
        'TJPE_INTEIRO_TEOR_DIVERGENTE: o endpoint candidato de PDF retornou documentos de processos distintos em validação real.',
      ],
      rawPayloadPreserved: {
        chave: record.chave,
        codigoProcesso: processId,
        origem: record.origem,
        assuntoCNJ: record.assuntoCNJ,
        descrAssuntoCNJ: record.descrAssuntoCNJ,
        candidateIndividualDocument: candidatePdfUrl && isExactTjpeCandidatePdfUrl(candidatePdfUrl, processId)
          ? {
              url: candidatePdfUrl,
              verified: false,
              reason: 'Identidade do PDF não pode ser presumida; endpoint apresentou divergência em smoke real.',
            }
          : undefined,
        verificationEvidence: {
          individualDocument: {
            confirmed: false,
            url: candidatePdfUrl || searchUrl,
            httpStatus: 0,
            contentSha256: '',
            bytes: 0,
            fetchedAt: timestamp,
          },
          originatingQuery: {
            id: 'tjpe-query-' + querySha256.slice(0, 24),
            endpoint: searchUrl,
            querySha256,
            responseRecordSha256: recordSha256,
            executedAt: timestamp,
          },
        },
      },
    };

    return decision;
  }
}
