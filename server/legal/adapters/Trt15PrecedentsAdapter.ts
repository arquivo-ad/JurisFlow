import crypto from 'node:crypto';

const TRT15_PRECEDENTS_BASE = 'https://pje.trt15.jus.br/precedentesWeb/pages/public/TemaLista.seam';

type FetchLike = typeof fetch;
export type Trt15PrecedentType = 'IRDR' | 'IAC';

export interface Trt15PrecedentIndexItem {
  courtCode: 'TRT15';
  type: Trt15PrecedentType;
  themeNumber: number;
  themeCode: string;
  issue: string;
  stayedProcesses: number;
  officialListUrl: string;
  pageSha256: string;
  recordSha256: string;
  collectedAt: string;
  verificationStatus: 'FOUND_UNVERIFIED';
  verificationNote: string;
}

export interface Trt15PrecedentIndexResult {
  items: Trt15PrecedentIndexItem[];
  sourceUrl: string;
  httpStatus: number;
  bytesTransferred: number;
  pageSha256?: string;
  lifecycleState: 'SEARCH_SUCCESS' | 'EMPTY_VALID_DATASET' | 'SOURCE_UNAVAILABLE' | 'PARSER_ERROR';
  connectorStatus: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  stateDescription: string;
  rejectionReasons: string[];
  timestamp: string;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&sect;/g, '§')
    .replace(/&ordm;/g, 'º')
    .replace(/&ordf;/g, 'ª')
    .replace(/&atilde;/g, 'ã')
    .replace(/&otilde;/g, 'õ')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&eacute;/g, 'é')
    .replace(/&aacute;/g, 'á')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&agrave;/g, 'à')
    .replace(/&Atilde;/g, 'Ã')
    .replace(/&Otilde;/g, 'Õ')
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ecirc;/g, 'Ê')
    .replace(/&Ocirc;/g, 'Ô')
    .replace(/&Agrave;/g, 'À');
}

function stripHtml(value: string): string {
  return decodeHtml(value)
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildUrl(type: Trt15PrecedentType): string {
  return TRT15_PRECEDENTS_BASE + '?tipo=' + type;
}

export function isExactTrt15PrecedentsListUrl(value: string, expectedType?: Trt15PrecedentType): boolean {
  try {
    const url = new URL(value);
    const type = url.searchParams.get('tipo');
    return url.protocol === 'https:'
      && url.hostname === 'pje.trt15.jus.br'
      && url.pathname === '/precedentesWeb/pages/public/TemaLista.seam'
      && (type === 'IRDR' || type === 'IAC')
      && (!expectedType || type === expectedType)
      && [...url.searchParams.keys()].every((key) => key === 'tipo');
  } catch {
    return false;
  }
}
function parseRows(html: string, type: Trt15PrecedentType, sourceUrl: string, pageSha256: string, timestamp: string) {
  const tbody = html.match(/<tbody[^>]+id=["']tabelaTemas:tb["'][^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || '';
  if (!tbody) return [];

  const rows = [...tbody.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)];
  const items: Trt15PrecedentIndexItem[] = [];

  for (const rowMatch of rows) {
    const row = rowMatch[0];
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
    if (cells.length < 3) continue;

    const typeText = stripHtml(cells[0]);
    if (!new RegExp('\\b' + type + '\\b', 'i').test(typeText)) continue;

    const themeCell = cells[1];
    const themeCode = stripHtml(themeCell.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1] || '');
    const numberMatch = themeCode.match(/0*(\d{1,6})$/);
    if (!numberMatch) continue;

    const themeNumber = Number(numberMatch[1]);
    const issue = stripHtml(themeCell.replace(/<a\b[\s\S]*?<\/a>/i, ''));
    if (!issue || issue.length < 10) continue;

    const stayedText = stripHtml(cells[2]);
    const stayedProcesses = /^\d+$/.test(stayedText) ? Number(stayedText) : 0;
    const canonical = JSON.stringify({
      courtCode: 'TRT15',
      type,
      themeNumber,
      themeCode,
      issue,
      stayedProcesses,
      sourceUrl,
    });

    items.push({
      courtCode: 'TRT15',
      type,
      themeNumber,
      themeCode,
      issue,
      stayedProcesses,
      officialListUrl: sourceUrl,
      pageSha256,
      recordSha256: sha256(canonical),
      collectedAt: timestamp,
      verificationStatus: 'FOUND_UNVERIFIED',
      verificationNote: 'Registro consta da listagem pública oficial do PJe-JT/TRT15, mas o detalhe individual não possui URL estável verificada pelo JurisFlow.',
    });
  }

  return items;
}
export class Trt15PrecedentsAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 25_000
  ) {}

  public async list(type: Trt15PrecedentType): Promise<Trt15PrecedentIndexResult> {
    const timestamp = new Date().toISOString();
    const sourceUrl = buildUrl(type);

    if (!isExactTrt15PrecedentsListUrl(sourceUrl, type)) {
      return {
        items: [],
        sourceUrl,
        httpStatus: 400,
        bytesTransferred: 0,
        lifecycleState: 'PARSER_ERROR',
        connectorStatus: 'FAILED',
        stateDescription: 'URL da lista TRT15 fora da allowlist exata.',
        rejectionReasons: ['INVALID_SOURCE_URL'],
        timestamp,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(sourceUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      const bytes = Buffer.from(await response.arrayBuffer());
      const html = new TextDecoder('iso-8859-1').decode(bytes);
      if (!response.ok) {
        return {
          items: [],
          sourceUrl,
          httpStatus: response.status,
          bytesTransferred: bytes.length,
          lifecycleState: 'SOURCE_UNAVAILABLE',
          connectorStatus: 'FAILED',
          stateDescription: 'HTTP ' + response.status + ' na listagem pública de precedentes TRT15.',
          rejectionReasons: ['HTTP_' + response.status],
          timestamp,
        };
      }

      const pageSha256 = sha256(html);
      const items = parseRows(html, type, sourceUrl, pageSha256, timestamp);

      return {
        items,
        sourceUrl,
        httpStatus: response.status,
        bytesTransferred: bytes.length,
        pageSha256,
        lifecycleState: items.length > 0 ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
        connectorStatus: items.length > 0 ? 'HEALTHY' : 'DEGRADED',
        stateDescription: items.length > 0
          ? 'Listagem pública oficial do PJe-JT/TRT15 carregada. Itens permanecem sem selo individual até existir detalhe estável verificável.'
          : 'Fonte respondeu sem temas válidos na listagem pública.',
        rejectionReasons: [],
        timestamp,
      };
    } catch (error: any) {
      const timeoutError = error?.name === 'AbortError';
      return {
        items: [],
        sourceUrl,
        httpStatus: timeoutError ? 408 : 503,
        bytesTransferred: 0,
        lifecycleState: 'SOURCE_UNAVAILABLE',
        connectorStatus: 'FAILED',
        stateDescription: timeoutError
          ? 'Tempo limite ao consultar a listagem pública de precedentes TRT15.'
          : String(error?.message || error),
        rejectionReasons: [timeoutError ? 'TIMEOUT' : String(error?.message || error)],
        timestamp,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
