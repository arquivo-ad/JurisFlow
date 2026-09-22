import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactTjesSearchUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TJES_API = 'https://sistemas.tjes.jus.br/consulta-jurisprudencia/api';
const TJES_SEARCH = TJES_API + '/search';
const VERIFIED_CORES = ['pje2g', 'legado'] as const;
type TjesCore = typeof VERIFIED_CORES[number];
type FetchLike = typeof fetch;

interface TjesSearchResponse {
  core_used?: string;
  docs?: Record<string, any>[];
  total?: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
}

export interface TjesSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  totalRecords: number;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function textOnly(value: unknown): string {
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
function isoDate(value: unknown): string | undefined {
  const text = String(value || '').trim();
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function buildSearchUrl(core: TjesCore, query: string, limit: number): string {
  const url = new URL(TJES_SEARCH);
  url.searchParams.set('core', core);
  url.searchParams.set('q', query);
  url.searchParams.set('page', '1');
  url.searchParams.set('per_page', String(limit));
  return url.toString();
}

function buildDetailUrl(core: TjesCore, id: string): string {
  const url = new URL(TJES_SEARCH);
  url.searchParams.set('core', core);
  url.searchParams.set('q', '*:*');
  url.searchParams.set('page', '1');
  url.searchParams.set('per_page', '1');
  url.searchParams.set('id', id);
  return url.toString();
}

function identity(core: TjesCore, record: Record<string, any>) {
  if (core === 'pje2g') {
    return {
      id: String(record.id || ''),
      cnj: DataJudAdapter.normalizeCnjNumber(String(record.nr_processo || '')),
      organ: textOnly(record.orgao_julgador),
      rapporteur: textOnly(record.magistrado),
      judgmentDate: undefined as string | undefined,
      publicationDate: isoDate(record.dt_juntada),
      processClass: textOnly(record.classe_judicial),
      headnote: textOnly(record.ementa || record.ementa_html),
      fullText: textOnly(record.acordao || record.acordao_html),
    };
  }
  return {
    id: String(record.id || ''),
    cnj: DataJudAdapter.normalizeCnjNumber(String(record.numero_processo_legado || '')),
    organ: textOnly(record.orgao_julgador),
    rapporteur: textOnly(record.nome_desembargador),
    judgmentDate: isoDate(record.data_julgamento),
    publicationDate: isoDate(record.data_publicacao),
    processClass: '',
    headnote: textOnly(record.conteudo_decisao_html),
    fullText: textOnly(record.conteudo_decisao_completa_html || record.conteudo_decisao_html),
  };
}
export class TjesJurisprudenciaAdapter {
  constructor(private readonly fetchImpl: FetchLike = fetch, private readonly timeoutMs = 35_000) {}

  async searchOfficialJurisprudence(query: string, limit = 6): Promise<TjesSearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const safeQuery = String(query || '').trim().slice(0, 500);
    const safeLimit = Math.max(1, Math.min(limit, 10));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (!safeQuery) throw new Error('Consulta TJES vazia.');
      const decisions: CanonicalLegalDecision[] = [];
      const rejectionReasons: string[] = [];
      let totalRecords = 0;
      let bytesTransferred = 0;
      const responseHashes: string[] = [];

      for (const core of VERIFIED_CORES) {
        const searchUrl = buildSearchUrl(core, safeQuery, safeLimit);
        if (!isExactTjesSearchUrl(searchUrl, core)) {
          rejectionReasons.push('Endpoint TJES fora da allowlist exata.');
          continue;
        }
        const response = await this.fetchImpl(searchUrl, {
          headers: {
            Accept: 'application/json',
            Referer: 'https://sistemas.tjes.jus.br/consulta-jurisprudencia/',
            'User-Agent': 'JurisFlow/1.4 LegalResearchConnector',
          },
          signal: controller.signal,
        });
        const searchBytes = Buffer.from(await response.arrayBuffer());
        bytesTransferred += searchBytes.length;
        responseHashes.push(sha256(searchBytes));
        if (!response.ok) {
          rejectionReasons.push(`TJES ${core} retornou HTTP ${response.status}.`);
          continue;
        }

        let payload: TjesSearchResponse;
        try {
          payload = JSON.parse(searchBytes.toString('utf8'));
        } catch {
          rejectionReasons.push(`TJES ${core} retornou JSON inválido.`);
          continue;
        }

        totalRecords += Number(payload.total || 0);
        for (const record of (payload.docs || []).slice(0, safeLimit)) {
          const normalized = await this.verifyRecord(core, record, searchUrl, timestamp, controller.signal);
          if (normalized) decisions.push(normalized);
          else rejectionReasons.push(`Registro TJES ${core} não reuniu evidência individual suficiente.`);
        }
      }
      return {
        decisions: decisions.slice(0, safeLimit),
        totalRecords,
        diagnostic: {
          adapter: 'tjes-jurisprudencia',
          sourceName: 'Tribunal de Justiça do Espírito Santo - Consulta de Jurisprudência',
          courtCode: 'TJES',
          officialUrl: TJES_SEARCH,
          timestamp,
          httpStatus: 200,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length
            ? 'Pesquisa TJES concluída com reconfirmação individual por ID na API oficial e SHA-256.'
            : 'TJES respondeu, mas nenhum registro reuniu evidência individual suficiente.',
          bytesTransferred,
          contentSha256: sha256(responseHashes.join('|')),
          documentsReceived: decisions.length + rejectionReasons.length,
          documentsNormalized: decisions.length,
          documentsRejected: rejectionReasons.length,
          recordsRead: decisions.length + rejectionReasons.length,
          recordsAccepted: decisions.length,
          recordsRejected: rejectionReasons.length,
          parsingErrors: [],
          rejectionReasons,
          normalizedQueryNumber: safeQuery,
          connectorStatus: 'HEALTHY',
        },
      };
    } catch (error: any) {
      const message = error?.name === 'AbortError'
        ? 'Tempo limite ao consultar TJES.'
        : String(error?.message || error);
      return {
        decisions: [],
        totalRecords: 0,
        diagnostic: {
          adapter: 'tjes-jurisprudencia',
          sourceName: 'Tribunal de Justiça do Espírito Santo - Consulta de Jurisprudência',
          courtCode: 'TJES',
          officialUrl: TJES_SEARCH,
          timestamp,
          httpStatus: error?.name === 'AbortError' ? 408 : 503,
          latencyMs: Date.now() - startedAt,
          lifecycleState: 'SOURCE_UNAVAILABLE',
          stateDescription: message,
          documentsReceived: 0,
          documentsNormalized: 0,
          documentsRejected: 0,
          parsingErrors: [message],
          rejectionReasons: [message],
          connectorStatus: 'DEGRADED',
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
  private async verifyRecord(
    core: TjesCore,
    record: Record<string, any>,
    originatingSearchUrl: string,
    timestamp: string,
    signal: AbortSignal
  ): Promise<CanonicalLegalDecision | null> {
    const initial = identity(core, record);
    if (!initial.id || !initial.cnj || !initial.rapporteur || !initial.organ || !initial.headnote || !initial.fullText) {
      return null;
    }

    const detailUrl = buildDetailUrl(core, initial.id);
    if (!isExactTjesSearchUrl(detailUrl, core, initial.id)) return null;

    const detailResponse = await this.fetchImpl(detailUrl, {
      headers: {
        Accept: 'application/json',
        Referer: 'https://sistemas.tjes.jus.br/consulta-jurisprudencia/',
        'User-Agent': 'JurisFlow/1.4 LegalResearchConnector',
      },
      signal,
    });
    const detailBytes = Buffer.from(await detailResponse.arrayBuffer());
    if (!detailResponse.ok) return null;

    let detailPayload: TjesSearchResponse;
    try {
      detailPayload = JSON.parse(detailBytes.toString('utf8'));
    } catch {
      return null;
    }
    const matches = detailPayload.docs || [];
    if (Number(detailPayload.total) !== 1 || matches.length !== 1) return null;

    const confirmed = identity(core, matches[0]!);
    if (
      confirmed.id !== initial.id
      || confirmed.cnj !== initial.cnj
      || confirmed.rapporteur !== initial.rapporteur
      || confirmed.organ !== initial.organ
      || confirmed.fullText !== initial.fullText
    ) return null;

    const contentSha256 = sha256(detailBytes);
    const decision: CanonicalLegalDecision = {
      id: 'tjes-' + contentSha256.slice(0, 20),
      sourceId: 'tjes-jurisprudencia',
      officialUrl: detailUrl,
      fullTextUrl: detailUrl,
      court: 'Tribunal de Justiça do Estado do Espírito Santo',
      courtCode: 'TJES',
      judicialBranch: 'ESTADUAL',
      jurisdiction: 'ES',
      courtOrgan: confirmed.organ,
      processClass: confirmed.processClass,
      rawCaseNumber: confirmed.cnj,
      normalizedCnjNumber: confirmed.cnj,
      alternativeNumber: confirmed.id,
      rapporteur: confirmed.rapporteur,
      judgmentDate: confirmed.judgmentDate,
      publicationDate: confirmed.publicationDate,
      officialHeadnote: confirmed.headnote,
      fullText: confirmed.fullText,
      documentType: 'ACORDAO',
      precedentSituation: 'JULGADO',
      precedentStrength: 'PERSUASIVO_REGIONAL',
      language: 'pt-BR',
      contentSha256,
      collectedAt: timestamp,
      lastVerifiedAt: timestamp,
      verificationStatus: 'FOUND_UNVERIFIED',
      parserVersion: 'tjes-solr-api-2026.1',
      documentVersion: 1,
      rawPayloadPreserved: {
        core,
        id: confirmed.id,
        verificationEvidence: {
          individualDocument: {
            confirmed: true,
            url: detailUrl,
            httpStatus: detailResponse.status,
            contentSha256,
            bytes: detailBytes.length,
            fetchedAt: timestamp,
            hits: Number(detailPayload.total),
          },
          originatingQuery: {
            id: 'tjes-query-' + sha256(originatingSearchUrl).slice(0, 24),
            endpoint: originatingSearchUrl,
            querySha256: sha256(originatingSearchUrl),
            responseRecordSha256: sha256(JSON.stringify(record)),
            executedAt: timestamp,
          },
        },
      },
    };

    const verification = PrecedentVerifier.verifyDecision(decision);
    decision.verificationStatus = verification.status;
    decision.lastVerifiedAt = verification.verificationTimestamp;
    decision.verificationBadge = verification.isPassed ? '[OFICIAL TJES - VERIFICADO]' : undefined;
    decision.rejectionReasons = verification.isPassed ? undefined : verification.issues;
    return verification.isPassed ? decision : null;
  }
}
