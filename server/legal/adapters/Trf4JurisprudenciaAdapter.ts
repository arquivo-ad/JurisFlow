import crypto from 'crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactTrf4DocumentUrl, isExactTrf4SearchUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TRF4_BASE = 'https://jurisprudencia.trf4.jus.br/eproc2trf4/';
const TRF4_PORTAL = TRF4_BASE + 'externo_controlador.php?acao=jurisprudencia@jurisprudencia/pesquisar';
const TRF4_SEARCH = TRF4_BASE + 'externo_controlador.php?acao=jurisprudencia@jurisprudencia/listar_resultados';

type FetchLike = typeof fetch;

export interface Trf4SearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  totalRecords: number;
}

interface ParsedSearchRecord {
  documentUrl: string;
  segment: string;
  rawCaseNumber: string;
  normalizedCnjNumber: string;
  processClass: string;
  courtOrgan: string;
  rapporteur: string;
  judgmentDate: string;
  publicationDate: string;
  officialHeadnote: string;
  dispositiveSnippet?: string;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

async function readLatin1(response: Response): Promise<string> {
  const bytes = await response.arrayBuffer();
  return new TextDecoder('iso-8859-1').decode(bytes);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripHtml(value: string): string {
  return decodeHtml(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function brDate(value: string): string | undefined {
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? match[3] + '-' + match[2] + '-' + match[1] : undefined;
}

function collectCookies(response: Response): string {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const raw = headers.getSetCookie?.()
    || (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')!] : []);
  return raw.map((item) => item.split(';', 1)[0]?.trim()).filter(Boolean).join('; ');
}

function mergeCookies(...values: string[]): string {
  const map = new Map<string, string>();
  for (const value of values) {
    for (const pair of value.split(';')) {
      const trimmed = pair.trim();
      const index = trimmed.indexOf('=');
      if (index > 0) map.set(trimmed.slice(0, index), trimmed.slice(index + 1));
    }
  }
  return [...map.entries()].map(([key, value]) => key + '=' + value).join('; ');
}

function extractLabel(segment: string, label: string): string {
  const escaped = label.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  const pattern =
    "<div[^>]*class=[\"'][^\"']*resLabel[^\"']*[\"'][^>]*>\\s*"
    + escaped
    + "\\s*</div>\\s*<div[^>]*class=[\"'][^\"']*resValue[^\"']*[\"'][^>]*>([\\s\\S]*?)</div>";
  const match = segment.match(new RegExp(pattern, 'i'));
  return match ? stripHtml(match[1]) : '';
}

function parseSearchRecords(html: string, limit: number): ParsedSearchRecord[] {
  const anchors = [...html.matchAll(/<a\b[\s\S]*?>/gi)]
    .filter((match) => /class=["'][^"']*inteiroTeor[^"']*["']/i.test(match[0]))
    .map((match) => {
      const link = match[0].match(/data-link=["']([^"']+)["']/i)?.[1] || '';
      return { index: match.index ?? 0, link };
    })
    .filter((item) => Boolean(item.link));
  const records: ParsedSearchRecord[] = [];

  for (let i = 0; i < anchors.length && records.length < limit; i++) {
    const current = anchors[i];
    const start = current.index;
    const end = i + 1 < anchors.length ? anchors[i + 1].index : html.length;
    const segment = html.slice(start, end);
    const documentUrlObject = new URL(decodeHtml(current.link), TRF4_BASE);
    documentUrlObject.searchParams.delete('termosPesquisados');
    const documentUrl = documentUrlObject.toString();
    if (!isExactTrf4DocumentUrl(documentUrl)) continue;

    const processMatch = segment.match(/class=["'][^"']*numero-processo[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    const rawCaseNumber = processMatch
      ? stripHtml(processMatch[1]).replace(/\/TRF4\s*$/i, '').trim()
      : '';
    const normalizedCnjNumber = DataJudAdapter.normalizeCnjNumber(rawCaseNumber);
    if (!normalizedCnjNumber) continue;

    let processClass = '';
    if (processMatch?.index !== undefined) {
      const after = segment.slice(processMatch.index + processMatch[0].length, processMatch.index + processMatch[0].length + 1000);
      const classMatch = after.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
      processClass = classMatch ? stripHtml(classMatch[1]) : '';
    }

    const courtOrgan = extractLabel(segment, 'ÓRGÃO JULGADOR');
    const rapporteur = extractLabel(segment, 'RELATOR');
    const judgmentDate = brDate(extractLabel(segment, 'DATA DO JULGAMENTO')) || '';
    const publicationDate = brDate(extractLabel(segment, 'DATA DA PUBLICAÇÃO')) || '';
    const officialHeadnote = extractLabel(segment, 'EMENTA');
    const dispositiveSnippet = extractLabel(segment, 'DECISÃO') || undefined;

    if (!processClass || !courtOrgan || !rapporteur || !judgmentDate || !publicationDate || officialHeadnote.length < 25) {
      continue;
    }

    records.push({
      documentUrl,
      segment,
      rawCaseNumber,
      normalizedCnjNumber,
      processClass,
      courtOrgan,
      rapporteur,
      judgmentDate,
      publicationDate,
      officialHeadnote,
      dispositiveSnippet,
    });
  }

  return records;
}

export class Trf4JurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 35_000
  ) {}

  public async searchOfficialJurisprudence(query: string, limit = 10): Promise<Trf4SearchResult> {
    const startedAt = Date.now();
    const fetchedAt = new Date().toISOString();
    const safeQuery = query.trim().slice(0, 500);
    const safeLimit = Math.max(1, Math.min(limit, 10));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (!safeQuery) throw new Error('Consulta TRF4 vazia.');
      if (!isExactTrf4SearchUrl(TRF4_SEARCH)) {
        throw new Error('Endpoint de pesquisa TRF4 fora da allowlist exata.');
      }

      const portalResponse = await this.fetchImpl(TRF4_PORTAL, {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'JurisFlow/1.4 LegalResearchConnector',
        },
        signal: controller.signal,
      });
      if (!portalResponse.ok) {
        throw new Error('HTTP ' + portalResponse.status + ' ao abrir o portal TRF4.');
      }
      await readLatin1(portalResponse);
      let cookies = collectCookies(portalResponse);

      const body = new URLSearchParams({
        txtPesquisa: safeQuery,
        rdoCampo: 'E',
        hdnExibirPesquisaAvancada: '',
        txtProcesso: '',
        dtDecisaoInicio: '',
        dtDecisaoFim: '',
        hdnDecisaoInicio: '',
        hdnDecisaoFim: '',
        dtPublicacaoInicio: '',
        dtPublicacaoFim: '',
        hdnPublicacaoInicio: '',
        hdnPublicacaoFim: '',
      });
      const requestText = body.toString();

      const searchResponse = await this.fetchImpl(TRF4_SEARCH, {
        method: 'POST',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: TRF4_PORTAL,
          Cookie: cookies,
          'User-Agent': 'JurisFlow/1.4 LegalResearchConnector',
        },
        body: requestText,
        redirect: 'follow',
        signal: controller.signal,
      });
      const searchHtml = await readLatin1(searchResponse);
      cookies = mergeCookies(cookies, collectCookies(searchResponse));

      if (!searchResponse.ok) {
        throw new Error('HTTP ' + searchResponse.status + ' na pesquisa oficial TRF4.');
      }

      const parsedRecords = parseSearchRecords(searchHtml, safeLimit);
      const querySha256 = sha256(requestText);
      const queryId = 'trf4-query-' + querySha256.slice(0, 24);
      const decisions: CanonicalLegalDecision[] = [];
      const rejectionReasons: string[] = [];

      for (const record of parsedRecords) {
        try {
          const documentResponse = await this.fetchImpl(record.documentUrl, {
            method: 'GET',
            headers: {
              Accept: 'text/html,application/xhtml+xml',
              Referer: searchResponse.url || TRF4_SEARCH,
              Cookie: cookies,
              'User-Agent': 'JurisFlow/1.4 LegalResearchConnector',
            },
            redirect: 'follow',
            signal: controller.signal,
          });
          const documentHtml = await readLatin1(documentResponse);
          const contentType = documentResponse.headers.get('content-type') || '';

          if (
            !documentResponse.ok
            || !contentType.toLowerCase().includes('text/html')
            || documentHtml.length < 1000
          ) {
            rejectionReasons.push(
              'Inteiro teor inválido para ' + record.rawCaseNumber + ': HTTP ' + documentResponse.status + '.'
            );
            continue;
          }

          const decision = this.normalizeDecision(record, documentHtml, {
            documentHttpStatus: documentResponse.status,
            fetchedAt: new Date().toISOString(),
            queryId,
            querySha256,
            responseRecordSha256: sha256(record.segment),
          });

          if (decision.verificationStatus === 'VERIFIED_OFFICIAL') {
            decisions.push(decision);
          } else {
            rejectionReasons.push(...(decision.rejectionReasons || ['Registro TRF4 rejeitado.']));
          }
        } catch (error: any) {
          rejectionReasons.push(error?.message || String(error));
        }
      }

      return {
        decisions,
        totalRecords: parsedRecords.length,
        diagnostic: {
          adapter: 'trf4-jurisprudencia',
          sourceName: 'Tribunal Regional Federal da 4ª Região - Jurisprudência eproc',
          courtCode: 'TRF4',
          officialUrl: searchResponse.url || TRF4_SEARCH,
          timestamp: fetchedAt,
          httpStatus: searchResponse.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length > 0 ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length > 0
            ? 'Pesquisa pública eproc concluída com inteiro teor individual verificado.'
            : 'A fonte respondeu, mas nenhum resultado reuniu evidência suficiente para verificação.',
          bytesTransferred: Buffer.byteLength(searchHtml, 'utf8'),
          contentSha256: sha256(searchHtml),
          documentsReceived: parsedRecords.length,
          documentsNormalized: decisions.length,
          documentsRejected: parsedRecords.length - decisions.length,
          recordsRead: parsedRecords.length,
          recordsAccepted: decisions.length,
          recordsRejected: parsedRecords.length - decisions.length,
          parsingErrors: [],
          rejectionReasons,
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
          adapter: 'trf4-jurisprudencia',
          sourceName: 'Tribunal Regional Federal da 4ª Região - Jurisprudência eproc',
          courtCode: 'TRF4',
          officialUrl: TRF4_SEARCH,
          timestamp: fetchedAt,
          httpStatus: isTimeout ? 408 : 503,
          latencyMs: Date.now() - startedAt,
          lifecycleState: 'SOURCE_UNAVAILABLE',
          stateDescription: isTimeout
            ? 'Tempo limite ao consultar jurisprudência TRF4.'
            : String(error?.message || error),
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

  public normalizeDecision(
    record: ParsedSearchRecord,
    documentHtml: string,
    evidence: {
      documentHttpStatus: number;
      fetchedAt: string;
      queryId: string;
      querySha256: string;
      responseRecordSha256: string;
    }
  ): CanonicalLegalDecision {
    const contentSha256 = sha256(documentHtml);
    const processClass = record.processClass.split(/\s+-\s+/)[0]?.trim() || record.processClass;

    const decision: CanonicalLegalDecision = {
      id: 'trf4-' + contentSha256.slice(0, 20),
      sourceId: 'trf4-jurisprudencia',
      officialUrl: record.documentUrl,
      fullTextUrl: record.documentUrl,
      court: 'Tribunal Regional Federal da 4ª Região',
      courtCode: 'TRF4',
      judicialBranch: 'FEDERAL',
      jurisdiction: 'TRF4',
      courtOrgan: record.courtOrgan,
      processClass,
      rawCaseNumber: record.rawCaseNumber,
      normalizedCnjNumber: record.normalizedCnjNumber,
      rapporteur: record.rapporteur,
      judgmentDate: record.judgmentDate,
      publicationDate: record.publicationDate,
      availabilityDate: record.publicationDate,
      officialHeadnote: record.officialHeadnote,
      dispositiveSnippet: record.dispositiveSnippet,
      documentType: 'ACORDAO',
      precedentSituation: 'JULGADO',
      precedentStrength: 'PERSUASIVO_REGIONAL',
      language: 'pt-BR',
      contentSha256,
      collectedAt: evidence.fetchedAt,
      lastVerifiedAt: evidence.fetchedAt,
      verificationStatus: 'FOUND_UNVERIFIED',
      parserVersion: 'trf4-eproc-html-2026.1',
      documentVersion: 1,
      rawPayloadPreserved: {
        verificationEvidence: {
          individualDocument: {
            confirmed: evidence.documentHttpStatus === 200,
            url: record.documentUrl,
            httpStatus: evidence.documentHttpStatus,
            contentSha256,
            bytes: Buffer.byteLength(documentHtml, 'utf8'),
            fetchedAt: evidence.fetchedAt,
          },
          originatingQuery: {
            id: evidence.queryId,
            endpoint: TRF4_SEARCH,
            querySha256: evidence.querySha256,
            responseRecordSha256: evidence.responseRecordSha256,
            executedAt: evidence.fetchedAt,
          },
        },
        parsed: {
          rawCaseNumber: record.rawCaseNumber,
          processClass: record.processClass,
          courtOrgan: record.courtOrgan,
          rapporteur: record.rapporteur,
          judgmentDate: record.judgmentDate,
          publicationDate: record.publicationDate,
        },
      },
    };

    const verification = PrecedentVerifier.verifyDecision(decision);
    decision.verificationStatus = verification.status;
    decision.lastVerifiedAt = verification.verificationTimestamp;
    decision.verificationBadge = verification.isPassed ? '[OFICIAL TRF4 - VERIFICADO]' : undefined;
    decision.rejectionReasons = verification.isPassed ? undefined : verification.issues;
    return decision;
  }
}
