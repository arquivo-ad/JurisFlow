import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { isExactTjtoSearchUrl, isExactTjtoCandidateDocumentUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TJTO_BASE = 'https://jurisprudencia.tjto.jus.br';
const TJTO_SEARCH = TJTO_BASE + '/consulta.php';
type FetchLike = typeof fetch;

interface TjtoRecord {
  uuid: string;
  rawCaseNumber: string;
  processClass: string;
  organ: string;
  rapporteur: string;
  judgmentDate?: string;
  headnote: string;
  processUrl?: string;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function textOnly(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function brDate(value?: string): string | undefined {
  const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? match[3] + '-' + match[2] + '-' + match[1] : undefined;
}

function extractCell(chunk: string, label: string): string {
  const safe = label.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const re = new RegExp('<td[^>]*>\\s*' + safe + '\\s*</td>\\s*<td[^>]*>([\\s\\S]*?)</td>', 'i');
  return textOnly(re.exec(chunk)?.[1] || '');
}

function extractResults(html: string): TjtoRecord[] {
  const out: TjtoRecord[] = [];
  const chunks = html.split(/<div[^>]+class=["'][^"']*panel-document[^"']*["'][^>]*>/i).slice(1);

  for (const chunk of chunks) {
    const uuid = /viewFileDoc\.php\?uuid=([a-f0-9]{32})/i.exec(chunk)?.[1] || '';
    const rawCaseNumber = /setcopiarConteudo\('([^']+)'\)/i.exec(chunk)?.[1] || '';
    const cnj = DataJudAdapter.normalizeCnjNumber(rawCaseNumber);
    const headnoteHtml = /<div[^>]+class=["'][^"']*content_ementa[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(chunk)?.[1] || '';
    const headnote = textOnly(headnoteHtml);
    const processUrl = /href=["'](https:\/\/eproc2\.tjto\.jus\.br\/consulta_publica\/2G\/processo\/\d+\/?)["']/i.exec(chunk)?.[1];

    if (!uuid || !cnj || !headnote) continue;
    out.push({
      uuid,
      rawCaseNumber: cnj,
      processClass: extractCell(chunk, 'Classe'),
      organ: extractCell(chunk, 'Competência'),
      rapporteur: extractCell(chunk, 'Relator'),
      judgmentDate: brDate(extractCell(chunk, 'Data Julgamento')),
      headnote,
      processUrl,
    });
  }
  return out;
}

export class TjtoJurisprudenciaAdapter {
  constructor(private readonly fetchImpl: FetchLike = fetch, private readonly timeoutMs = 35_000) {}

  async searchOfficialJurisprudence(query: string, limit = 5) {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const safeQuery = String(query || '').trim().slice(0, 500);
    const searchUrl = new URL(TJTO_SEARCH);
    searchUrl.searchParams.set('q', safeQuery);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      if (!safeQuery) throw new Error('Consulta TJTO vazia.');
      if (!isExactTjtoSearchUrl(searchUrl.toString())) throw new Error('Endpoint TJTO fora da allowlist.');

      const response = await this.fetchImpl(searchUrl, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          Referer: TJTO_BASE + '/',
          'User-Agent': 'Mozilla/5.0 JurisFlow/1.4 LegalResearchConnector',
        },
        signal: controller.signal,
      });

      const bytes = Buffer.from(await response.arrayBuffer());
      if (!response.ok) throw new Error('HTTP ' + response.status + ' na busca TJTO.');

      const html = bytes.toString('utf8');
      const records = extractResults(html).slice(0, Math.max(1, Math.min(limit, 10)));
      const decisions: CanonicalLegalDecision[] = [];
      const rejectionReasons: string[] = [];

      for (const record of records) {
        const candidateUrl = TJTO_BASE + '/viewFileDoc.php?uuid=' + record.uuid;
        if (!isExactTjtoCandidateDocumentUrl(candidateUrl, record.uuid)) {
          rejectionReasons.push('Candidato de inteiro teor TJTO fora da allowlist.');
          continue;
        }
        const contentSha256 = sha256(JSON.stringify(record));
        decisions.push({
          id: 'tjto-' + contentSha256.slice(0, 20),
          sourceId: 'tjto-jurisprudencia',
          officialUrl: searchUrl.toString(),
          fullTextUrl: candidateUrl,
          court: 'Tribunal de Justiça do Estado do Tocantins',
          courtCode: 'TJTO',
          judicialBranch: 'ESTADUAL',
          jurisdiction: 'TO',
          courtOrgan: record.organ,
          processClass: record.processClass,
          rawCaseNumber: record.rawCaseNumber,
          normalizedCnjNumber: record.rawCaseNumber,
          rapporteur: record.rapporteur,
          judgmentDate: record.judgmentDate,
          officialHeadnote: record.headnote,
          fullText: undefined,
          documentType: 'ACORDAO',
          precedentSituation: 'JULGADO',
          precedentStrength: 'PERSUASIVO_REGIONAL',
          language: 'pt-BR',
          contentSha256,
          collectedAt: timestamp,
          lastVerifiedAt: timestamp,
          verificationStatus: 'FOUND_UNVERIFIED',
          parserVersion: 'tjto-juristo-2026.1',
          documentVersion: 1,
          rejectionReasons: [
            'INTEIRO_TEOR_NAO_CONFIRMADO: viewFileDoc.php exige fluxo adicional e retornou HTTP 403 no smoke direto; não promover para VERIFIED_OFFICIAL.',
          ],
          rawPayloadPreserved: {
            uuid: record.uuid,
            processUrl: record.processUrl,
            candidateDocumentUrl: candidateUrl,
            searchRecordSha256: contentSha256,
          },
        });
      }

      return {
        decisions,
        totalRecords: records.length,
        diagnostic: {
          adapter: 'tjto-jurisprudencia',
          sourceName: 'Tribunal de Justiça do Estado do Tocantins - Jurisprudência',
          courtCode: 'TJTO',
          officialUrl: searchUrl.toString(),
          timestamp,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length > 0 ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length > 0
            ? 'Busca TJTO automatizada com ementa/UUID; inteiro teor não confirmado e resultados permanecem FOUND_UNVERIFIED.'
            : 'TJTO respondeu sem registros normalizáveis.',
          bytesTransferred: bytes.length,
          contentSha256: sha256(bytes),
          documentsReceived: records.length,
          documentsNormalized: decisions.length,
          documentsRejected: records.length - decisions.length,
          recordsRead: records.length,
          recordsAccepted: decisions.length,
          recordsRejected: records.length - decisions.length,
          parsingErrors: [],
          rejectionReasons,
          normalizedQueryNumber: safeQuery,
          connectorStatus: 'DEGRADED',
        } as OfficialSourceDiagnostic,
      };
    } catch (error: any) {
      const message = String(error?.message || error);
      return {
        decisions: [],
        totalRecords: 0,
        diagnostic: {
          adapter: 'tjto-jurisprudencia',
          sourceName: 'Tribunal de Justiça do Estado do Tocantins - Jurisprudência',
          courtCode: 'TJTO',
          officialUrl: searchUrl.toString(),
          timestamp,
          httpStatus: error?.name === 'AbortError' ? 408 : 503,
          latencyMs: Date.now() - startedAt,
          lifecycleState: 'SOURCE_UNAVAILABLE',
          stateDescription: message,
          bytesTransferred: 0,
          documentsReceived: 0,
          documentsNormalized: 0,
          documentsRejected: 0,
          recordsRead: 0,
          recordsAccepted: 0,
          recordsRejected: 0,
          parsingErrors: [message],
          rejectionReasons: [message],
          normalizedQueryNumber: safeQuery,
          connectorStatus: 'FAILED',
        } as OfficialSourceDiagnostic,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
