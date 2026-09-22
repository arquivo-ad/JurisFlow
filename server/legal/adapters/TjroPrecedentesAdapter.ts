import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { isExactTjroPrecedentsUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic, PrecedentSituation } from '../types.ts';

const TJRO_BASE = 'https://liame.tjro.jus.br';
const TJRO_SEARCH = TJRO_BASE + '/api/pesquisa/precedentes';
type FetchLike = typeof fetch;

interface TjroParadigma {
  classe?: number;
  numero?: string;
}

interface TjroRegistro {
  numero?: string;
  questao?: string;
  tese?: string;
  textoAcordaoMerito?: string;
  textoAcordaoAdmissao?: string;
  relator?: string;
  processosParadigma?: TjroParadigma[];
  dataAdmissao?: string;
  dataJulgamento?: string;
  dataPublicacao?: string;
  dataTransitoJulgado?: string;
  referenciaLegislativa?: string;
  dataAtualizacao?: string;
  situacao?: string;
}

interface TjroResult {
  sigla?: string;
  especie?: string;
  registro?: TjroRegistro;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function clean(value?: string): string {
  const v = String(value || '').trim();
  return /^não informado\(a\)$/i.test(v) ? '' : v;
}
function isoDate(value?: string): string | undefined {
  const text = clean(value);
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function situation(value?: string): PrecedentSituation {
  const v = clean(value).toUpperCase();
  if (v.includes('TRANSIT')) return 'TRANSITADO';
  if (v.includes('ACORDAO') || v.includes('JULG')) return 'JULGADO';
  if (v.includes('SOBREST')) return 'SOBRESTADO';
  return 'AFETADO';
}

function buildBody(query: string, limit: number) {
  return {
    siglas: ['TJRO'],
    especies: ['incidente_demanda_repetitiva', 'incidente_assuncao_competencia'],
    texto: query,
    numero: '',
    numero_processo_paradigma: '',
    assuntos: '',
    data_inicio: '',
    data_final: '',
    situacao: '',
    ordenacao: { dataAtualizacao: 'Desc' },
    page: 1,
    page_size: limit,
  };
}

export class TjroPrecedentesAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 35_000
  ) {}

  async searchOfficialPrecedents(query: string, limit = 10) {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const safeQuery = String(query || '').trim().slice(0, 500);
    const safeLimit = Math.max(1, Math.min(limit, 20));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      if (!isExactTjroPrecedentsUrl(TJRO_SEARCH)) throw new Error('Endpoint TJRO fora da allowlist.');
      const requestBody = JSON.stringify(buildBody(safeQuery, safeLimit));
      const response = await this.fetchImpl(TJRO_SEARCH, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Referer: TJRO_BASE + '/',
          'User-Agent': 'Mozilla/5.0 JurisFlow/1.4 LegalResearchConnector',
        },
        body: requestBody,
        signal: controller.signal,
      });
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!response.ok) throw new Error('HTTP ' + response.status + ' na pesquisa TJRO.');

      const payload = JSON.parse(bytes.toString('utf8')) as any;
      const rows: TjroResult[] = Array.isArray(payload?.data?.results) ? payload.data.results : [];
      const decisions: CanonicalLegalDecision[] = [];
      const rejected: string[] = [];

      for (const row of rows.slice(0, safeLimit)) {
        const r = row.registro || {};
        if (row.sigla !== 'TJRO') continue;
        const type = row.especie === 'incidente_assuncao_competencia' ? 'IAC' : 'IRDR';
        const paradigm = r.processosParadigma?.[0];
        const cnj = paradigm?.numero
          ? DataJudAdapter.normalizeCnjNumber(String(paradigm.numero))
          : null;
        const question = clean(r.questao);
        const thesis = clean(r.tese);
        if (!r.numero || (!question && !thesis)) {
          rejected.push('Precedente TJRO sem número ou conteúdo material.');
          continue;
        }

        const recordHash = sha256(JSON.stringify(row));
        const individual = clean(r.textoAcordaoMerito) || clean(r.textoAcordaoAdmissao);
        const headnote = thesis || question;
        const fullText = [question, thesis, clean(r.referenciaLegislativa)].filter(Boolean).join('\n\n');
        decisions.push({
          id: 'tjro-' + recordHash.slice(0, 20),
          sourceId: 'tjro-precedentes',
          officialUrl: TJRO_SEARCH,
          court: 'Tribunal de Justiça do Estado de Rondônia',
          courtCode: 'TJRO',
          judicialBranch: 'ESTADUAL',
          jurisdiction: 'RO',
          courtOrgan: '',
          processClass: type,
          rawCaseNumber: cnj || String(paradigm?.numero || ''),
          normalizedCnjNumber: cnj || undefined,
          alternativeNumber: r.numero,
          rapporteur: clean(r.relator),
          judgmentDate: isoDate(r.dataJulgamento || r.dataAdmissao),
          publicationDate: isoDate(r.dataPublicacao),
          officialHeadnote: headnote,
          fullText,
          documentType: type,
          precedentSituation: situation(r.situacao),
          precedentStrength: 'QUALIFICADO',
          language: 'pt-BR',
          contentSha256: recordHash,
          collectedAt: timestamp,
          lastVerifiedAt: timestamp,
          verificationStatus: 'FOUND_UNVERIFIED',
          parserVersion: 'tjro-liame-2026.1',
          documentVersion: 1,
          rejectionReasons: [
            'TJRO_DOCUMENTO_INDIVIDUAL_SSO: o acórdão individual do PJe exige autenticação SSO; precedente permanece não verificado.',
          ],
          rawPayloadPreserved: {
            especie: row.especie,
            numero: r.numero,
            situacao: r.situacao,
            dataAtualizacao: r.dataAtualizacao,
            individualDocumentCandidate: individual || undefined,
            verificationEvidence: {
              originatingQuery: {
                id: 'tjro-query-' + sha256(requestBody).slice(0, 24),
                endpoint: TJRO_SEARCH,
                querySha256: sha256(requestBody),
                responseRecordSha256: recordHash,
                executedAt: timestamp,
              },
              individualDocument: {
                confirmed: false,
                url: individual || TJRO_SEARCH,
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
        totalRecords: Number(payload?.data?.total || rows.length),
        diagnostic: {
          adapter: 'tjro-precedentes',
          sourceName: 'TJRO - Liame Precedentes',
          courtCode: 'TJRO',
          officialUrl: TJRO_SEARCH,
          timestamp,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length
            ? 'Liame retornou precedentes qualificados reais; documento individual PJe exige SSO, mantendo FOUND_UNVERIFIED.'
            : 'Liame respondeu sem precedentes válidos para normalização.',
          bytesTransferred: bytes.length,
          contentSha256: sha256(bytes),
          documentsReceived: rows.length,
          documentsNormalized: decisions.length,
          documentsRejected: rows.length - decisions.length,
          recordsRead: rows.length,
          recordsAccepted: decisions.length,
          recordsRejected: rows.length - decisions.length,
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
          adapter: 'tjro-precedentes',
          sourceName: 'TJRO - Liame Precedentes',
          courtCode: 'TJRO',
          officialUrl: TJRO_SEARCH,
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
