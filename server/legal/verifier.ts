import { CanonicalLegalDecision, PrecedentVerificationStatus } from './types.ts';
import { DataJudAdapter } from './adapters/DataJudAdapter.ts';
import { isAllowedOfficialUrl, isExactFalcaoDocumentUrl, isExactStfThemeDetailUrl, isExactStjDocumentUrl, isExactTstDocumentUrl, isExactTrf3DocumentUrl, isExactTrf4DocumentUrl, isExactTstNormativeCollectionUrl } from './officialSources.ts';

/**
 * PRECEDENT VERIFIER INDEPENDENTE DO MODELO
 *
 * Regra de Ouro: Prompt não é verificação.
 * Somente o código determinístico deste verificador pode conceder o status
 * 'VERIFIED_OFFICIAL' ou rejeitar citações inconsistentes/alucinadas.
 */

export interface VerificationResult {
  status: PrecedentVerificationStatus;
  isPassed: boolean;
  issues: string[];
  reasons: string[];
  verificationTimestamp: string;
  checksum: string;
}

export class PrecedentVerifier {
  /**
   * Executa a auditoria completa dos 10 requisitos técnicos obrigatórios
   */
  public static verifyDecision(decision: Partial<CanonicalLegalDecision>): VerificationResult {
    const issues: string[] = [];
    const reasons: string[] = [];
    const nowIso = new Date().toISOString();

    // 1. Oficialidade do Domínio ou Repositório
    const officialUrl = decision.officialUrl || '';
    const isOfficialDomain = isAllowedOfficialUrl(officialUrl, decision.courtCode);

    if (!isOfficialDomain) {
      issues.push('DOMINIO_NAO_OFICIAL: hostname não consta da lista exata permitida para o tribunal informado.');
    }

    // 2. Identificador Unívoco Verificável
    const rawCaseNum = decision.rawCaseNumber || '';
    if (!rawCaseNum.trim()) {
      issues.push('IDENTIFICADOR_AUSENTE: Processo, Súmula ou Tema sem número de identificação judicial.');
    }
    const qualifiedTypes = new Set([
      'SUMULA_VINCULANTE', 'SUMULA', 'TEMA_REPETITIVO', 'TEMA_REPERCUSSAO_GERAL',
      'IRDR', 'IAC', 'ORIENTACAO_JURISPRUDENCIAL', 'PRECEDENTE_NORMATIVO',
    ]);
    const hasJudicialIdentifier = Boolean(decision.normalizedCnjNumber)
      || /\b(?:REsp|AREsp|AgInt|EREsp|RE|HC|RMS|MS|CC|RR|AIRR|RO|Tema|S[úu]mula|OJ)\s*[\d.-]+/i.test(rawCaseNum)
      || (qualifiedTypes.has(decision.documentType || '') && Number.isInteger(decision.themeNumber));
    if (!hasJudicialIdentifier) {
      issues.push('IDENTIFICADOR_NAO_JUDICIAL: página de catálogo, dataset ou descrição institucional não é precedente judicial.');
    }
    if (/\/dataset(?:\/|$)/i.test(officialUrl) && decision.documentType === 'ACORDAO') {
      issues.push('URL_DE_CATALOGO: URL aponta para catálogo de dados, não para o acórdão ou precedente individualizado.');
    }

    // 3. Normalização Processual
    if (decision.normalizedCnjNumber) {
      const norm = DataJudAdapter.normalizeCnjNumber(decision.normalizedCnjNumber);
      if (!norm) {
        issues.push('CNJ_INVALIDO: Número CNJ informado não cumpre o padrão estrito de 20 dígitos NNNNNNN-DD.AAAA.J.TR.OOOO.');
      }
    }

    // 4. Tribunal e Órgão Julgador
    const normativeTypes = new Set([
      'SUMULA', 'SUMULA_VINCULANTE', 'ORIENTACAO_JURISPRUDENCIAL',
      'PRECEDENTE_NORMATIVO', 'ENUNCIADO',
    ]);
    const isNormativeDocument = normativeTypes.has(decision.documentType || '');
    if (!decision.courtCode || !decision.court || !decision.courtOrgan || (!isNormativeDocument && !decision.rapporteur)) {
      issues.push('METADADOS_JULGAMENTO_INCOMPLETOS: tribunal, órgão julgador e, quando aplicável, relator devem vir da fonte oficial.');
    }
    if (decision.courtCode === 'TST' && decision.judicialBranch !== 'TRABALHO') {
      issues.push('COMPETENCIA_INCOMPATIVEL: decisão do TST deve pertencer ao ramo TRABALHO.');
    }
    if (decision.sourceId === 'tst-jurisprudencia' && (!isExactTstDocumentUrl(officialUrl) || decision.courtCode !== 'TST')) {
      issues.push('FONTE_TRIBUNAL_INCOMPATIVEL: registro TST não aponta para documento individual oficial do TST.');
    }
    if (decision.sourceId === 'stj-dados-abertos' && (!isExactStjDocumentUrl(officialUrl) || decision.courtCode !== 'STJ')) {
      issues.push('FONTE_TRIBUNAL_INCOMPATIVEL: registro STJ não aponta para o inteiro teor individual oficial do STJ.');
    }
    if (decision.sourceId === 'stf-jurisprudencia' && (!isExactStfThemeDetailUrl(officialUrl, decision.themeNumber) || decision.courtCode !== 'STF')) {
      issues.push('FONTE_TRIBUNAL_INCOMPATIVEL: registro STF não aponta para o tema individual oficial do leading case.');
    }
    if (decision.sourceId === 'trf3-jurisprudencia' && (!isExactTrf3DocumentUrl(officialUrl) || decision.courtCode !== 'TRF3')) {
      issues.push('FONTE_TRIBUNAL_INCOMPATIVEL: registro TRF3 não aponta para acórdão individual oficial do TRF3.');
    }
    if (decision.sourceId === 'trf4-jurisprudencia' && (!isExactTrf4DocumentUrl(officialUrl) || decision.courtCode !== 'TRF4')) {
      issues.push('FONTE_TRIBUNAL_INCOMPATIVEL: registro TRF4 não aponta para inteiro teor individual oficial do eproc/TRF4.');
    }
    if (decision.sourceId === 'falcao-jurisprudencia' && (!isExactFalcaoDocumentUrl(officialUrl, decision.courtCode) || !/^TRT(?:[1-9]|1\d|2[0-4])$/.test(decision.courtCode))) {
      issues.push('FONTE_TRIBUNAL_INCOMPATIVEL: registro Falcão não aponta para acórdão individual oficial do TRT informado.');
    }
    if (decision.sourceId === 'tst-normativos' && (!isExactTstNormativeCollectionUrl(officialUrl) || decision.courtCode !== 'TST')) {
      issues.push('FONTE_TRIBUNAL_INCOMPATIVEL: verbete normativo TST não aponta para a coleção oficial permitida.');
    }

    // 5. Data de Julgamento, Publicação ou Disponibilidade Oficial (Não pode ser futura)
    const judgmentDate = decision.judgmentDate || decision.publicationDate || decision.availabilityDate;
    if (!judgmentDate) {
      issues.push('DATA_AUSENTE: Decisão sem data de julgamento ou publicação registrada.');
    } else {
      const parsedDate = new Date(judgmentDate);
      if (isNaN(parsedDate.getTime()) || parsedDate.getTime() > Date.now() + 86400000) {
        issues.push('DATA_INVALIDA: Data de julgamento futura ou em formato incompatível.');
      }
    }

    // 6. Ementa ou Tese Jurídica com Texto Íntegro
    const textBody = decision.officialHeadnote || decision.rulingThesis || '';
    if (textBody.trim().length < 25) {
      issues.push('CONTEUDO_INSUFICIENTE: Ementa oficial ausente ou truncada (menos de 25 caracteres).');
    }

    // 7. Situação de Vigência do Precedente (Overruling / Cancelamento)
    if (decision.precedentSituation === 'CANCELADO') {
      issues.push('PRECEDENTE_CANCELADO: Súmula ou Tese cancelada expressamente pelo tribunal.');
    } else if (decision.precedentSituation === 'SUPERADO') {
      issues.push('PRECEDENTE_SUPERADO: Precedente objeto de overruling superado por nova tese vinculante.');
    }

    // 8-10. Documento individual, hash recebido, horário e consulta originária.
    const evidence = (decision.rawPayloadPreserved as any)?.verificationEvidence;
    const individualDocument = evidence?.individualDocument;
    const originatingQuery = evidence?.originatingQuery;
    if (!individualDocument?.confirmed || individualDocument?.httpStatus !== 200) {
      issues.push('DOCUMENTO_INDIVIDUAL_NAO_CONFIRMADO: a consulta ao documento individual não retornou confirmação HTTP 200.');
    }
    if (individualDocument?.url !== officialUrl || !isAllowedOfficialUrl(individualDocument?.url || '', decision.courtCode)) {
      issues.push('DOCUMENTO_INDIVIDUAL_DIVERGENTE: a evidência não corresponde ao link oficial individualizado.');
    }
    if (!/^[a-f0-9]{64}$/i.test(individualDocument?.contentSha256 || '') || individualDocument?.contentSha256 !== decision.contentSha256) {
      issues.push('HASH_DOCUMENTO_AUSENTE: o SHA-256 deve ser calculado sobre o conteúdo recebido do documento oficial.');
    }
    if (!individualDocument?.fetchedAt || !decision.lastVerifiedAt) {
      issues.push('DATA_VERIFICACAO_AUSENTE: a confirmação oficial deve registrar data e hora.');
    }
    if (
      !originatingQuery?.id
      || !/^[a-f0-9]{64}$/i.test(originatingQuery?.querySha256 || '')
      || !/^[a-f0-9]{64}$/i.test(originatingQuery?.responseRecordSha256 || '')
      || !originatingQuery?.endpoint
    ) {
      issues.push('CONSULTA_ORIGINARIA_AUSENTE: o precedente deve registrar a consulta oficial que o recuperou.');
    }

    const computedHash = individualDocument?.contentSha256 || '';

    // Determinação do Status Canônico
    let status: PrecedentVerificationStatus = 'VERIFIED_OFFICIAL';

    if (decision.precedentSituation === 'CANCELADO') {
      status = 'CANCELLED';
      reasons.push('Precedente cancelado formalmente no tribunal de origem.');
    } else if (decision.precedentSituation === 'SUPERADO') {
      status = 'SUPERSEDED';
      reasons.push('Precedente superado por tese posterior (Overruling).');
    } else if (issues.length > 0) {
      status = 'REJECTED';
      reasons.push(...issues);
    } else {
      reasons.push('Validado em repositório oficial com integridade de hash e correspondência de tribunal.');
    }

    const isPassed = (status as string) === 'VERIFIED_OFFICIAL' || (status as string) === 'VERIFIED_CROSS_SOURCE';

    return {
      status,
      isPassed,
      issues,
      reasons,
      verificationTimestamp: nowIso,
      checksum: computedHash,
    };
  }
}
