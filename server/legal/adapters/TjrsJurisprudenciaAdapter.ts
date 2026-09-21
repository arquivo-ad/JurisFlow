import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TJRS_SEARCH_PAGE = 'https://www.tjrs.jus.br/buscas/jurisprudencia/';
const TJRS_AJAX = 'https://www.tjrs.jus.br/buscas/jurisprudencia/ajax.php';

type FetchLike = typeof fetch;

interface TjrsSolrDoc {
  tipo_documento?: string;
  ementa_completa?: string[];
  tipo_processo?: string;
  documento_text?: string;
  data_publicacao?: string;
  data_julgamento?: string;
  nome_tribunal?: string;
  numero_processo?: string;
  cod_ementa?: string;
  orgao_julgador?: string;
  ind_segredo_justica?: string;
  nome_classe_cnj?: string;
  nome_assunto_cnj?: string;
  nome_relator?: string;
  relator_redator?: string[];
  origem?: string;
}

interface TjrsSolrPayload {
  response?: { numFound?: number; docs?: TjrsSolrDoc[] };
  error?: unknown;
}

export interface TjrsSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  totalRecords: number;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function isoDate(value?: string): string | undefined {
  const text = String(value || '').trim();
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function decodeBase64Document(value?: string): string {
  if (!value) return '';
  try {
    const raw = Buffer.from(value, 'base64');
    const utf8 = raw.toString('utf8');
    if (/charset=["']?ISO-8859-1/i.test(utf8) || utf8.includes('ISO-8859-1')) {
      return new TextDecoder('iso-8859-1').decode(raw);
    }
    return utf8;
  } catch {
    return '';
  }
}

function textOnly(value: string): string {
  return value
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

function buildFormQuery(query: string): string {
  const params = new URLSearchParams();
  const values: Record<string, string> = {
    aba: 'jurisprudencia',
    realizando_pesquisa: '1',
    pagina_atual: '1',
    q_palavra_chave: query,
    conteudo_busca: 'ementa_completa',
    filtroComAExpressao: '',
    filtroComQualquerPalavra: '',
    filtroSemAsPalavras: '',
    filtroTribunal: '-1',
    filtroRelator: '-1',
    filtroOrgaoJulgador: '-1',
    filtroTipoProcesso: '-1',
    assuntoCnj: '',
    data_julgamento_de: '',
    data_julgamento_ate: '',
    filtroNumeroProcesso: '',
    data_publicacao_de: '',
    data_publicacao_ate: '',
    facet: 'on',
    'facet.sort': 'index',
    'facet.limit': 'index',
    wt: 'json',
    ordem: 'desc',
    start: '0',
  };
  for (const [key, value] of Object.entries(values)) params.set(key, value);
  return params.toString();
}
export function isExactTjrsAjaxUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'www.tjrs.jus.br'
      && url.pathname === '/buscas/jurisprudencia/ajax.php'
      && !url.search;
  } catch {
    return false;
  }
}

export class TjrsJurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 35_000
  ) {}

  public async searchOfficialJurisprudence(query: string, limit = 10): Promise<TjrsSearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const safeQuery = String(query || '').trim().slice(0, 500);
    const safeLimit = Math.max(1, Math.min(limit, 10));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (!safeQuery) throw new Error('Consulta TJRS vazia.');
      if (!isExactTjrsAjaxUrl(TJRS_AJAX)) throw new Error('Endpoint TJRS fora da allowlist exata.');

      const serializedForm = buildFormQuery(safeQuery);
      const body = new URLSearchParams({
        action: 'consultas_solr_ajax',
        metodo: 'buscar_resultados',
        parametros: serializedForm,
      }).toString();

      const response = await this.fetchImpl(TJRS_AJAX, {
        method: 'POST',
        headers: {
          Accept: 'application/json,text/javascript,*/*;q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          Referer: TJRS_SEARCH_PAGE,
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
        },
        body,
        redirect: 'follow',
        signal: controller.signal,
      });

      const bytes = Buffer.from(await response.arrayBuffer());
      const rawText = new TextDecoder('iso-8859-1').decode(bytes);
      if (!response.ok) throw new Error('HTTP ' + response.status + ' na busca oficial TJRS.');

      let payload: TjrsSolrPayload;
      try {
        payload = JSON.parse(rawText);
      } catch {
        throw new Error('Resposta TJRS não é JSON válido.');
      }

      const docs = (payload.response?.docs || []).slice(0, safeLimit);
      const querySha256 = sha256(body);
      const decisions = docs.map((doc) => this.normalizeDecision(doc, querySha256, timestamp))
        .filter((item): item is CanonicalLegalDecision => Boolean(item));

      return {
        decisions,
        totalRecords: Number(payload.response?.numFound || docs.length),
        diagnostic: {
          adapter: 'tjrs-jurisprudencia',
          sourceName: 'Tribunal de Justiça do Rio Grande do Sul - Pesquisa de Jurisprudência',
          courtCode: 'TJRS',
          officialUrl: TJRS_AJAX,
          timestamp,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length > 0 ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length > 0
            ? 'Pesquisa oficial TJRS concluída. Registros possuem ementa/inteiro teor e hash, mas permanecem sem selo individual por ausência de URL oficial individual estável.'
            : 'TJRS respondeu sem registros válidos para normalização.',
          bytesTransferred: bytes.length,
          contentSha256: sha256(bytes),
          documentsReceived: docs.length,
          documentsNormalized: decisions.length,
          documentsRejected: docs.length - decisions.length,
          recordsRead: docs.length,
          recordsAccepted: decisions.length,
          recordsRejected: docs.length - decisions.length,
          parsingErrors: [],
          rejectionReasons: [],
          normalizedQueryNumber: safeQuery,
          connectorStatus: 'HEALTHY',
        },
      };
    } catch (error: any) {
      const isTimeout = error?.name === 'AbortError';
      return {
        decisions: [],
        totalRecords: 0,
        diagnostic: {
          adapter: 'tjrs-jurisprudencia',
          sourceName: 'Tribunal de Justiça do Rio Grande do Sul - Pesquisa de Jurisprudência',
          courtCode: 'TJRS',
          officialUrl: TJRS_AJAX,
          timestamp,
          httpStatus: isTimeout ? 408 : 503,
          latencyMs: Date.now() - startedAt,
          lifecycleState: 'SOURCE_UNAVAILABLE',
          stateDescription: isTimeout ? 'Tempo limite ao consultar TJRS.' : String(error?.message || error),
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
  private normalizeDecision(doc: TjrsSolrDoc, querySha256: string, timestamp: string): CanonicalLegalDecision | null {
    if (String(doc.ind_segredo_justica || '').toUpperCase() === 'S') return null;

    const rawDigits = String(doc.numero_processo || '').replace(/\D/g, '');
    const rawCaseNumber = rawDigits.length === 20
      ? rawDigits.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6')
      : String(doc.numero_processo || '').trim();
    const normalizedCnjNumber = DataJudAdapter.normalizeCnjNumber(rawCaseNumber);
    if (!normalizedCnjNumber) return null;

    const ementa = textOnly(String(doc.ementa_completa?.[0] || ''));
    const fullTextHtml = decodeBase64Document(doc.documento_text);
    const fullText = textOnly(fullTextHtml);
    const codEmenta = String(doc.cod_ementa || '').trim();
    if (!codEmenta || ementa.length < 25 || fullText.length < 50) return null;

    const evidencePayload = JSON.stringify({
      codEmenta,
      numeroProcesso: doc.numero_processo,
      ementa: doc.ementa_completa?.[0] || '',
      documentoText: doc.documento_text || '',
      dataJulgamento: doc.data_julgamento,
      dataPublicacao: doc.data_publicacao,
    });
    const contentSha256 = sha256(evidencePayload);

    return {
      id: 'tjrs-' + contentSha256.slice(0, 20),
      sourceId: 'tjrs-jurisprudencia',
      officialUrl: TJRS_SEARCH_PAGE,
      court: 'Tribunal de Justiça do Estado do Rio Grande do Sul',
      courtCode: 'TJRS',
      judicialBranch: 'ESTADUAL',
      jurisdiction: 'RS',
      courtOrgan: String(doc.orgao_julgador || '').trim(),
      processClass: String(doc.nome_classe_cnj || doc.tipo_processo || '').trim(),
      rawCaseNumber,
      normalizedCnjNumber,
      alternativeNumber: codEmenta,
      rapporteur: String(doc.nome_relator || doc.relator_redator?.[0] || '').trim(),
      judgmentDate: isoDate(doc.data_julgamento),
      publicationDate: isoDate(doc.data_publicacao),
      officialHeadnote: ementa,
      fullText,
      tpuSubjects: doc.nome_assunto_cnj ? [doc.nome_assunto_cnj] : undefined,
      documentType: 'ACORDAO',
      precedentSituation: 'JULGADO',
      precedentStrength: 'PERSUASIVO_REGIONAL',
      language: 'pt-BR',
      contentSha256,
      collectedAt: timestamp,
      lastVerifiedAt: timestamp,
      verificationStatus: 'FOUND_UNVERIFIED',
      parserVersion: 'tjrs-solr-json-2026.1',
      documentVersion: 1,
      rawPayloadPreserved: {
        codEmenta,
        querySha256,
        sourceRecordSha256: contentSha256,
        verificationLimitation: 'Inteiro teor veio na resposta oficial de busca; não foi localizado endpoint individual oficial estável para cod_ementa.',
      },
    };
  }
}
