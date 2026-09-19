import crypto from 'crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TST_API_BASE = 'https://jurisprudencia-backend.tst.jus.br';
const TST_SEARCH_ENDPOINT = `${TST_API_BASE}/rest/pesquisa-textual`;
const TST_PORTAL_URL = 'https://jurisprudencia.tst.jus.br/';
const TST_DOCUMENT_ENDPOINT = `${TST_API_BASE}/rest/documentos`;

type FetchLike = typeof fetch;

interface TstSearchRecord {
  id?: string | number;
  tipo?: string;
  numFormatado?: string;
  numProc?: string | number;
  numProcInt?: string | number;
  anoProcInt?: string | number;
  numInterno?: string | number;
  numProcDocumento?: string | number;
  orgao?: string;
  orgaoJudicante?: { descricao?: string } | string;
  nomRelator?: string;
  dtaJulgamento?: string;
  dtaPublicacao?: string;
  dtaAtualizacao?: string;
  ementa?: string;
  ementaHtml?: string;
  dispositivo?: string;
  numeracaoUnica?: {
    numero?: string | number;
    ano?: string | number;
    digito?: string | number;
    orgao?: string | number;
    tribunal?: string | number;
    vara?: string | number;
  } | string;
}

interface TstSearchEnvelope {
  totalRegistros?: number;
  registros?: Array<{ registro?: TstSearchRecord } | TstSearchRecord>;
}

export interface TstSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  totalRecords: number;
}

const QUERY_STOP_WORDS = new Set([
  'a', 'ao', 'aos', 'as', 'com', 'como', 'da', 'das', 'de', 'do', 'dos', 'e', 'em',
  'era', 'essa', 'esse', 'esta', 'este', 'eu', 'existem', 'foi', 'foram', 'fui',
  'me', 'meu', 'minha', 'na', 'nas', 'no', 'nos', 'o', 'os', 'ou', 'para', 'pela',
  'pelo', 'por', 'qual', 'quais', 'que', 'se', 'seu', 'sua', 'tem', 'tenho', 'tinha',
  'todas', 'todos', 'um', 'uma', 'direito', 'jurisprudencia', 'jurisprudencias',
]);

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function stripHtml(value: unknown): string {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function isoDate(value: unknown): string | undefined {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : undefined;
}

function pathDate(value: unknown): string | null {
  const date = isoDate(value);
  if (!date) return null;
  const [year, month, day] = date.split('-');
  return `${day}-${month}-${year}`;
}

/**
 * Conector de consulta sob demanda da pesquisa pública oficial do TST.
 * Não usa scraping, credenciais, seeds ou resultados sintéticos.
 */
export class TstJurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 30_000
  ) {}

  public static buildSearchTerms(query: string): string {
    const folded = query
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s.-]/g, ' ');
    const legalConcepts: string[] = [];
    if (/verbas?\s+rescis|rescis[aã]o/.test(folded)) legalConcepts.push('verbas rescisórias');
    if (/fundac[aã]o/.test(folded)) legalConcepts.push('fundação pública');
    if (/cargo.{0,30}confianca|indicacao.{0,30}confianca/.test(folded)) legalConcepts.push('cargo de confiança');
    if (/\bclt\b|celetist/.test(folded)) legalConcepts.push('regime celetista');
    if (legalConcepts.length >= 2) return legalConcepts.join(' ');

    const normalized = query
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúâêîôûãõç\s.-]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !QUERY_STOP_WORDS.has(token));

    return Array.from(new Set(normalized)).slice(0, 14).join(' ');
  }

  public static buildCnjNumber(value: TstSearchRecord['numeracaoUnica']): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') {
      return DataJudAdapter.normalizeCnjNumber(value) || undefined;
    }

    const numero = String(value.numero ?? '').replace(/\D/g, '').padStart(7, '0');
    const digito = String(value.digito ?? '').replace(/\D/g, '').padStart(2, '0');
    const ano = String(value.ano ?? '').replace(/\D/g, '').padStart(4, '0');
    const orgao = String(value.orgao ?? '5').replace(/\D/g, '').padStart(1, '0');
    const tribunal = String(value.tribunal ?? '').replace(/\D/g, '').padStart(2, '0');
    const vara = String(value.vara ?? '').replace(/\D/g, '').padStart(4, '0');
    const candidate = `${numero}-${digito}.${ano}.${orgao}.${tribunal}.${vara}`;
    return DataJudAdapter.normalizeCnjNumber(candidate) || undefined;
  }

  public static buildOfficialDocumentUrl(record: TstSearchRecord): string | null {
    const cnj = TstJurisprudenciaAdapter.buildCnjNumber(record.numeracaoUnica)?.replace(/\D/g, '');
    const judgment = pathDate(record.dtaJulgamento);
    const publication = pathDate(record.dtaPublicacao);
    if (!cnj || !judgment || !publication) return null;
    return `${TST_DOCUMENT_ENDPOINT}/${cnj}/${judgment}/${publication}`;
  }

  public normalizeDecision(
    record: TstSearchRecord,
    evidence: { endpoint: string; querySha256: string; responseRecordSha256: string; fetchedAt: string }
  ): CanonicalLegalDecision | null {
    const caseNumber = String(record.numFormatado || '').trim();
    const headnote = stripHtml(record.ementa || record.ementaHtml);
    const rapporteur = stripHtml(record.nomRelator);
    const courtOrgan = stripHtml(
      typeof record.orgaoJudicante === 'string'
        ? record.orgaoJudicante
        : record.orgaoJudicante?.descricao
    );
    const judgmentDate = isoDate(record.dtaJulgamento);
    const publicationDate = isoDate(record.dtaPublicacao);
    const officialUrl = TstJurisprudenciaAdapter.buildOfficialDocumentUrl(record);

    if (!record.id || !caseNumber || headnote.length < 25 || !rapporteur || !courtOrgan || !judgmentDate || !publicationDate || !officialUrl) {
      return null;
    }

    const normalizedCnjNumber = TstJurisprudenciaAdapter.buildCnjNumber(record.numeracaoUnica);
    const hashPayload = `${caseNumber}|${rapporteur}|${judgmentDate}|${headnote}`;
    const contentSha256 = sha256(hashPayload);
    const processClass = caseNumber.split(/\s+-\s+|\s+/)[0] || String(record.tipo || 'ACÓRDÃO');

    const decision: CanonicalLegalDecision = {
      id: `tst-${contentSha256.slice(0, 20)}`,
      sourceId: 'tst-jurisprudencia',
      officialUrl,
      fullTextUrl: officialUrl,
      court: 'Tribunal Superior do Trabalho',
      courtCode: 'TST',
      judicialBranch: 'TRABALHO',
      jurisdiction: 'BRASIL',
      courtOrgan,
      processClass,
      rawCaseNumber: caseNumber,
      normalizedCnjNumber,
      alternativeNumber: String(record.id),
      rapporteur,
      judgmentDate,
      publicationDate,
      availabilityDate: publicationDate,
      officialHeadnote: headnote,
      dispositiveSnippet: stripHtml(record.dispositivo) || undefined,
      documentType: 'ACORDAO',
      precedentSituation: 'JULGADO',
      precedentStrength: 'PERSUASIVO_SUPERIOR',
      language: 'pt-BR',
      contentSha256,
      collectedAt: evidence.fetchedAt,
      lastVerifiedAt: evidence.fetchedAt,
      verificationStatus: 'FOUND_UNVERIFIED',
      parserVersion: 'tst-api-2026.1',
      documentVersion: 1,
      rawPayloadPreserved: {
        officialApiRecordId: String(record.id),
        officialApiEndpoint: TST_SEARCH_ENDPOINT,
        officialPortalUrl: TST_PORTAL_URL,
        officialQuerySha256: evidence.querySha256,
        officialResponseSha256: evidence.responseRecordSha256,
        fetchedAt: evidence.fetchedAt,
        record: {
          id: String(record.id),
          tipo: record.tipo,
          numFormatado: record.numFormatado,
          anoProcInt: record.anoProcInt,
          numProcInt: record.numProcInt,
          numInterno: record.numInterno,
          numProcDocumento: record.numProcDocumento,
          orgao: record.orgao,
          orgaoJudicante: record.orgaoJudicante,
          nomRelator: record.nomRelator,
          dtaJulgamento: record.dtaJulgamento,
          dtaPublicacao: record.dtaPublicacao,
          dtaAtualizacao: record.dtaAtualizacao,
          ementa: record.ementa,
          dispositivo: record.dispositivo,
          numeracaoUnica: record.numeracaoUnica,
        },
      },
    };

    const verification = PrecedentVerifier.verifyDecision(decision);
    decision.verificationStatus = verification.status;
    decision.lastVerifiedAt = verification.verificationTimestamp;
    decision.verificationBadge = verification.isPassed ? '[OFICIAL TST - VERIFICADO]' : undefined;
    decision.rejectionReasons = verification.isPassed ? undefined : verification.issues;
    return decision;
  }

  public async searchOfficialJurisprudence(query: string, limit = 10): Promise<TstSearchResult> {
    const startedAt = Date.now();
    const fetchedAt = new Date().toISOString();
    const searchTerms = TstJurisprudenciaAdapter.buildSearchTerms(query);
    const safeLimit = Math.max(1, Math.min(limit, 20));
    const endpoint = `${TST_SEARCH_ENDPOINT}/1/${safeLimit}?a=${Date.now()}`;
    const body = {
      ou: '',
      e: searchTerms,
      termoExato: '',
      naoContem: '',
      ementa: '',
      dispositivo: '',
      numeracaoUnica: { numero: '', ano: '', digito: '', orgao: '5', tribunal: '', vara: '' },
      orgaosJudicantes: [],
      ministros: [],
      convocados: [],
      classesProcessuais: [],
      codigosClassesPrecedentes: [],
      indicadores: [],
      assuntos: [],
      tipos: ['ACORDAO'],
      orgao: 'TST',
      publicacaoInicial: '',
      publicacaoFinal: '',
      julgamentoInicial: '',
      julgamentoFinal: '',
      ordenacao: 'data',
    };
    const requestJson = JSON.stringify(body);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (!searchTerms) {
        throw new Error('Consulta sem termos jurídicos substantivos após normalização.');
      }
      const response = await this.fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: requestJson,
        signal: controller.signal,
      });
      const responseText = await response.text();
      const bytesTransferred = Buffer.byteLength(responseText, 'utf8');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} retornado pela pesquisa oficial do TST.`);
      }

      const parsed = JSON.parse(responseText) as TstSearchEnvelope | TstSearchEnvelope[];
      const envelope = Array.isArray(parsed) ? parsed[0] : parsed;
      const records = Array.isArray(envelope?.registros)
        ? envelope.registros.map((entry) => ('registro' in entry ? entry.registro : entry)).filter(Boolean) as TstSearchRecord[]
        : [];
      const querySha256 = sha256(requestJson);
      const decisions = records
        .map((record) => this.normalizeDecision(record, {
          endpoint,
          querySha256,
          responseRecordSha256: sha256(JSON.stringify(record)),
          fetchedAt,
        }))
        .filter((decision): decision is CanonicalLegalDecision => Boolean(decision));
      const rejected = records.length - decisions.length;
      const totalRecords = Number(envelope?.totalRegistros || records.length);

      return {
        decisions,
        totalRecords,
        diagnostic: {
          adapter: 'tst-jurisprudencia',
          sourceName: 'Tribunal Superior do Trabalho - Pesquisa Oficial de Jurisprudência',
          courtCode: 'TST',
          officialUrl: endpoint,
          timestamp: fetchedAt,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length > 0 ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length > 0
            ? 'Consulta oficial concluída; acórdãos normalizados e submetidos à verificação determinística.'
            : 'A fonte respondeu, mas nenhum acórdão retornado reuniu evidência suficiente para uso.',
          bytesTransferred,
          contentSha256: sha256(responseText),
          documentsReceived: records.length,
          documentsNormalized: decisions.length,
          documentsRejected: rejected,
          recordsRead: records.length,
          recordsAccepted: decisions.length,
          recordsRejected: rejected,
          parsingErrors: [],
          rejectionReasons: rejected > 0 ? [`${rejected} registro(s) sem metadados mínimos ou URL oficial individualizável.`] : [],
          normalizedQueryNumber: searchTerms,
          connectorStatus: 'HEALTHY',
        },
      };
    } catch (error: any) {
      const isTimeout = error?.name === 'AbortError';
      return {
        decisions: [],
        totalRecords: 0,
        diagnostic: {
          adapter: 'tst-jurisprudencia',
          sourceName: 'Tribunal Superior do Trabalho - Pesquisa Oficial de Jurisprudência',
          courtCode: 'TST',
          officialUrl: endpoint,
          timestamp: fetchedAt,
          httpStatus: isTimeout ? 408 : 503,
          latencyMs: Date.now() - startedAt,
          lifecycleState: 'SOURCE_UNAVAILABLE',
          stateDescription: isTimeout
            ? 'Tempo limite excedido na fonte oficial do TST.'
            : `Fonte oficial do TST indisponível: ${error?.message || String(error)}`,
          bytesTransferred: 0,
          documentsReceived: 0,
          documentsNormalized: 0,
          documentsRejected: 0,
          recordsRead: 0,
          recordsAccepted: 0,
          recordsRejected: 0,
          parsingErrors: [error?.message || String(error)],
          rejectionReasons: [error?.message || String(error)],
          normalizedQueryNumber: searchTerms,
          connectorStatus: isTimeout ? 'DEGRADED' : 'FAILED',
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
