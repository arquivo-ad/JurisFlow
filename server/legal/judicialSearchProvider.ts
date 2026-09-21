import {
  JudicialProcessSearchResult,
  JudicialProcessMovementItem,
  JudicialProcessDocumentItem,
  JurisprudenceSearchParams,
  CourtAvailabilityMatrixItem,
  DjenPublicationSearchParams,
  DjenPublicationSearchResponse,
} from '../../src/types/index.ts';
import { DataJudAdapter } from './adapters/DataJudAdapter.ts';
import { TstJurisprudenciaAdapter } from './adapters/TstJurisprudenciaAdapter.ts';
import { TstNormativeCollectionAdapter, TstNormativeType } from './adapters/TstNormativeCollectionAdapter.ts';
import { Trt2JurisprudenciaAdapter } from './adapters/Trt2JurisprudenciaAdapter.ts';
import { TjspJurisprudenciaAdapter } from './adapters/TjspJurisprudenciaAdapter.ts';
import { Trf3JurisprudenciaAdapter } from './adapters/Trf3JurisprudenciaAdapter.ts';
import { Trf4JurisprudenciaAdapter } from './adapters/Trf4JurisprudenciaAdapter.ts';
import { DjenPublicationsAdapter } from './adapters/DjenPublicationsAdapter.ts';
import { CourtFamilyProbeAdapter } from './adapters/CourtFamilyProbeAdapter.ts';
import { Trt15PrecedentsAdapter, type Trt15PrecedentType } from './adapters/Trt15PrecedentsAdapter.ts';
import { FalcaoJurisprudenciaAdapter } from './adapters/FalcaoJurisprudenciaAdapter.ts';
import { TjrsJurisprudenciaAdapter } from './adapters/TjrsJurisprudenciaAdapter.ts';
import { TjdftJurisprudenciaAdapter } from './adapters/TjdftJurisprudenciaAdapter.ts';
import { TjscJurisprudenciaAdapter } from './adapters/TjscJurisprudenciaAdapter.ts';
import { TjbaJurisprudenciaAdapter } from './adapters/TjbaJurisprudenciaAdapter.ts';
import { LegalSearchEngine } from './searchEngine.ts';
import { legalStorage } from './storage.ts';
import { CanonicalLegalDecision, LegalSearchQuery, LegalSearchResultItem } from './types.ts';
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
  private tstNormativeAdapter: TstNormativeCollectionAdapter;
  private trt2Adapter: Trt2JurisprudenciaAdapter;
  private tjspAdapter: TjspJurisprudenciaAdapter;
  private trf3Adapter: Trf3JurisprudenciaAdapter;
  private trf4Adapter: Trf4JurisprudenciaAdapter;
  private djenAdapter: DjenPublicationsAdapter;
  private courtFamilyProbeAdapter: CourtFamilyProbeAdapter;
  private trt15PrecedentsAdapter: Trt15PrecedentsAdapter;
  private falcaoAdapter: FalcaoJurisprudenciaAdapter;
  private tjrsAdapter: TjrsJurisprudenciaAdapter;
  private tjdftAdapter: TjdftJurisprudenciaAdapter;
  private tjscAdapter: TjscJurisprudenciaAdapter;
  private tjbaAdapter: TjbaJurisprudenciaAdapter;
  private searchCache: Map<string, { result: any; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de cache em memória

  constructor() {
    this.datajudProvider = new DataJudSearchProvider();
    this.tstAdapter = new TstJurisprudenciaAdapter();
    this.tstNormativeAdapter = new TstNormativeCollectionAdapter();
    this.trt2Adapter = new Trt2JurisprudenciaAdapter();
    this.tjspAdapter = new TjspJurisprudenciaAdapter();
    this.trf3Adapter = new Trf3JurisprudenciaAdapter();
    this.trf4Adapter = new Trf4JurisprudenciaAdapter();
    this.djenAdapter = new DjenPublicationsAdapter();
    this.courtFamilyProbeAdapter = new CourtFamilyProbeAdapter();
    this.trt15PrecedentsAdapter = new Trt15PrecedentsAdapter();
    this.falcaoAdapter = new FalcaoJurisprudenciaAdapter();
    this.tjrsAdapter = new TjrsJurisprudenciaAdapter();
    this.tjdftAdapter = new TjdftJurisprudenciaAdapter();
    this.tjscAdapter = new TjscJurisprudenciaAdapter();
    this.tjbaAdapter = new TjbaJurisprudenciaAdapter();
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
    const extractedNormative = classification.extractedThemeOrSumula;
    const requestsTstNormative = Boolean(
      extractedNormative
      && (!extractedNormative.court || extractedNormative.court === 'TST')
      && ['SUMULA', 'OJ', 'PN'].includes(extractedNormative.type)
    );
    const hasExplicitCourts = Boolean(params.courtCodes && params.courtCodes.length > 0);
    const requestsTst = ((classification.isLaborDispute && !hasExplicitCourts) || params.courtCodes?.includes('TST')) && !requestsTstNormative;
    const requestedTrtCodes = (params.courtCodes || []).filter((code) => /^TRT(?:[1-9]|1\d|2[0-4])$/.test(code));
    const requestsTrt2 = params.courtCodes?.includes('TRT2') === true;
    const requestsTjsp = params.courtCodes?.includes('TJSP') === true;
    const requestsTjrs = params.courtCodes?.includes('TJRS') === true;
    const requestsTjdft = params.courtCodes?.includes('TJDFT') === true;
    const requestsTjsc = params.courtCodes?.includes('TJSC') === true;
    const requestsTjba = params.courtCodes?.includes('TJBA') === true;
    const requestsTrf3 = params.courtCodes?.includes('TRF3') === true;
    const requestsTrf4 = params.courtCodes?.includes('TRF4') === true;
    const regionalSourcesConsulted: string[] = [];
    const nationalSourcesConsulted: string[] = [];
    let activeTstDecisions = undefined as CanonicalLegalDecision[] | undefined;
    let tstDiagnostic = undefined as Awaited<ReturnType<TstJurisprudenciaAdapter['searchOfficialJurisprudence']>>['diagnostic'] | undefined;
    let tstNormativeDiagnostic = undefined as Awaited<ReturnType<TstNormativeCollectionAdapter['searchNormative']>>['diagnostic'] | undefined;
    let trt2Diagnostic = undefined as Awaited<ReturnType<Trt2JurisprudenciaAdapter['searchOfficialJurisprudence']>>['diagnostic'] | undefined;
    let tjspDiagnostic = undefined as Awaited<ReturnType<TjspJurisprudenciaAdapter['searchOfficialJurisprudence']>>['diagnostic'] | undefined;
    let trf3Diagnostic = undefined as Awaited<ReturnType<Trf3JurisprudenciaAdapter['searchOfficialJurisprudence']>>['diagnostic'] | undefined;
    let trf4Diagnostic = undefined as Awaited<ReturnType<Trf4JurisprudenciaAdapter['searchOfficialJurisprudence']>>['diagnostic'] | undefined;
    let falcaoDiagnostic = undefined as Awaited<ReturnType<FalcaoJurisprudenciaAdapter['searchOfficialJurisprudence']>>['diagnostic'] | undefined;
    let tjrsDiagnostic = undefined as Awaited<ReturnType<TjrsJurisprudenciaAdapter['searchOfficialJurisprudence']>>['diagnostic'] | undefined;
    let activeTjrsDecisions: CanonicalLegalDecision[] | undefined;
    let tjdftDiagnostic = undefined as Awaited<ReturnType<TjdftJurisprudenciaAdapter['searchOfficialJurisprudence']>>['diagnostic'] | undefined;
    let tjscDiagnostic = undefined as Awaited<ReturnType<TjscJurisprudenciaAdapter['searchOfficialJurisprudence']>>['diagnostic'] | undefined;
    let tjbaDiagnostic = undefined as Awaited<ReturnType<TjbaJurisprudenciaAdapter['searchOfficialJurisprudence']>>['diagnostic'] | undefined;

    if (requestsTst) {
      const officialResult = await this.tstAdapter.searchOfficialJurisprudence(params.query || params.caseNumber || '', 20);
      tstDiagnostic = officialResult.diagnostic;
      nationalSourcesConsulted.push('tst-jurisprudencia');
      activeTstDecisions = officialResult.decisions.filter((decision) => decision.verificationStatus === 'VERIFIED_OFFICIAL');
      for (const decision of activeTstDecisions) {
        legalStorage.upsertDecision(decision);
      }
    }

    if (requestsTstNormative && extractedNormative) {
      const normativeType = extractedNormative.type as TstNormativeType;
      const normativeResult = await this.tstNormativeAdapter.searchNormative(normativeType, extractedNormative.number);
      tstNormativeDiagnostic = normativeResult.diagnostic;
      nationalSourcesConsulted.push('tst-normativos');
      activeTstDecisions = params.onlyVerified
        ? normativeResult.decisions.filter((decision) => decision.verificationStatus === 'VERIFIED_OFFICIAL')
        : normativeResult.decisions;
      for (const decision of normativeResult.decisions) {
        legalStorage.upsertDecision(decision);
      }
    }

    if (requestsTrt2) {
      const trt2Result = await this.trt2Adapter.searchOfficialJurisprudence(params.query || params.caseNumber || '');
      trt2Diagnostic = trt2Result.diagnostic;
      regionalSourcesConsulted.push('trt2-jurisprudencia');
    }

    for (const trtCode of requestedTrtCodes) {
      const falcaoResult = await this.falcaoAdapter.searchOfficialJurisprudence(
        params.query || params.caseNumber || '',
        trtCode,
        5
      );
      falcaoDiagnostic = falcaoDiagnostic ?? falcaoResult.diagnostic;
      regionalSourcesConsulted.push('falcao-jurisprudencia');
      for (const decision of falcaoResult.decisions) {
        if (decision.verificationStatus === 'VERIFIED_OFFICIAL') legalStorage.upsertDecision(decision);
      }
    }

    if (requestsTjsp) {
      const tjspResult = await this.tjspAdapter.searchOfficialJurisprudence(params.query || params.caseNumber || '');
      tjspDiagnostic = tjspResult.diagnostic;
      regionalSourcesConsulted.push('tjsp-jurisprudencia');
    }

    if (requestsTjrs) {
      const tjrsResult = await this.tjrsAdapter.searchOfficialJurisprudence(params.query || params.caseNumber || '', 10);
      tjrsDiagnostic = tjrsResult.diagnostic;
      regionalSourcesConsulted.push('tjrs-jurisprudencia');
      activeTjrsDecisions = tjrsResult.decisions;
    }

    if (requestsTjdft) {
      const tjdftResult = await this.tjdftAdapter.searchOfficialJurisprudence(params.query || params.caseNumber || '', 5);
      tjdftDiagnostic = tjdftResult.diagnostic;
      regionalSourcesConsulted.push('tjdft-jurisprudencia');
      for (const decision of tjdftResult.decisions) {
        if (decision.verificationStatus === 'VERIFIED_OFFICIAL') legalStorage.upsertDecision(decision);
      }
    }

    if (requestsTjsc) {
      const tjscResult = await this.tjscAdapter.searchOfficialJurisprudence(params.query || params.caseNumber || '', 10);
      tjscDiagnostic = tjscResult.diagnostic;
      regionalSourcesConsulted.push('tjsc-jurisprudencia');
      for (const decision of tjscResult.decisions) {
        if (decision.verificationStatus === 'VERIFIED_OFFICIAL') legalStorage.upsertDecision(decision);
      }
    }

    if (requestsTjba) {
      const tjbaResult = await this.tjbaAdapter.searchOfficialJurisprudence(params.query || params.caseNumber || '', 10);
      tjbaDiagnostic = tjbaResult.diagnostic;
      regionalSourcesConsulted.push('tjba-jurisprudencia');
      for (const decision of tjbaResult.decisions) {
        if (decision.verificationStatus === 'VERIFIED_OFFICIAL') legalStorage.upsertDecision(decision);
      }
    }

    if (requestsTrf3) {
      const trf3Result = await this.trf3Adapter.searchOfficialJurisprudence(params.query || params.caseNumber || '', 10);
      trf3Diagnostic = trf3Result.diagnostic;
      regionalSourcesConsulted.push('trf3-jurisprudencia');
      for (const decision of trf3Result.decisions) {
        if (decision.verificationStatus === 'VERIFIED_OFFICIAL') legalStorage.upsertDecision(decision);
      }
    }

    if (requestsTrf4) {
      const trf4Result = await this.trf4Adapter.searchOfficialJurisprudence(params.query || params.caseNumber || '', 10);
      trf4Diagnostic = trf4Result.diagnostic;
      regionalSourcesConsulted.push('trf4-jurisprudencia');
      for (const decision of trf4Result.decisions) {
        if (decision.verificationStatus === 'VERIFIED_OFFICIAL') legalStorage.upsertDecision(decision);
      }
    }

    let transientDecisions: CanonicalLegalDecision[] | undefined = activeTstDecisions;
    if (!transientDecisions && activeTjrsDecisions) {
      const otherCourts = (params.courtCodes || []).filter((code) => code !== 'TJRS');
      const persisted = otherCourts.length > 0
        ? legalStorage.getDecisions({ tenantId, courtCodes: otherCourts, onlyVerified: params.onlyVerified })
        : [];
      transientDecisions = [...persisted, ...activeTjrsDecisions];
    }

    const searchEngine = transientDecisions
      ? new LegalSearchEngine({ getDecisions: () => transientDecisions! } as unknown as typeof legalStorage)
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
      sourcesConsulted: (regionalSourcesConsulted.length > 0 || nationalSourcesConsulted.length > 0)
        ? Array.from(new Set([...response.sourcesConsulted, ...nationalSourcesConsulted, ...regionalSourcesConsulted]))
        : response.sourcesConsulted,
      executionTimeMs: Date.now() - start,
      timestamp: new Date().toISOString(),
      diagnostic: tjbaDiagnostic ?? tjscDiagnostic ?? tjdftDiagnostic ?? tjrsDiagnostic ?? falcaoDiagnostic ?? trf4Diagnostic ?? trf3Diagnostic ?? tjspDiagnostic ?? trt2Diagnostic ?? tstNormativeDiagnostic ?? tstDiagnostic,
    };

    this.setCache(cacheKey, payload);
    return payload;
  }

  public async searchDjenPublications(params: DjenPublicationSearchParams): Promise<DjenPublicationSearchResponse> {
    return this.djenAdapter.searchPublications(params);
  }

  public async probeCourtFamilies(courtCode?: string) {
    return courtCode
      ? [await this.courtFamilyProbeAdapter.probe(courtCode)]
      : this.courtFamilyProbeAdapter.probeAll();
  }

  public async listTrt15QualifiedPrecedents(type: Trt15PrecedentType) {
    return this.trt15PrecedentsAdapter.list(type);
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
    throw new Error('SERVER_CERTIFICATE_UPLOAD_DISABLED: certificados devem ser inspecionados exclusivamente pela ponte local em 127.0.0.1:43119.');
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
        notes: 'Consulta pública em tempo real de acórdãos + coleção oficial de Súmulas/OJs/Precedentes Normativos; cada evidência passa por verificação determinística.',
      },
      {
        courtCode: 'FALCAO', courtName: 'Falcão - Jurisprudência Nacional da Justiça do Trabalho', jurisdiction: 'Nacional',
        jurisprudenceStatus: 'DISPONIVEL', processStatus: 'RESTRITO',
        authenticationMethod: 'API_PUBLICA', officialUrl: 'https://jurisprudencia.jt.jus.br/',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'READY',
        notes: 'Repositório oficial nacional dos TRT1 a TRT24. Pesquisa pública por tribunal com confirmação do acórdão individual e SHA-256; HTTP 429 é tratado em fail-closed.',
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
      {
        courtCode: 'TJSP', courtName: 'TJSP - Consulta de Jurisprudência e-SAJ', jurisdiction: 'SP',
        jurisprudenceStatus: 'DISPONIVEL_PARCIAL', processStatus: 'DISPONIVEL_PUBLICO',
        authenticationMethod: 'PARCERIA_OFICIAL', officialUrl: 'https://esaj.tjsp.jus.br/cjsg/consultaCompleta.do',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'PARTIAL',
        notes: 'Portal oficial identificado; pesquisa completa exige reCAPTCHA/CAPTCHA interativo e não é contornada pelo JurisFlow.',
      },
      {
        courtCode: 'TJRS', courtName: 'TJRS - Pesquisa Oficial Solr', jurisdiction: 'RS',
        jurisprudenceStatus: 'DISPONIVEL_PARCIAL', processStatus: 'DISPONIVEL_PUBLICO',
        authenticationMethod: 'DADOS_ABERTOS', officialUrl: 'https://www.tjrs.jus.br/buscas/jurisprudencia/',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'PARTIAL',
        notes: 'Pesquisa oficial automatizada com CNJ, relator, órgão julgador, datas, ementa e inteiro teor em Base64. Sem selo VERIFIED_OFFICIAL enquanto não houver URL individual oficial estável.',
      },
      {
        courtCode: 'TJMG', courtName: 'TJMG - Jurisprudência legado / eproc', jurisdiction: 'MG',
        jurisprudenceStatus: 'DISPONIVEL_PARCIAL', processStatus: 'DISPONIVEL_PUBLICO',
        authenticationMethod: 'DADOS_ABERTOS', officialUrl: 'https://www5.tjmg.jus.br/jurisprudencia/',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'PARTIAL',
        notes: 'Busca legada exige CAPTCHA; o novo eproc reconhece a ação de jurisprudência, mas atualmente retorna falha de processamento sem formulário público. Automação permanece fail-closed.',
      },
      {
        courtCode: 'TJRJ', courtName: 'TJRJ - eJURIS / eproc', jurisdiction: 'RJ',
        jurisprudenceStatus: 'DISPONIVEL_PARCIAL', processStatus: 'DISPONIVEL_PUBLICO',
        authenticationMethod: 'DADOS_ABERTOS', officialUrl: 'https://www3.tjrj.jus.br/ejuris/ConsultarJurisprudencia.aspx',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'PARTIAL',
        notes: 'Consulta pública existe, mas desde 04/02/2026 há duas bases: eJURIS legado e eproc. eJURIS usa reCAPTCHA v3 no fluxo de pesquisa e eproc 2G redireciona para SSO; automação permanece fail-closed.',
      },
      {
        courtCode: 'TJBA', courtName: 'TJBA - Jurisprudência GraphQL', jurisdiction: 'BA',
        jurisprudenceStatus: 'DISPONIVEL', processStatus: 'DISPONIVEL_PUBLICO',
        authenticationMethod: 'API_PUBLICA', officialUrl: 'https://jurisprudenciaws.tjba.jus.br/graphql',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'READY',
        notes: 'GraphQL público oficial com busca estruturada e inteiro teor individual por hash UUID, confirmado com SHA-256.',
      },
      {
        courtCode: 'TJSC', courtName: 'TJSC - Jurisprudência eproc', jurisdiction: 'SC',
        jurisprudenceStatus: 'DISPONIVEL', processStatus: 'DISPONIVEL_PUBLICO',
        authenticationMethod: 'DADOS_ABERTOS', officialUrl: 'https://eprocwebcon.tjsc.jus.br/consulta1g/',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'READY',
        notes: 'Pesquisa pública eproc com confirmação do inteiro teor individual oficial, URL canônica e SHA-256.',
      },
      {
        courtCode: 'TJDFT', courtName: 'TJDFT - API Pública de Jurisprudência', jurisdiction: 'DF',
        jurisprudenceStatus: 'DISPONIVEL', processStatus: 'DISPONIVEL_PUBLICO',
        authenticationMethod: 'API_PUBLICA', officialUrl: 'https://jurisdf.tjdft.jus.br/api/v1/pesquisa',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'READY',
        notes: 'API pública oficial documentada; cada resultado é reconfirmado por UUID e passa por SHA-256 e verificação determinística.',
      },
      {
        courtCode: 'TRF3', courtName: 'TRF3 - Pesquisa de Jurisprudência', jurisdiction: '3ª Região',
        jurisprudenceStatus: 'DISPONIVEL', processStatus: 'DISPONIVEL_PUBLICO',
        authenticationMethod: 'DADOS_ABERTOS', officialUrl: 'https://web.trf3.jus.br/jurisprudencia/',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'READY',
        notes: 'Pesquisa oficial automatizada com confirmação do acórdão individual e SHA-256 do documento recebido.',
      },
      {
        courtCode: 'TRF4', courtName: 'TRF4 - Jurisprudência eproc', jurisdiction: '4ª Região',
        jurisprudenceStatus: 'DISPONIVEL', processStatus: 'RESTRITO',
        authenticationMethod: 'DADOS_ABERTOS', officialUrl: 'https://jurisprudencia.trf4.jus.br/',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'READY',
        notes: 'Pesquisa pública eproc automatizada com confirmação do inteiro teor individual oficial e SHA-256. Consulta processual autenticada continua fora deste conector.',
      },
      {
        courtCode: 'TRT15', courtName: 'TRT15 - Precedentes PJe-JT', jurisdiction: '15ª Região',
        jurisprudenceStatus: 'DISPONIVEL_PARCIAL', processStatus: 'RESTRITO',
        authenticationMethod: 'DADOS_ABERTOS', officialUrl: 'https://pje.trt15.jus.br/precedentesWeb/pages/public/TemaLista.seam?tipo=IRDR',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'PARTIAL',
        notes: 'Índice público oficial de IRDR/IAC integrado com hash da página e dos registros. Itens permanecem sem selo individual; pesquisa jurisprudencial geral exige reCAPTCHA.',
      },
      {
        courtCode: 'TJPR', courtName: 'TJPR - Projudi', jurisdiction: 'PR',
        jurisprudenceStatus: 'DISPONIVEL_PARCIAL', processStatus: 'DISPONIVEL_PUBLICO',
        authenticationMethod: 'PARCERIA_OFICIAL', officialUrl: 'https://consulta.tjpr.jus.br/projudi_consulta/paginaPrincipal.jsp',
        latencyMs: 0, lastCheckedAt: checkedAt, status: 'PARTIAL',
        notes: 'Família Projudi identificada. Consulta processual e precedentes exigem reCAPTCHA no submit; JurisFlow não contorna o desafio interativo.',
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
