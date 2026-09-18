import {
  JudicialProcessSearchResult,
  JudicialProcessMovementItem,
  JudicialProcessDocumentItem,
  JurisprudenceSearchParams,
  CourtAvailabilityMatrixItem,
} from '../../src/types/index.ts';
import { DataJudAdapter } from './adapters/DataJudAdapter.ts';
import { LegalSearchEngine } from './searchEngine.ts';
import { legalStorage } from './storage.ts';
import { LegalSearchQuery, LegalSearchResultItem } from './types.ts';

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

    if (queryResult.success && queryResult.metadata) {
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
        retrievedAt: new Date().toISOString(),
        sourceProvider: 'CNJ DataJud (Res. 331/CNJ)',
        sourceUrl: 'https://api-publica.datajud.cnj.jus.br/',
        evidenceState: 'VERIFIED_OFFICIAL',
        evidenceId: `DATAJUD:${normalized}:${meta.collectedAt}`,
        isAlreadyImported: false,
      };
    }

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
  private searchCache: Map<string, { result: any; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de cache em memória

  constructor() {
    this.datajudProvider = new DataJudSearchProvider();
  }

  /**
   * Pesquisa jurisprudencial rica com filtros estruturados
   */
  public async searchJurisprudence(params: JurisprudenceSearchParams, tenantId?: string) {
    const cacheKey = `juris:${JSON.stringify(params)}:${tenantId || 'global'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const start = Date.now();
    const searchEngine = new LegalSearchEngine(legalStorage);

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
      sourcesConsulted: response.sourcesConsulted,
      executionTimeMs: Date.now() - start,
      timestamp: new Date().toISOString(),
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
      ...['STF', 'TST', 'TRT', 'TJ', 'TRF'].map((courtCode): CourtAvailabilityMatrixItem => ({
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
