import crypto from 'node:crypto';
import { CanonicalLegalDecision, OfficialSourceDiagnostic, PrecedentSituation } from '../types.ts';
import { isExactStfThemeDetailUrl, isExactStfThemeIndexUrl } from '../officialSources.ts';
import { PrecedentVerifier } from '../verifier.ts';

type FetchResult = {
  ok: boolean;
  status: number;
  url: string;
  body?: string;
  bytes: number;
  hash?: string;
  fetchedAt: string;
  error?: string;
};

export class StfJurisprudenciaAdapter {
  constructor(private readonly fetchImpl: typeof fetch = fetch, private readonly timeoutMs = 20_000) {}

  public static sha256(value: string | Buffer): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private static decodeHtml(value: string): string {
    const named: Record<string, string> = {
      nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>',
      aacute: 'á', Aacute: 'Á', agrave: 'à', atilde: 'ã', Atilde: 'Ã', acirc: 'â',
      eacute: 'é', Eacute: 'É', ecirc: 'ê', iacute: 'í', oacute: 'ó', Oacute: 'Ó',
      ocirc: 'ô', otilde: 'õ', Otilde: 'Õ', uacute: 'ú', ccedil: 'ç', Ccedil: 'Ç',
    };
    return value
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<(?:br|\/p|\/div|\/tr|\/li|\/h\d)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&([a-z]+);/gi, (entity, name) => named[name] ?? entity)
      .replace(/[\t ]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n')
      .trim();
  }

  private static between(text: string, start: RegExp, end: RegExp): string | undefined {
    const startMatch = start.exec(text);
    if (!startMatch) return undefined;
    const remainder = text.slice(startMatch.index + startMatch[0].length);
    const endMatch = end.exec(remainder);
    return (endMatch ? remainder.slice(0, endMatch.index) : remainder).replace(/\s+/g, ' ').trim() || undefined;
  }

  public static parseThemePages(indexHtml: string, detailHtml: string, expectedTheme: number): {
    leadingCase?: string;
    rapporteur?: string;
    courtOrgan?: string;
    recognitionDate?: string;
    status?: string;
    title?: string;
    description?: string;
    thesis?: string;
    detailUrl?: string;
  } {
    const indexText = this.decodeHtml(indexHtml);
    const detailText = this.decodeHtml(detailHtml);
    const themeMatch = indexText.match(/Tema:\s*0*(\d+)/i);
    if (Number(themeMatch?.[1]) !== expectedTheme) return {};

    const hrefMatches = [...indexHtml.matchAll(/href=["']([^"']*verAndamentoProcesso\.asp\?[^"']+)["']/gi)];
    const href = hrefMatches.map((item) => item[1].replace(/&amp;/g, '&')).find((item) => {
      try {
        const url = new URL(item, 'https://portal.stf.jus.br/jurisprudenciaRepercussao/');
        return Number(url.searchParams.get('numeroTema')) === expectedTheme;
      } catch {
        return false;
      }
    });
    const detailUrl = href ? new URL(href, 'https://portal.stf.jus.br/jurisprudenciaRepercussao/').toString() : undefined;
    const leadingCase = this.between(indexText, /Leading Case:\s*/i, /\s+Manifesta[cç][aã]o|\s+Ministro:/i)
      ?.match(/\b(?:RE|ARE|AI)\s*[\d.]+/i)?.[0];
    const rapporteur = this.between(indexText, /Ministro:\s*/i, /\s+Plen[aá]rio Virtual|\s+Situa[cç][aã]o atual/i);
    const courtOrgan = /Plen[aá]rio Virtual/i.test(indexText) ? 'Plenário Virtual' : 'Plenário';
    const recognitionBr = indexText.match(/Data da Repercuss[aã]o geral:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1];
    const recognitionDate = recognitionBr?.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$2-$1');
    const status = this.between(indexText, /Situa[cç][aã]o:\s*/i, /\s+(?:Pra[cç]a dos Tr[eê]s Poderes|Assuntos|Andamentos)/i);
    const title = this.between(indexText, /T[íi]tulo:\s*/i, /\s+Descri[cç][aã]o:/i);
    const description = this.between(indexText, /Descri[cç][aã]o:\s*/i, /\s+Ver assuntos:|\s+Informa[cç][oõ]es gerais/i);
    const thesis = this.between(detailText, /Tese:\s*/i, /Data\s+Andamento|Andamentos/i);
    return { leadingCase, rapporteur, courtOrgan, recognitionDate, status, title, description, thesis, detailUrl };
  }

  private async fetchOfficialHtml(url: string, validator: (value: string) => boolean): Promise<FetchResult> {
    const fetchedAt = new Date().toISOString();
    if (!validator(url)) return { ok: false, status: 400, url, bytes: 0, fetchedAt, error: 'URL STF fora da allowlist exata.' };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'JurisFlow-LegalSync/2026.2 (Auditoria Forense)' },
        signal: controller.signal,
      });
      const body = await response.text();
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.toLowerCase().includes('text/html') || body.length < 300) {
        return { ok: false, status: response.status, url, bytes: Buffer.byteLength(body), fetchedAt, error: `Registro STF inválido: HTTP ${response.status}, Content-Type ${contentType || 'ausente'}.` };
      }
      return { ok: true, status: response.status, url, body, bytes: Buffer.byteLength(body), hash: StfJurisprudenciaAdapter.sha256(body), fetchedAt };
    } catch (error: any) {
      const tlsError = error?.cause?.code || error?.code;
      return {
        ok: false,
        status: error?.name === 'AbortError' ? 408 : 503,
        url,
        bytes: 0,
        fetchedAt,
        error: tlsError ? `Falha TLS segura no portal STF (${tlsError}); verificação de certificado não foi desativada.` : String(error?.message || error),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  public async searchTheme(themeNumber: number): Promise<{ diagnostic: OfficialSourceDiagnostic; decision?: CanonicalLegalDecision }> {
    const started = Date.now();
    const indexUrl = `https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=${themeNumber}`;
    const index = await this.fetchOfficialHtml(indexUrl, isExactStfThemeIndexUrl);
    const fail = (result: FetchResult, message: string): { diagnostic: OfficialSourceDiagnostic } => ({
      diagnostic: {
        adapter: 'stf-jurisprudencia', sourceName: 'Supremo Tribunal Federal - Repercussão Geral', courtCode: 'STF',
        officialUrl: result.url, timestamp: result.fetchedAt, httpStatus: result.status,
        latencyMs: Date.now() - started,
        lifecycleState: result.status === 408 || result.status >= 500 ? 'SOURCE_UNAVAILABLE' : 'PARSER_ERROR',
        stateDescription: result.error || message, bytesTransferred: result.bytes,
        documentsReceived: result.ok ? 1 : 0, documentsNormalized: 0, documentsRejected: result.ok ? 1 : 0,
        recordsRead: result.ok ? 1 : 0, recordsAccepted: 0, recordsRejected: result.ok ? 1 : 0,
        parsingErrors: [result.error || message], rejectionReasons: [message], normalizedQueryNumber: `Tema ${themeNumber}/STF`,
        connectorStatus: result.status === 408 || result.status >= 500 ? 'SOURCE_UNAVAILABLE' : 'DEGRADED',
      },
    });
    if (!index.ok || !index.body) return fail(index, 'Página individual do tema não pôde ser confirmada.');

    const prelim = StfJurisprudenciaAdapter.parseThemePages(index.body, '', themeNumber);
    if (!prelim.detailUrl || !isExactStfThemeDetailUrl(prelim.detailUrl, themeNumber)) {
      return fail({ ...index, status: 422 }, 'Tema localizado sem link individual de andamento compatível.');
    }
    const detail = await this.fetchOfficialHtml(prelim.detailUrl, (value) => isExactStfThemeDetailUrl(value, themeNumber));
    if (!detail.ok || !detail.body || !detail.hash) return fail(detail, 'Registro individual do leading case não pôde ser confirmado.');
    const parsed = StfJurisprudenciaAdapter.parseThemePages(index.body, detail.body, themeNumber);
    if (!parsed.leadingCase || !parsed.rapporteur || !parsed.courtOrgan || !parsed.recognitionDate || !parsed.title || !parsed.thesis) {
      return fail({ ...detail, status: 422 }, 'Registro STF sem os metadados mínimos cumulativos para verificação.');
    }
    const normalizedStatus = (parsed.status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const precedentSituation: PrecedentSituation = normalizedStatus.includes('cancelad') ? 'CANCELADO'
      : normalizedStatus.includes('superad') ? 'SUPERADO'
        : normalizedStatus.includes('transit') ? 'TRANSITADO' : 'JULGADO';
    const querySha256 = StfJurisprudenciaAdapter.sha256(JSON.stringify({ themeNumber }));
    const decision: CanonicalLegalDecision = {
      id: `stf-${detail.hash.slice(0, 20)}`, sourceId: 'stf-jurisprudencia', officialUrl: detail.url, fullTextUrl: detail.url,
      court: 'Supremo Tribunal Federal', courtCode: 'STF', judicialBranch: 'CONSTITUCIONAL', jurisdiction: 'BRASIL',
      courtOrgan: parsed.courtOrgan, processClass: parsed.leadingCase.split(/\s+/)[0], rawCaseNumber: parsed.leadingCase,
      rapporteur: parsed.rapporteur, judgmentDate: parsed.recognitionDate, officialHeadnote: parsed.title,
      rulingThesis: `Tema ${themeNumber}/STF: ${parsed.thesis}`, documentType: 'TEMA_REPERCUSSAO_GERAL',
      precedentSituation, precedentStrength: 'VINCULANTE', themeNumber, language: 'pt-BR', contentSha256: detail.hash,
      collectedAt: detail.fetchedAt, lastVerifiedAt: detail.fetchedAt, verificationStatus: 'FOUND_UNVERIFIED',
      parserVersion: 'stf-theme-2026.1', documentVersion: 1,
      rawPayloadPreserved: {
        description: parsed.description, status: parsed.status, indexSha256: index.hash,
        verificationEvidence: {
          individualDocument: { confirmed: true, url: detail.url, httpStatus: detail.status, contentSha256: detail.hash, bytes: detail.bytes, fetchedAt: detail.fetchedAt, contentType: 'text/html' },
          originatingQuery: { id: `stf-query-${querySha256.slice(0, 24)}`, endpoint: index.url, querySha256, responseRecordSha256: index.hash, executedAt: index.fetchedAt },
        },
      },
    };
    const verification = PrecedentVerifier.verifyDecision(decision);
    decision.verificationStatus = verification.status;
    decision.verificationBadge = verification.isPassed ? '[OFICIAL STF - VERIFICADO]' : undefined;
    decision.rejectionReasons = verification.issues;
    return {
      diagnostic: {
        adapter: 'stf-jurisprudencia', sourceName: 'Supremo Tribunal Federal - Repercussão Geral', courtCode: 'STF',
        officialUrl: detail.url, timestamp: detail.fetchedAt, httpStatus: 200, latencyMs: Date.now() - started,
        lifecycleState: verification.isPassed ? 'SEARCH_SUCCESS' : 'PARSER_ERROR',
        stateDescription: verification.isPassed ? 'Tema e leading case confirmados em registros individuais oficiais do STF.' : 'Registro retido pelo verificador.',
        bytesTransferred: index.bytes + detail.bytes, contentSha256: detail.hash,
        documentsReceived: 2, documentsNormalized: verification.isPassed ? 1 : 0, documentsRejected: verification.isPassed ? 0 : 1,
        recordsRead: 2, recordsAccepted: verification.isPassed ? 1 : 0, recordsRejected: verification.isPassed ? 0 : 1,
        parsingErrors: [], rejectionReasons: verification.issues, normalizedQueryNumber: `Tema ${themeNumber}/STF`,
        connectorStatus: verification.isPassed ? 'HEALTHY' : 'DEGRADED',
      },
      decision: verification.isPassed ? decision : undefined,
    };
  }
}
