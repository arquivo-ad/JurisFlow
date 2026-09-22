import crypto from 'crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactTrf3DocumentUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TRF3_BASE = 'https://web.trf3.jus.br';
const TRF3_PORTAL = `${TRF3_BASE}/jurisprudencia/`;
const TRF3_SEARCH = `${TRF3_BASE}/jurisprudencia/Home/ResultadoTotais`;

type FetchLike = typeof fetch;

export interface Trf3SearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  totalRecords: number;
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

function extractDiv(html: string, id: string): string {
  const match = html.match(new RegExp(`<div[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/div>`, 'i'));
  return match ? stripHtml(match[1]) : '';
}
function brDate(value: string): string | undefined {
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : undefined;
}

function extractHeadnote(html: string): string {
  const section = html.match(/<section[^>]*id=["']divEmenta["'][^>]*>([\s\S]*?)<\/section>/i)?.[1] || '';
  const hidden = section.match(/<p[^>]*class=["'][^"']*titulo-oculto[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
  const text = stripHtml(hidden);
  const marker = text.search(/\bEmenta\b/i);
  return marker >= 0 ? text.slice(marker + 'Ementa'.length).trim() : text;
}

function collectCookies(response: Response): string {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const raw = headers.getSetCookie?.() || (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')!] : []);
  return raw
    .map((item) => item.split(';', 1)[0]?.trim())
    .filter(Boolean)
    .join('; ');
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
  return [...map.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
}
export class Trf3JurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 30_000
  ) {}

  public async searchOfficialJurisprudence(query: string, limit = 10): Promise<Trf3SearchResult> {
    const startedAt = Date.now();
    const fetchedAt = new Date().toISOString();
    const safeQuery = query.trim().slice(0, 500);
    const safeLimit = Math.max(1, Math.min(limit, 10));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (!safeQuery) throw new Error('Consulta TRF3 vazia.');

      const portalResponse = await this.fetchImpl(TRF3_PORTAL, {
        method: 'GET',
        headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'JurisFlow/1.4 LegalResearchConnector' },
        signal: controller.signal,
      });
      if (!portalResponse.ok) throw new Error(`HTTP ${portalResponse.status} ao abrir o portal TRF3.`);
      await portalResponse.text();
      let cookies = collectCookies(portalResponse);
      const body = new URLSearchParams({
        chkAcordaos: 'on',
        txtPesquisaLivre: safeQuery,
        chkMostrarLista: 'on',
        opcaoQtdePagina: String(safeLimit),
        magistrado: '0',
        classe: '0',
        orgao: '0',
        hdnOrgao: '',
      });
      const requestText = body.toString();
      const searchResponse = await this.fetchImpl(TRF3_SEARCH, {
        method: 'POST',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: TRF3_PORTAL,
          Cookie: cookies,
          'User-Agent': 'JurisFlow/1.4 LegalResearchConnector',
        },
        body: requestText,
        redirect: 'follow',
        signal: controller.signal,
      });
      const searchHtml = await searchResponse.text();
      cookies = mergeCookies(cookies, collectCookies(searchResponse));
      if (!searchResponse.ok) throw new Error(`HTTP ${searchResponse.status} na pesquisa oficial TRF3.`);
      const linkRegex = /href=["'](\/jurisprudencia\/Home\/ListaColecao\/9\?np=\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      const discovered: Array<{ path: string; snippet: string }> = [];
      const seen = new Set<string>();
      for (const match of searchHtml.matchAll(linkRegex)) {
        if (seen.has(match[1])) continue;
        seen.add(match[1]);
        discovered.push({ path: match[1], snippet: stripHtml(match[2]) });
        if (discovered.length >= safeLimit) break;
      }

      const querySha256 = sha256(requestText);
      const queryId = `trf3-query-${querySha256.slice(0, 24)}`;
      const decisions: CanonicalLegalDecision[] = [];
      const rejectionReasons: string[] = [];

      for (const record of discovered) {
        const documentUrl = `${TRF3_BASE}${record.path}`;
        if (!isExactTrf3DocumentUrl(documentUrl)) {
          rejectionReasons.push(`URL individual rejeitada: ${record.path}`);
          continue;
        }
        try {
          const docResponse = await this.fetchImpl(documentUrl, {
            method: 'GET',
            headers: {
              Accept: 'text/html,application/xhtml+xml',
              Referer: searchResponse.url || TRF3_SEARCH,
              Cookie: cookies,
              'User-Agent': 'JurisFlow/1.4 LegalResearchConnector',
            },
            signal: controller.signal,
          });
          const html = await docResponse.text();
          if (!docResponse.ok || !html.trim()) {
            rejectionReasons.push(`Documento individual HTTP ${docResponse.status}: ${record.path}`);
            continue;
          }

          const decision = this.normalizeDecision(html, {
            documentUrl,
            documentStatus: docResponse.status,
            fetchedAt: new Date().toISOString(),
            queryId,
            querySha256,
            queryEndpoint: TRF3_SEARCH,
            responseRecordSha256: sha256(record.path + '\n' + record.snippet),
          });
          if (decision?.verificationStatus === 'VERIFIED_OFFICIAL') decisions.push(decision);
          else rejectionReasons.push(...(decision?.rejectionReasons || ['Documento TRF3 rejeitado pelo verificador.']));
        } catch (error: any) {
          rejectionReasons.push(error?.message || String(error));
        }
      }
      const totalMatch = discovered[0]?.snippet.match(/^\s*\d+\/(\d+)\)/);
      const totalRecords = totalMatch ? Number(totalMatch[1]) : discovered.length;
      return {
        decisions,
        totalRecords,
        diagnostic: {
          adapter: 'trf3-jurisprudencia',
          sourceName: 'Tribunal Regional Federal da 3ª Região - Pesquisa de Jurisprudência',
          courtCode: 'TRF3',
          officialUrl: searchResponse.url || TRF3_SEARCH,
          timestamp: fetchedAt,
          httpStatus: searchResponse.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length > 0 ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length > 0
            ? 'Pesquisa oficial concluída com documentos individuais verificados.'
            : 'A fonte respondeu, mas nenhum acórdão reuniu evidência suficiente para verificação.',
          bytesTransferred: Buffer.byteLength(searchHtml, 'utf8'),
          contentSha256: sha256(searchHtml),
          documentsReceived: discovered.length,
          documentsNormalized: decisions.length,
          documentsRejected: discovered.length - decisions.length,
          recordsRead: discovered.length,
          recordsAccepted: decisions.length,
          recordsRejected: discovered.length - decisions.length,
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
          adapter: 'trf3-jurisprudencia',
          sourceName: 'Tribunal Regional Federal da 3ª Região - Pesquisa de Jurisprudência',
          courtCode: 'TRF3',
          officialUrl: TRF3_SEARCH,
          timestamp: fetchedAt,
          httpStatus: isTimeout ? 408 : 503,
          latencyMs: Date.now() - startedAt,
          lifecycleState: 'SOURCE_UNAVAILABLE',
          stateDescription: isTimeout ? 'Tempo limite excedido na fonte oficial do TRF3.' : String(error?.message || error),
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
    html: string,
    evidence: {
      documentUrl: string;
      documentStatus: number;
      fetchedAt: string;
      queryId: string;
      querySha256: string;
      queryEndpoint: string;
      responseRecordSha256: string;
    }
  ): CanonicalLegalDecision | null {
    const rawCaseNumber = extractDiv(html, 'processo');
    const processClassRaw = extractDiv(html, 'classe');
    const courtOrgan = extractDiv(html, 'orgao');
    const rapporteur = extractDiv(html, 'relator').replace(/^Relator\(a\):\s*/i, '').trim();
    const judgmentDate = brDate(extractDiv(html, 'decisao'));
    const publicationDate = brDate(extractDiv(html, 'publicacao'));
    const officialHeadnote = extractHeadnote(html);
    const normalizedCnjNumber = DataJudAdapter.normalizeCnjNumber(rawCaseNumber) || undefined;

    if (!rawCaseNumber || !processClassRaw || !courtOrgan || !rapporteur || !judgmentDate || !publicationDate || officialHeadnote.length < 25 || !normalizedCnjNumber) {
      return null;
    }

    const contentSha256 = sha256(html);
    const processClass = processClassRaw.split(/\s+-\s+/)[0]?.trim() || processClassRaw;
    const decision: CanonicalLegalDecision = {
      id: `trf3-${contentSha256.slice(0, 20)}`,
      sourceId: 'trf3-jurisprudencia',
      officialUrl: evidence.documentUrl,
      fullTextUrl: evidence.documentUrl,
      court: 'Tribunal Regional Federal da 3ª Região',
      courtCode: 'TRF3',
      judicialBranch: 'FEDERAL',
      jurisdiction: 'TRF3',
      courtOrgan,
      processClass,
      rawCaseNumber,
      normalizedCnjNumber,
      rapporteur,
      judgmentDate,
      publicationDate,
      availabilityDate: publicationDate,
      officialHeadnote,
      documentType: 'ACORDAO',
      precedentSituation: 'JULGADO',
      precedentStrength: 'PERSUASIVO_REGIONAL',
      language: 'pt-BR',
      contentSha256,
      collectedAt: evidence.fetchedAt,
      lastVerifiedAt: evidence.fetchedAt,
      verificationStatus: 'FOUND_UNVERIFIED',
      parserVersion: 'trf3-html-2026.1',
      documentVersion: 1,
      rawPayloadPreserved: {
        verificationEvidence: {
          individualDocument: {
            confirmed: evidence.documentStatus === 200,
            url: evidence.documentUrl,
            httpStatus: evidence.documentStatus,
            contentSha256,
            bytes: Buffer.byteLength(html, 'utf8'),
            fetchedAt: evidence.fetchedAt,
          },
          originatingQuery: {
            id: evidence.queryId,
            endpoint: evidence.queryEndpoint,
            querySha256: evidence.querySha256,
            responseRecordSha256: evidence.responseRecordSha256,
            executedAt: evidence.fetchedAt,
          },
        },
        parsed: {
          rawCaseNumber,
          processClassRaw,
          courtOrgan,
          rapporteur,
          judgmentDate,
          publicationDate,
        },
      },
    };

    const verification = PrecedentVerifier.verifyDecision(decision);
    decision.verificationStatus = verification.status;
    decision.lastVerifiedAt = verification.verificationTimestamp;
    decision.verificationBadge = verification.isPassed ? '[OFICIAL TRF3 - VERIFICADO]' : undefined;
    decision.rejectionReasons = verification.isPassed ? undefined : verification.issues;
    return decision;
  }
}
