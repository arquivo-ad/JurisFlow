/**
 * JURISFLOW ENTERPRISE LEGAL - MODELO CANÔNICO E TIPAGENS DE PRECEDENTES
 *
 * Estrutura formalizada de entidades jurídicas, fontes oficiais,
 * verificador de precedentes e proteção anti-alucinação.
 */

export type SourceIntegrationType =
  | 'OFFICIAL_API'
  | 'OFFICIAL_OPEN_DATA'
  | 'OFFICIAL_SEARCH'
  | 'OFFICIAL_DOCUMENT_DOWNLOAD'
  | 'MANUAL_VERIFICATION_ONLY'
  | 'UNAVAILABLE'
  | 'BLOCKED_BY_TERMS'
  | 'REQUIRES_PARTNERSHIP';

export type SourceConnectorStatus =
  | 'NOT_CONFIGURED'
  | 'READY'
  | 'CONNECTED'
  | 'SYNCING'
  | 'HEALTHY'
  | 'DEGRADED'
  | 'FAILED'
  | 'DISABLED'
  | 'MANUAL_ONLY'
  | 'SOURCE_UNAVAILABLE'
  | 'NOT_IMPLEMENTED'
  | 'PARTIAL';

export type PrecedentVerificationStatus =
  | 'VERIFIED_OFFICIAL'
  | 'VERIFIED_CROSS_SOURCE'
  | 'FOUND_UNVERIFIED'
  | 'DEMO_UNVERIFIED'
  | 'CONFLICTING_METADATA'
  | 'SOURCE_UNAVAILABLE'
  | 'DOCUMENT_REMOVED'
  | 'SUPERSEDED'
  | 'CANCELLED'
  | 'NOT_FOUND'
  | 'REJECTED';

export type PrecedentStrength =
  | 'VINCULANTE'            // Súmula Vinculante, Tema de Repercussão Geral, Repetitivo STJ/TST
  | 'QUALIFICADO'           // IRDR, IAC, Súmula STJ/STF/TST não vinculante
  | 'PERSUASIVO_SUPERIOR'   // Acórdão ordinário STF/STJ/TST
  | 'PERSUASIVO_REGIONAL'   // Acórdão TRF/TJ/TRT
  | 'MONOCRATICA'           // Decisão monocrática terminativa
  | 'INFORMATIVO';          // Informativo de jurisprudência

export type PrecedentSituation =
  | 'VIGENTE'
  | 'AFETADO'
  | 'SOBRESTADO'
  | 'JULGADO'
  | 'TRANSITADO'
  | 'SUPERADO'             // Overruling
  | 'DISTINGUIDO'          // Distinguishing
  | 'CANCELADO'
  | 'EM_REVISAO'
  | 'MODULADO';

export type LegalDocumentType =
  | 'ACORDAO'
  | 'DECISAO_MONOCRATICA'
  | 'SUMULA_VINCULANTE'
  | 'SUMULA'
  | 'TEMA_REPETITIVO'
  | 'TEMA_REPERCUSSAO_GERAL'
  | 'IRDR'
  | 'IAC'
  | 'ENUNCIADO'
  | 'ORIENTACAO_JURISPRUDENCIAL'
  | 'PRECEDENTE_NORMATIVO';

/**
 * Registro Canônico de Decisão Judicial (LegalDecision)
 */
export interface CanonicalLegalDecision {
  id: string;                          // Hash SHA-256 ou UUID determinístico
  tenantId?: string;                   // Se nulo/vazio, acervo público compartilhado; se preenchido, acervo privado
  sourceId: string;                    // ID no LegalSourceRegistry
  officialUrl: string;                 // URL canônica na fonte oficial
  fullTextUrl?: string;                // URL para download do inteiro teor
  court: string;                       // Nome por extenso do Tribunal
  courtCode: string;                   // Sigla do Tribunal (STJ, STF, TST, TJSP, etc.)
  judicialBranch: string;              // Ramo: SUPERIOR, FEDERAL, ESTADUAL, TRABALHO, ELEITORAL, MILITAR
  jurisdiction: string;                // BRASIL, SP, RJ, etc.
  courtOrgan?: string;                 // Órgão Julgador: 1ª Turma, Corte Especial, Seção, etc.
  processClass: string;                // Classe processual: REsp, RE, AgInt, etc.
  rawCaseNumber: string;               // Número do processo original da autuação
  normalizedCnjNumber?: string;        // Número CNJ no formato NNNNNNN-DD.AAAA.J.TR.OOOO
  alternativeNumber?: string;          // Número de registro interno no tribunal
  rapporteur: string;                  // Relator(a) do acórdão
  designatedRapporteur?: string;       // Redator do acórdão (se vencido o relator original)
  judgmentDate?: string;               // Data do julgamento (YYYY-MM-DD)
  publicationDate?: string;            // Data de publicação no DJe/DJEN (YYYY-MM-DD)
  availabilityDate?: string;           // Data de disponibilização (YYYY-MM-DD)
  officialHeadnote: string;            // Ementa oficial na íntegra
  fullText?: string;                   // Inteiro teor (opcional para economia de espaço)
  dispositiveSnippet?: string;         // Dispositivo final do julgado
  rulingThesis?: string;               // Tese jurídica fixada
  citedLegislation?: string[];         // Legislação citada (ex: "CPC/2015 art. 300", "CC art. 206")
  citedPrecedents?: string[];          // Súmulas ou temas referenciados
  tpuSubjects?: string[];              // Assuntos do TPU / CNJ
  documentType: LegalDocumentType;     // ACORDAO, DECISAO_MONOCRATICA, etc.
  result?: string;                     // Provido, Desprovido, Não Conhecido, etc.
  precedentSituation: PrecedentSituation;
  precedentStrength: PrecedentStrength;
  themeNumber?: number;                // Número do tema se repetitivo ou repercussão geral
  originCourt?: string;                // Tribunal de origem da causa
  language: string;                    // "pt-BR"
  contentSha256: string;               // Hash criptográfico da ementa e dados principais
  collectedAt: string;                 // Data/hora ISO de ingestão
  lastVerifiedAt: string;              // Data/hora ISO da última verificação oficial
  verificationStatus: PrecedentVerificationStatus;
  verificationBadge?: string;          // Badge oficial (ex: [OFICIAL STJ - VERIFICADO])
  rejectionReasons?: string[];         // Motivos caso rejeitado pelo PrecedentVerifier
  parserVersion: string;               // Versão do parser
  documentVersion: number;             // Versão incremental
  rawPayloadPreserved?: any;           // Dados brutos preservados para auditoria LGPD/Forense
}

/**
 * Precedente Qualificado (Temas, Súmulas Vinculantes, Repetitivos)
 */
export interface QualifiedPrecedent {
  id: string;
  sourceId: string;
  courtCode: string;
  documentType: 'SUMULA_VINCULANTE' | 'SUMULA' | 'TEMA_REPETITIVO' | 'TEMA_REPERCUSSAO_GERAL' | 'IRDR' | 'IAC';
  number: number;
  leadingCases: string[];              // Processos paradigmas (ex: ["REsp 1896678/SP"])
  title: string;
  thesis: string;                      // Enunciado da tese vinculante
  status: PrecedentSituation;          // VIGENTE, CANCELADO, etc.
  affectationDate?: string;
  judgmentDate?: string;
  transitDate?: string;
  modulation?: string;
  officialUrl: string;
  contentSha256: string;
  lastVerifiedAt: string;
  verificationStatus: PrecedentVerificationStatus;
}

/**
 * Metadados Processuais (DataJud) - Capa e Identidade Processual
 */
export interface CaseMetadata {
  normalizedCnjNumber: string;
  rawCaseNumber: string;
  courtCode: string;
  judicialDegree: string;              // G1, G2, TR, SUP
  processClass: { code: number; name: string };
  subjects: { code: number; name: string }[];
  courtOrgan: string;
  distributionDate?: string;
  value?: number;
  isConfidential: boolean;             // Processo em Segredo de Justiça
  lastMovementDate?: string;
  source: 'DATAJUD_CNJ';
  collectedAt: string;
}

/**
 * Movimentação Processual Oficial (DataJud)
 */
export interface CourtMovement {
  id: string;
  normalizedCnjNumber: string;
  movementCode: number;
  movementName: string;
  movementDate: string;
  complement?: string;
  source: 'DATAJUD_CNJ';
}

/**
 * Registro de Fonte no LegalSourceRegistry
 */
export interface LegalSourceRegistryItem {
  sourceId: string;
  name: string;
  courtCode: string;
  jurisdiction: string;
  sourceType: SourceIntegrationType;
  officialBaseUrl: string;
  documentationUrl: string;
  connectorStatus: SourceConnectorStatus;
  coverageStatus: string;
  verificationMethod: 'AUTOMATED_API' | 'OPEN_DATA_DIGEST' | 'HUMAN_VERIFICATION_LINK';
  termsStatus: 'COMPLIANT_PUBLIC_ACCESS' | 'TERMS_RESTRICTED' | 'MANUAL_ONLY';
  lastAttemptAt?: string;
  lastSuccessfulSyncAt?: string;
  lastFailureAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  lastCursor?: string;
  documentsDiscovered: number;
  documentsFetched: number;
  documentsValidated: number;
  documentsRejected: number;
  checksum?: string;
  latencyMs?: number;
  enabled: boolean;
  requiresCredential: boolean;
  credentialConfigured: boolean;       // Sem expor a chave
  reviewedBy?: string;
  reviewedAt?: string;
}

/**
 * Job de Sincronização Incremental Auditável
 */
export interface LegalSyncJob {
  jobId: string;
  sourceId: string;
  startedAt: string;
  finishedAt?: string;
  startCursor?: string;
  endCursor?: string;
  pagesQueried: number;
  documentsFound: number;
  documentsNew: number;
  documentsUpdated: number;
  documentsUnchanged: number;
  documentsRejected: number;
  documentsDuplicates: number;
  failures: number;
  retries: number;
  latencyMs: number;
  bytesTransferred: number;
  parserVersion: string;
  checksum?: string;
  status: 'QUEUED' | 'RUNNING' | 'PARTIAL_SUCCESS' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  errorMessage?: string;
  details?: string;
}

/**
 * Consulta de Pesquisa Jurisprudencial
 */
export interface LegalSearchQuery {
  query: string;
  courtCodes?: string[];
  jurisdictions?: string[];
  documentTypes?: LegalDocumentType[];
  dateFrom?: string | null;
  dateTo?: string | null;
  onlyVerified?: boolean;
  onlyQualifiedPrecedents?: boolean;
  includeFullText?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Item de Resultado de Pesquisa Jurisprudencial com Rastreabilidade
 */
export interface LegalSearchResultItem {
  id: string;
  sourceId: string;
  court: string;
  courtCode: string;
  judicialBranch: string;
  courtOrgan?: string;
  processClass: string;
  caseNumber: string;
  normalizedCnjNumber?: string;
  rapporteur: string;
  judgmentDate?: string;
  publicationDate?: string;
  headnote: string;
  relevantSnippet: string;
  rulingThesis?: string;
  themeNumber?: number;
  precedentStrength: PrecedentStrength;
  precedentSituation: PrecedentSituation;
  verificationStatus: PrecedentVerificationStatus;
  verificationBadge: string;
  officialUrl: string;
  fullTextUrl?: string;
  officialCitation: string;
  scoreTextual: number;
  scoreSemantic: number | null;
  scoreFinal: number;
  relevanceReason: string;
  verifiedAt: string;
}

export interface LegalQueryClassification {
  branch: 'TRABALHO' | 'CIVIL' | 'CONSUMIDOR' | 'BANCARIO' | 'TRIBUTARIO' | 'ADMINISTRATIVO' | 'CONSTITUCIONAL' | 'PENAL' | 'EMPRESARIAL' | 'GERAL';
  branchLabel: string;
  subject: string;
  competentCourts: string[];
  prioritySources: string[];
  complementarySources: string[];
  excludedSources: string[];
  processClass?: string;
  entities: string[];
  isLaborDispute: boolean;
  isSpecificCaseNumberQuery: boolean;
  isSpecificThemeOrSumulaQuery: boolean;
  extractedProcessNumber?: string;
  extractedThemeOrSumula?: {
    type: 'TEMA' | 'SUMULA' | 'SUMULA_VINCULANTE' | 'OJ';
    court?: string;
    number: number;
  };
}

export interface LegalSearchResponse {
  query: string;
  total: number;
  page: number;
  pageSize: number;
  results: LegalSearchResultItem[];
  sourcesConsulted: string[];
  executionTimeMs: number;
  timestamp: string;
  diagnostic?: OfficialSourceDiagnostic;
}

export type FailClosedReasonCode =
  | 'NO_RELEVANT_PRECEDENT'
  | 'SOURCE_UNAVAILABLE'
  | 'SOURCE_TIMEOUT'
  | 'SOURCE_NOT_SYNCHRONIZED'
  | 'DOCUMENT_FOUND_UNVERIFIED'
  | 'DOCUMENT_REJECTED'
  | 'MODEL_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface OfficialSourceDiagnostic {
  adapter: string;
  officialUrl: string;
  timestamp: string;
  httpStatus: number;
  latencyMs: number;
  documentsReceived: number;
  documentsNormalized: number;
  documentsRejected: number;
  rejectionReasons: string[];
  normalizedQueryNumber: string;
  connectorStatus: string;
}

export interface LegalResearchResult {
  answer: string;
  salutation?: string;
  summary?: string;
  searchResults: LegalSearchResultItem[];
  citationReport: CitationGuardReport;
  hasPrecedentsFound: boolean;
  verificationNotice: string;
  status: 'SUCCESS' | 'FAIL_CLOSED';
  failureCode?: FailClosedReasonCode;
  failureReason?: string;
  diagnostic?: OfficialSourceDiagnostic;
  isModelAvailable?: boolean;
  modelStatus?: 'MODEL_READY' | 'MODEL_UNAVAILABLE';
  modelName?: string;
}

/**
 * Relatório do CitationGuard para Bloqueio Anti-Alucinação
 */
export interface CitationGuardReport {
  isPassed: boolean;
  citationsFound: {
    rawCitation: string;
    sourceIdMatch?: string;
    decisionNumber?: string;
    isVerified: boolean;
    verificationStatus?: PrecedentVerificationStatus;
    reason?: string;
  }[];
  blockedCitationsCount: number;
  blockedReasons: string[];
  verifiedBadgesApplied: number;
  sanitizedText: string;
}
