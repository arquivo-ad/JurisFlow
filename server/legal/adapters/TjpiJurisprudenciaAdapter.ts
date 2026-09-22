import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactTjpiDetailUrl, isExactTjpiSearchUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision } from '../types.ts';

const TJPI_BASE = 'https://jurisprudencia.tjpi.jus.br';
type FetchLike = typeof fetch;

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ordf;/gi, 'ª').replace(/&ordm;/gi, 'º')
    .replace(/&Aacute;/gi, 'Á').replace(/&aacute;/gi, 'á')
    .replace(/&Eacute;/gi, 'É').replace(/&eacute;/gi, 'é')
    .replace(/&Iacute;/gi, 'Í').replace(/&iacute;/gi, 'í')
    .replace(/&Oacute;/gi, 'Ó').replace(/&oacute;/gi, 'ó')
    .replace(/&Uacute;/gi, 'Ú').replace(/&uacute;/gi, 'ú')
    .replace(/&Ccedil;/gi, 'Ç').replace(/&ccedil;/gi, 'ç')
    .replace(/&Atilde;/gi, 'Ã').replace(/&atilde;/gi, 'ã');
}
function textOnly(value: string): string {
  return decodeHtml(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function field(html: string, label: string): string {
  const pairs = html.matchAll(
    /<strong[^>]*>([\s\S]*?)<\/strong>\s*<p[^>]*class=["'][^"']*text-muted[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi
  );
  for (const pair of pairs) {
    const key = textOnly(pair[1] || '');
    const isExactLabel = key === label || (key.endsWith(label) && key.length <= label.length + 30);
    if (isExactLabel) return textOnly(pair[2] || '');
  }
  return '';
}

function section(html: string, heading: string, nextHeading?: string): string {
  const start = new RegExp('<h4[^>]*>\\s*' + heading + '\\s*<\\/h4>', 'i').exec(html);
  if (!start || start.index === undefined) return '';
  const rest = html.slice(start.index + start[0].length);
  if (!nextHeading) return textOnly(rest);
  const end = new RegExp('<h4[^>]*>\\s*' + nextHeading + '\\s*<\\/h4>', 'i').exec(rest);
  return textOnly(end ? rest.slice(0, end.index) : rest);
}

function brDate(value: string): string | undefined {
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? [m[3], m[2], m[1]].join('-') : undefined;
}
export class TjpiJurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 35_000
  ) {}

  async searchOfficialJurisprudence(query: string, limit = 5) {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const safeQuery = String(query || '').trim().slice(0, 500);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      if (!safeQuery) throw new Error('Consulta TJPI vazia.');
      const searchUrl = new URL(TJPI_BASE + '/jurisprudences/search');
      searchUrl.searchParams.set('q', safeQuery);
      searchUrl.searchParams.set('tipo', 'Acórdão');
      if (!isExactTjpiSearchUrl(searchUrl.toString())) {
        throw new Error('Endpoint TJPI fora da allowlist exata.');
      }

      const searchResponse = await this.fetchImpl(searchUrl, {
        headers: {
          Accept: 'text/html',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
        },
        signal: controller.signal,
      });
      const searchBytes = Buffer.from(await searchResponse.arrayBuffer());      if (!searchResponse.ok) throw new Error('HTTP ' + searchResponse.status + ' na busca TJPI.');
      const searchHtml = searchBytes.toString('utf8');
      if (/captcha|recaptcha|hcaptcha|turnstile/i.test(searchHtml)) {
        throw new Error('TJPI apresentou desafio interativo inesperado.');
      }

      const links = [...searchHtml.matchAll(
        /href=["'](\/jurisprudences\/(\d+)\/public)["'][^>]*>([\s\S]*?)<\/a>/gi
      )];
      const unique = new Map<string, { id: string; label: string }>();
      for (const match of links) {
        if (!unique.has(match[2])) {
          unique.set(match[2], { id: match[2], label: textOnly(match[3]) });
        }
      }

      const decisions: CanonicalLegalDecision[] = [];
      const rejected: string[] = [];
      const selected = [...unique.values()].slice(0, Math.max(1, Math.min(limit, 10)));
      for (const item of selected) {
        const detailUrl = TJPI_BASE + '/jurisprudences/' + item.id + '/public';
        if (!isExactTjpiDetailUrl(detailUrl, item.id)) {
          rejected.push('URL individual TJPI fora da allowlist.');
          continue;
        }

        const response = await this.fetchImpl(detailUrl, {
          headers: {
            Accept: 'text/html',
            Referer: searchUrl.toString(),
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',          },
          signal: controller.signal,
        });
        const bytes = Buffer.from(await response.arrayBuffer());
        const detailHtml = bytes.toString('utf8');
        if (!response.ok || bytes.length < 1000) {
          rejected.push('Documento individual TJPI inválido: ' + item.id);
          continue;
        }

        const expectedCase = /\d{7}-\d{2}\.\d{4}\.8\.18\.\d{4}/.exec(item.label)?.[0] || '';
        const processNumber = field(detailHtml, 'Processo') || expectedCase;
        const cnj = DataJudAdapter.normalizeCnjNumber(processNumber);
        const detailText = textOnly(detailHtml);
        if (!expectedCase || !detailText.includes(expectedCase)) {
          rejected.push('Documento individual TJPI divergente da busca: ' + item.id);
          continue;
        }
        const organ = field(detailHtml, 'Órgão Julgador Colegiado') || field(detailHtml, 'Órgão Julgador');
        const rapporteur = field(detailHtml, 'Relator(a)');
        const processClass = field(detailHtml, 'Classe Judicial');
        const publicationDate = brDate(field(detailHtml, 'Publicação'));
        const headnote = section(detailHtml, 'Ementa', 'Acórdão');
        const fullText = section(detailHtml, 'Acórdão');
        if (!cnj || !organ || !rapporteur || !publicationDate || headnote.length < 25) {
          rejected.push('Metadados TJPI insuficientes no registro ' + item.id);
          continue;
        }

        const contentSha256 = sha256(bytes);
        const querySha256 = sha256(searchUrl.toString());
        const responseRecordSha256 = sha256(item.id + '|' + item.label);
        const decision: CanonicalLegalDecision = {
          id: 'tjpi-' + contentSha256.slice(0, 20),
          sourceId: 'tjpi-jurisprudencia',
          officialUrl: detailUrl,
          fullTextUrl: detailUrl,          court: 'Tribunal de Justiça do Estado do Piauí',
          courtCode: 'TJPI',
          judicialBranch: 'ESTADUAL',
          jurisdiction: 'PI',
          courtOrgan: organ,
          processClass,
          rawCaseNumber: processNumber,
          normalizedCnjNumber: cnj,
          alternativeNumber: item.id,
          rapporteur,
          publicationDate,
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
          parserVersion: 'tjpi-juspi-html-2026.1',
          documentVersion: 1,
          rawPayloadPreserved: {
            jurisprudenceId: item.id,
            verificationEvidence: {
              individualDocument: {
                confirmed: true,
                url: detailUrl,
                httpStatus: response.status,
                contentSha256,                bytes: bytes.length,
                fetchedAt: timestamp,
              },
              originatingQuery: {
                id: 'tjpi-query-' + querySha256.slice(0, 24),
                endpoint: searchUrl.toString(),
                querySha256,
                responseRecordSha256,
                executedAt: timestamp,
              },
            },
          },
        };

        const verification = PrecedentVerifier.verifyDecision(decision);
        decision.verificationStatus = verification.status;
        decision.lastVerifiedAt = verification.verificationTimestamp;
        decision.verificationBadge = verification.isPassed ? '[OFICIAL TJPI - VERIFICADO]' : undefined;
        decision.rejectionReasons = verification.isPassed ? undefined : verification.issues;
        if (verification.isPassed) decisions.push(decision);
        else rejected.push(...verification.issues);
      }

      const countMatch = /total de\s*([\d.]+)\s*jurisprud/i.exec(textOnly(searchHtml));
      const totalRecords = Number((countMatch?.[1] || String(unique.size)).replace(/\./g, ''));
      return {
        decisions,
        totalRecords,
        diagnostic: {
          adapter: 'tjpi-jurisprudencia',
          sourceName: 'TJPI - JusPI',          courtCode: 'TJPI',
          officialUrl: searchUrl.toString(),
          timestamp,
          httpStatus: searchResponse.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length
            ? 'Pesquisa JusPI concluída com página individual oficial e SHA-256.'
            : 'JusPI respondeu sem registros verificáveis.',
          bytesTransferred: searchBytes.length,
          contentSha256: sha256(searchBytes),
          documentsReceived: selected.length,
          documentsNormalized: decisions.length,
          documentsRejected: selected.length - decisions.length,
          recordsRead: selected.length,
          recordsAccepted: decisions.length,
          recordsRejected: selected.length - decisions.length,
          parsingErrors: [],
          rejectionReasons: rejected,
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
          adapter: 'tjpi-jurisprudencia',
          sourceName: 'TJPI - JusPI',          courtCode: 'TJPI',
          officialUrl: TJPI_BASE,
          timestamp,
          httpStatus: isTimeout ? 408 : 503,
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
          connectorStatus: isTimeout ? 'DEGRADED' : 'FAILED',
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}