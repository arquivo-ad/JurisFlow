import {
  JudicialProcessSearchResult,
  JudicialProcessMovementItem,
  JudicialProcessDocumentItem,
  JurisprudenceSearchParams,
  CourtAvailabilityMatrixItem,
} from '../../src/types/index.ts';
import { DataJudAdapter } from './adapters/DataJudAdapter.ts';
import { TstJurisprudenciaAdapter } from './adapters/TstJurisprudenciaAdapter.ts';
import { Trt2JurisprudenciaAdapter } from './adapters/Trt2JurisprudenciaAdapter.ts';
import { LegalSearchEngine } from './searchEngine.ts';
import { legalStorage } from './storage.ts';
import { LegalSearchQuery, LegalSearchResultItem } from './types.ts';
import { LegalCompetenceClassifier } from './classifier.ts';

/**
 * INTERFACE CANÔNICA DE PROVEDORES DE BUSCA PROCESSUAL E JURISPRUDENCIAL
 *
 * Padrão Strategy / Adapter:
 * - Isola as particularidades técnicas de cada tribunal e API pública
 * - Garante conformidade estrita com termos de uso e LGPD (sem bypass de WAF/CAPTCHA)
 * - Normaliza os dados para as entidades fundamentais do JurisFlow (Case, Movement, DocumentItem)
 */
export interface JudicialSearchProvider {
  name: string;
  code: string;
  isAvailable(): Promise<boolean>;
  searchProcess(params: {
    cnjNumber?: string;
    courtCode?: string;
    lawyerOab?: string;
    partyName?: string;
  }): Promise<JudicialProcessSearchResult[]>;
  searchJurisprudence(params: JurisprudenceSearchParams, tenantId?: string): Promise<{
    results: LegalSearchResultItem[];
    total: number;
    sourcesConsulted: string[];
    executionTimeMs: number;
  }>;
  getProcessDetails(processNumber: string): Promise<JudicialProcessSearchResult | null>;
  getMovements(processNumber: string): Promise<JudicialProcessMovementItem[]>;
  getPublicDocuments(processNumber: string): Promise<JudicialProcessDocumentItem[]>;
}

/**
 * PROVEDOR OFICIAL DATAJUD (CONSELHO NACIONAL DE JUSTIÇA)
 */
export class DataJudSearchProvider implements JudicialSearchProvider {
  public name = 'CNJ DataJud - Base Nacional de Dados Processuais';
  public code = 'CNJ_DATAJUD';
  private adapter: DataJudAdapter;

  constructor(adapter?: DataJudAdapter) {
    this.adapter = adapter || new DataJudAdapter();
  }

  public async isAvailable(): Promise<boolean> {
    return this.adapter.isConfigured();
  }

  public async searchProcess(params: {
    cnjNumber?: string;
    courtCode?: string;
    lawyerOab?: string;
    partyName?: string;
  }): Promise<JudicialProcessSearchResult[]> {
    if (!params.cnjNumber && !params.lawyerOab && !params.partyName) {
      return [];
    }

    if (params.cnjNumber) {
      const detail = await this.getProcessDetails(params.cnjNumber);
      return detail ? [detail] : [];
    }

    throw new Error('SEARCH_MODE_NOT_IMPLEMENTED: busca por OAB ou nome não possui conector oficial habilitado.');
  }

  public async getProcessDetails(processNumber: string): Promise<JudicialProcessSearchResult | null> {
    const normalized = DataJudAdapter.normalizeCnjNumber(processNumber);
    if (!normalized) throw new Error('INVALID_CNJ_NUMBER: formato ou dígito verificador inválido.');

    // Consulta API pública oficial do DataJud
    const queryResult = await this.adapter.queryProcessByCnj(normalized);

    if (queryResult.success && queryResult.metadata && queryResult.evidence) {
      const meta = queryResult.metadata;
      const movements: JudicialProcessMovementItem[] = (queryResult.movements || []).map((m) => ({
        id: m.id,
        date: m.movementDate,
        title: m.movementName,
        content: m.complement ? `${m.movementName} - ${m.complement}` : m.movementName,
        complement: m.complement,
        code: m.movementCode,
        source: 'COURT_API',
      }));

      legalStorage.updateSource('cnj-datajud', {
        connectorStatus: 'HEALTHY',
        credentialConfigured: true,
        lastSuccessfulSyncAt: queryResult.evidence.verifiedAt,
        checksum: queryResult.evidence.responseSha256,
        latencyMs: queryResult.evidence.latencyMs,
        lastErrorCode: undefined,
        lastErrorMessage: undefined,
      });

      return {
        processNumber: normalized,
        normalizedCnjNumber: normalized,
        court: meta.courtCode,
        courtCode: meta.courtCode,
        judicialDegree: meta.judicialDegree,
        processClass: meta.processClass.name,
        courtOrgan: meta.courtOrgan,
        distributionDate: meta.distributionDate || '',
        claimValue: meta.value,
        isConfidential: meta.isConfidential,
        subjects: meta.subjects,
        parties: [],
        lawyers: [],
        movements,
        documents: [],
        retrievedAt: queryResult.evidence.verifiedAt,
        sourceProvider: 'CNJ DataJud (Res. 331/CNJ)',
        sourceUrl: queryResult.evidence.endpoint,
        evidenceState: 'VERIFIED_OFFICIAL',
        evidenceId: `DATAJUD:${normalized}:${queryResult.evidence.responseSha256.slice(0, 20)}`,
        contentSha256: queryResult.evidence.responseSha256,
        verificationTimestamp: queryResult.evidence.verifiedAt,
        originatingQueryId: queryResult.evidence.queryId,
        isAlreadyImported: false,
      };
    }

    legalStorage.updateSource('cnj-datajud', {
      connectorStatus: (queryResult.statusCode === 408 || (queryResult.statusCode || 0) >= 500) ? 'SOURCE_UNAVAILABLE' : 'DEGRADED',
      lastFailureAt: new Date().toISOString(),
      lastErrorCode: String(queryResult.statusCode || 'DATAJUD_ERROR'),
      lastErrorMessage: queryResult.error || 'DataJud não retornou dados verificáveis.',
    });
    throw new Error(`OFFICIAL_SOURCE_UNAVAILABLE: ${queryResult.error || 'DataJud não retornou dados verificáveis.'}`);
  }

  public async getMovements(processNumber: string): Promise<JudicialProcessMovementItem[]> {
    const detail = await this.getProcessDetails(processNumber);
    return detail ? detail.movements : [];
  }

  public async getPublicDocuments(processNumber: string): Promise<JudicialProcessDocumentItem[]> {
    const detail = await this.getProcessDetails(processNumber);
    return detail ? detail.documents : [];
  }

  public async searchJurisprudence(params: JurisprudenceSearchParams, tenantId?: string): Promise<{
    results: LegalSearchResultItem[];
    total: number;
    sourcesConsulted: string[];
    executionTimeMs: number;
  }> {
    const searchEngine = new LegalSearchEngine(legalStorage);
    const query: LegalSearchQuery = {
      query: params.query,
      courtCodes: params.courtCodes,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      onlyVerified: params.onlyVerified ?? true,
      onlyQualifiedPrecedents: params.onlyQualifiedPrecedents,
      page: params.page || 1,
      pageSize: params.pageSize || 10,
    };

    const resp = searchEngine.search(query, tenantId);
    return {
      results: resp.results,
      total: resp.total,
      sourcesConsulted: resp.sourcesConsulted,
      executionTimeMs: resp.executionTimeMs,
    };
  }

}

/**
 * SERVIÇO CENTRAL DE PESQUISA JUDICIAL (ORQUESTRADOR)
 */
export class JudicialSearchService {
  private datajudProvider: DataJudSearchProvider;
  private tstAdapter: TstJurisprudenciaAdapter;
  private trt2Adapter: Trt2JurisprudenciaAdapter;
  private searchCache: Map<string, { result: any; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de cache em memória

  constructor() {
    this.datajudProvider = new DataJudSearchProvider();
    this.tstAdapter = new TstJurisprudenciaAdapter();
    this.trt2Adapter = new Trt2JurisprudenciaAdapter();
  }

  /**
   * Pesquisa jurisprudencial rica com filtros estruturados
   */
  public async searchJurisprudence(params: JurisprudenceSearchParams, tenantId?: string) {
    const cacheKey = `juris:${JSON.stringify(params)}:${tenantId || 'global'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const start = Date.now();
    const classification = LegalCompetenceClassifier.classify(params.query || '');
    const requestsTst = classification.isLaborDispute || params.courtCodes?.includes('TST');
    const requestsTrt2 = params.courtCodes?.includes('TRT2') === true;
    let activeTstDecisions = undefined as Awaited<ReturnType<TstJurisprudenciaAdapter['searchOfficialJurisprudence']>>['decisions'] | undefined;
    let trt2Diagnostic = undefined as Awaited<ReturnType<Trt2JurisprudenciaAdapter['searchOfficialJurisprudence']>>['diagnostic'] | undefined;

    if (requestsTst) {
      const officialResult = await this.tstAdapter.searchOfficialJurisprudence(params.query || params.caseNumber || '', 20);
      activeTstDecisions = officialResult.decisions.filter((decision) => decision.verificationStatus === 'VERIFIED_OFFICIAL');
      for (const decision of activeTstDecisions) {
        legalStorage.upsertDecision(decision);
      }
    }

    if (requestsTrt2) {
      const trt2Result = await this.trt2Adapter.searchOfficialJurisprudence(params.query || params.caseNumber || '');
      trt2Diagnostic = trt2Result.diagnostic;
    }

    const searchEngine = activeTstDecisions
      ? new LegalSearchEngine({ getDecisions: () => activeTstDecisions } as unknown as typeof legalStorage)
      : new LegalSearchEngine(legalStorage);

    // Ajusta o LegalSearchQuery canônico
    const query: LegalSearchQuery = {
      query: params.query || '',
      courtCodes: params.courtCodes && params.courtCodes.length > 0 ? params.courtCodes : undefined,
      documentTypes: params.documentTypes as any,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      onlyVerified: params.onlyVerified ?? false,
      onlyQualifiedPrecedents: params.onlyQualifiedPrecedents,
      page: params.page || 1,
      pageSize: params.pageSize || 12,
    };

    let response = searchEngine.search(query, tenantId);

    // Filtros adicionais na memória
    let filteredResults = [...response.results];

    if (params.courtOrgan && params.courtOrgan.trim()) {
      const organLower = params.courtOrgan.toLowerCase();
      filteredResults = filteredResults.filter(
        (r) => r.courtOrgan && r.courtOrgan.toLowerCase().includes(organLower)
      );
    }

    if (params.rapporteur && params.rapporteur.trim()) {
      const rapLower = params.rapporteur.toLowerCase();
      filteredResults = filteredResults.filter(
        (r) => r.rapporteur && r.rapporteur.toLowerCase().includes(rapLower)
      );
    }

    if (params.caseNumber && params.caseNumber.trim()) {
      const caseClean = params.caseNumber.replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
      filteredResults = filteredResults.filter((r) => {
        const rawClean = (r.caseNumber || '').replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
        const cnjClean = (r.normalizedCnjNumber || '').replace(/[^0-9]/g, '');
        return rawClean.includes(caseClean) || cnjClean.includes(caseClean);
      });
    }

    const payload = {
      query: params.query,
      total: filteredResults.length,
      page: params.page || 1,
      pageSize: params.pageSize || 12,
      results: filteredResults,
      sourcesConsulted: requestsTrt2
        ? Array.from(new Set([...response.sourcesConsulted, 'trt2-jurisprudencia']))
        : response.sourcesConsulted,
      executionTimeMs: Date.now() - start,
      timestamp: new Date().toISOString(),
      diagnostic: trt2Diagnostic,
    };

    this.setCache(cacheKey, payload);
    return payload;
  }

  /**
   * Pesquisa processual com conferência contra casos existentes no JurisFlow
   */
  public async searchProcess(
    params: {
      searchType: 'CNJ' | 'LAWYER_OAB' | 'PARTY_NAME';
      cnjNumber?: string;
      courtCode?: string;
      lawyerOab?: string;
      partyName?: string;
    },
    existingCases: Array<{ id: string; caseNumber: string; title: string }> = []
  ): Promise<JudicialProcessSearchResult | null> {
    const cacheKey = `proc:${params.searchType}:${params.cnjNumber || ''}:${params.courtCode || ''}:${params.lawyerOab || ''}:${params.partyName || ''}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return this.enrichWithExistingCaseStatus(cached, existingCases);
    }

    let result: JudicialProcessSearchResult | null = null;

    if (params.searchType === 'CNJ' && params.cnjNumber) {
      result = await this.datajudProvider.getProcessDetails(params.cnjNumber);
    } else {
      const results = await this.datajudProvider.searchProcess({
        courtCode: params.courtCode,
        lawyerOab: params.lawyerOab,
        partyName: params.partyName,
      });
      result = results[0] || null;
    }

    if (result) {
      result = this.enrichWithExistingCaseStatus(result, existingCases);
      this.setCache(cacheKey, result);
    }

    return result;
  }

  /**
   * Verifica se o processo pesquisado já está cadastrado no JurisFlow
   */
  private enrichWithExistingCaseStatus(
    result: JudicialProcessSearchResult,
    existingCases: Array<{ id: string; caseNumber: string; title: string }>
  ): JudicialProcessSearchResult {
    const resultDigits = result.normalizedCnjNumber.replace(/\D/g, '');
    const found = existingCases.find((c) => {
      const caseDigits = c.caseNumber.replace(/\D/g, '');
      return caseDigits === resultDigits || c.caseNumber === result.normalizedCnjNumber;
    });

    if (found) {
      return {
        ...result,
        isAlreadyImported: true,
        existingCaseId: found.id,
        existingCaseTitle: found.title,
      };
    }

    return {
      ...result,
      isAlreadyImported: false,
      existingCaseId: undefined,
      existingCaseTitle: undefined,
    };
  }

  public inspectDigitalCertificate(): never {
    throw new Error('CERTIFICATE_BRIDGE_NOT_IMPLEMENTED: nenhuma ponte local Web PKI/PKCS#11 foi instalada.');
  }

  /**
   * Retorna a matriz de conectividade e disponibilidade dos tribunais
   */
  public getAvailabilityMatrix(): CourtAvailabilityMatrixItem[] {
    const checkedAt = new Date().toISOString();
    const dataJudConfigured = Boolean(process.env.DATAJUD_API_KEY?.trim());
    return [
      {
        courtCode: 'DATAJUD', courtName: 'CNJ DataJud', jurisdiction: 'Nacional',
        jurisprudenceStatus: 'INDISPONIVEL',
        processStatus: dataJudConfigured ? 'DISPONIVEL_PUBLICO' : 'EM_DESENVOLVIMENTO',
        authenticationMethod: 'API_PUBLICA', officialUrl: 'https://api-publica.datajud.cnj.jus.br/',
        latencyMs: 0, lastCheckedAt: checkedAt, status: dataJudConfigured ? 'READY' : 'NOT_CONFIGURED',
        notes: dataJudConfigured ? 'Configurado; a disponibilidade real é verificada em cada consulta.' : 'DATAJUD_API_KEY ausente.',
      },
      {
        courtCode: 'STJ', courtName: 'STJ Dados Abertos', jurisdiction: 'Nacional',
        jurisprudenceStatus: 'DISPONIVEL_PARCIAL', processStatus: 'RESTRITO',
        authenticationMethod: 'DADOS_ABERTOS', officialUrl: 'https://dadosabertos.web.stj.jus.br/',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'PARTIAL',
        notes: 'Há dataset oficial local; cada precedente ainda exige evidência suficiente para receber selo verificado.',
      },
      {
        courtCode: 'TST', courtName: 'TST - Pesquisa Oficial de Jurisprudência', jurisdiction: 'Nacional',
        jurisprudenceStatus: 'DISPONIVEL_PARCIAL', processStatus: 'RESTRITO',
        authenticationMethod: 'API_PUBLICA', officialUrl: 'https://jurisprudencia.tst.jus.br/',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'PARTIAL',
        notes: 'Consulta pública em tempo real de acórdãos; cada resultado passa por verificação determinística.',
      },
      {
        courtCode: 'STF', courtName: 'STF - Repercussão Geral', jurisdiction: 'Nacional',
        jurisprudenceStatus: 'DISPONIVEL_PARCIAL', processStatus: 'RESTRITO',
        authenticationMethod: 'DADOS_ABERTOS', officialUrl: 'https://portal.stf.jus.br/jurisprudenciaRepercussao/',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'PARTIAL',
        notes: 'Temas de repercussão geral implementados com fail-closed; Súmulas Vinculantes ainda não implementadas.',
      },
      {
        courtCode: 'TRT2', courtName: 'TRT da 2ª Região - Jurisprudência PJe', jurisdiction: 'SP',
        jurisprudenceStatus: 'DISPONIVEL_PARCIAL', processStatus: 'DISPONIVEL_PUBLICO',
        authenticationMethod: 'PARCERIA_OFICIAL', officialUrl: 'https://pje.trt2.jus.br/jurisprudencia/',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'PARTIAL',
        notes: 'Portal e backend oficiais identificados; pesquisa jurisprudencial exige CAPTCHA interativo e não é contornada pelo JurisFlow.',
      },
      ...['TRT', 'TJ', 'TRF'].map((courtCode): CourtAvailabilityMatrixItem => ({
        courtCode, courtName: `${courtCode} - conector oficial`, jurisdiction: 'Brasil',
        jurisprudenceStatus: 'EM_DESENVOLVIMENTO', processStatus: 'EM_DESENVOLVIMENTO',
        authenticationMethod: 'PARCERIA_OFICIAL', officialUrl: '', latencyMs: 0,
        lastCheckedAt: checkedAt, status: 'NOT_IMPLEMENTED',
        notes: 'Conector oficial ainda não implementado; nenhuma consulta é simulada.',
      })),
    ];
  }

  private getFromCache(key: string): any | null {
    const item = this.searchCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.searchCache.delete(key);
      return null;
    }
    return item.result;
  }

  private setCache(key: string, result: any): void {
    if (this.searchCache.size > 200) {
      // Limpeza de itens expirados
      const now = Date.now();
      for (const [k, v] of this.searchCache.entries()) {
        if (now > v.expiresAt) this.searchCache.delete(k);
      }
    }
    this.searchCache.set(key, { result, expiresAt: Date.now() + this.CACHE_TTL_MS });
  }
}

export const judicialSearchService = new JudicialSearchService();
