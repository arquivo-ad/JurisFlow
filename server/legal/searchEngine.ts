import { CanonicalLegalDecision, LegalSearchQuery, LegalSearchResponse, LegalSearchResultItem } from './types.ts';
import { LegalKnowledgeStorage } from './storage.ts';
import { LegalCompetenceClassifier } from './classifier.ts';

/**
 * MOTOR DE PESQUISA JURISPRUDENCIAL COM ADMISSÃO POR PERTINÊNCIA E ZERO-HALLUCINATION
 *
 * Regras Obrigatórias de Engenharia Forense:
 * 1. Filtro Eliminatório de Pertinência ANTES de pontuação de autoridade.
 * 2. Precedente vinculante (Art. 927 CPC) NUNCA compensa falta de pertinência material.
 * 3. Precedentes vinculantes atuam estritamente como DESEMPATE (+5 / +3) entre os já admitidos.
 * 4. Consulta trabalhista (CLT / verbas rescisórias / fundação) NUNCA admite precedente bancário ou cível do STJ.
 * 5. Se não houver embedding real calculado, scoreSemantic é retornado como null (sem fake score).
 * 6. sourcesConsulted é gerado dinamicamente com base nas consultas reais.
 */

// Stop words e termos meramente funcionais/procedimentais
const LEGAL_STOP_WORDS = new Set([
  'de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'uma',
  'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'foi', 'ao',
  'ele', 'das', 'tem', 'à', 'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'nos',
  'já', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'era',
  'depois', 'sem', 'mesmo', 'aos', 'ter', 'seus', 'quem', 'nas', 'me', 'esse',
  'eles', 'estão', 'você', 'tinha', 'foram', 'essa', 'num', 'nem', 'suas', 'meu',
  'às', 'minha', 'têm', 'numa', 'pelos', 'elas', 'havia', 'seja', 'qual', 'será',
  'nós', 'tenho', 'fui', 'todas', 'todos', 'direito', 'direitos', 'existem',
  'jurisprudências', 'jurisprudencia', 'jurisprudência', 'precedente', 'precedentes',
  'acórdão', 'acórdãos', 'processo', 'decisão', 'sobre', 'caso', 'artigo', 'lei',
  'qual', 'tese', 'tema', 'enunciado', 'tribunal', 'stj', 'stf', 'tst', 'trt'
]);

export class LegalSearchEngine {
  private storage: LegalKnowledgeStorage;

  constructor(storage: LegalKnowledgeStorage) {
    this.storage = storage;
  }

  public search(queryInput: LegalSearchQuery, tenantId?: string): LegalSearchResponse {
    const start = Date.now();
    const query = (queryInput.query || '').trim();
    const queryLower = query.toLowerCase();

    // 1. Classificação Prévia de Ramo, Matéria e Competência
    const classification = LegalCompetenceClassifier.classify(query);

    // Extrai tokens substantivos da consulta do usuário
    const allTokens = queryLower
      .replace(/[^\w\sáéíóúâêîôûãõç]/gi, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3);

    const substantiveTokens = allTokens.filter((t) => !LEGAL_STOP_WORDS.has(t));

    // Recupera acervo canônico respeitando isolamento multi-tenant (excluindo dados de demonstração)
    const candidates = this.storage.getDecisions({
      tenantId,
      courtCodes: queryInput.courtCodes,
      onlyVerified: queryInput.onlyVerified,
      includeDemo: false, // Proibição absoluta de sementes demo no fluxo de pesquisa
    });

    const scoredItems: Array<{
      decision: CanonicalLegalDecision;
      score: number;
      pertinenceReason: string;
      substantiveMatches: string[];
    }> = [];

    const sourcesActuallyConsulted: Set<string> = new Set();

    for (const d of candidates) {
      // Bloqueio rigoroso de sementes não verificadas / demo
      if (d.verificationStatus === 'DEMO_UNVERIFIED' || (d as any).environment === 'development') {
        continue;
      }

      // Regra de Competência: Se for lide trabalhista, excluir precedentes de competência estranha (STJ bancário, civil, tributário)
      if (classification.isLaborDispute) {
        if (d.courtCode === 'STJ' || d.judicialBranch === 'CIVIL' || d.judicialBranch === 'BANCARIO' || d.judicialBranch === 'CONSUMIDOR') {
          continue; // Incompetência em razão da matéria (CF/88, arts. 105 e 114)
        }
      }

      // Filtros estruturados opcionais
      if (queryInput.documentTypes && queryInput.documentTypes.length > 0) {
        if (!queryInput.documentTypes.includes(d.documentType)) continue;
      }
      if (queryInput.onlyQualifiedPrecedents) {
        if (d.precedentStrength !== 'VINCULANTE' && d.precedentStrength !== 'QUALIFICADO') {
          continue;
        }
      }
      if (queryInput.dateFrom && d.judgmentDate && d.judgmentDate < queryInput.dateFrom) {
        continue;
      }
      if (queryInput.dateTo && d.judgmentDate && d.judgmentDate > queryInput.dateTo) {
        continue;
      }

      // -------------------------------------------------------------
      // 2. FILTRO ELIMINATÓRIO DE PERTINÊNCIA
      // O precedente SOMENTE entra no ranking se cumprir ao menos UMA condição:
      // (1) Número de processo coincide exatamente
      // (2) Número de tema ou súmula coincide exatamente
      // (3) Correspondência material suficiente entre assunto, tese e termos substantivos
      // (4) Similaridade semântica real acima de limiar (null no momento)
      // -------------------------------------------------------------

      let condition1 = false; // Processo exato
      let condition2 = false; // Tema/Súmula exato
      let condition3 = false; // Correspondência material substantiva
      const condition4 = false; // Semântica real (embeddings)

      const rawCaseClean = d.rawCaseNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cnjClean = (d.normalizedCnjNumber || '').replace(/[^0-9]/g, '');

      // Condição 1: Processo informado pelo usuário coincide exatamente
      if (classification.isSpecificCaseNumberQuery && classification.extractedProcessNumber) {
        const queryProcClean = classification.extractedProcessNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
        const queryDigits = classification.extractedProcessNumber.replace(/[^0-9]/g, '');
        const docDigits = d.rawCaseNumber.replace(/[^0-9]/g, '');
        if (
          (queryProcClean.length >= 6 && (rawCaseClean === queryProcClean || cnjClean === queryDigits)) ||
          (queryDigits.length >= 5 && docDigits === queryDigits)
        ) {
          condition1 = true;
        }
      }

      // Condição 2: Tema ou Súmula coincide exatamente
      if (classification.isSpecificThemeOrSumulaQuery && classification.extractedThemeOrSumula) {
        const { type, number, court } = classification.extractedThemeOrSumula;
        if (type === 'TEMA' && d.themeNumber === number) {
          if (!court || court === d.courtCode) {
            condition2 = true;
          }
        } else if ((type === 'SUMULA' || type === 'SUMULA_VINCULANTE') && d.themeNumber === number) {
          if (!court || court === d.courtCode) {
            condition2 = true;
          }
        } else if (d.rawCaseNumber.toLowerCase().includes(`tema ${number}`) || d.rawCaseNumber.toLowerCase().includes(`súmula ${number}`)) {
          condition2 = true;
        }
      }

      // Condição 3: Correspondência material suficiente
      const textCorpus = `${d.rulingThesis || ''} ${d.officialHeadnote} ${d.rawCaseNumber}`.toLowerCase();
      const matchedSubstantive: string[] = [];

      for (const token of substantiveTokens) {
        if (textCorpus.includes(token)) {
          matchedSubstantive.push(token);
        }
      }

      // Verifica correspondência de institutos jurídicos da classificação
      let matchedEntitiesCount = 0;
      for (const entity of classification.entities) {
        const entityWords = entity.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        const hasEntity = entityWords.every((w) => textCorpus.includes(w));
        if (hasEntity) {
          matchedEntitiesCount++;
          matchedSubstantive.push(entity);
        }
      }

      let leadingLaborConceptCount = 0;
      if (classification.isLaborDispute) {
        const leadingHeadnote = `${d.rulingThesis || ''} ${d.officialHeadnote.slice(0, 1200)}`
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const leadingConcepts = [
          /\b(?:clt|celetist\w*)\b/,
          /\bfundacao\s+publica\b/,
          /\bcargo\s+(?:em\s+comissao|de\s+confianca)\b|\bfuncao\s+de\s+confianca\b/,
          /\b(?:dispensa|demissao|rescisao)\b/,
          /\bverbas?\s+rescisorias\b/,
        ];
        leadingLaborConceptCount = leadingConcepts.filter((pattern) => pattern.test(leadingHeadnote)).length;
      }

      // Regra de Admissibilidade Material:
      // Exige ao menos 2 termos substantivos coincidentes OU 1 instituto jurídico completo
      // E proíbe falso match genérico
      const isExactIdentifierQuery = classification.isSpecificCaseNumberQuery || classification.isSpecificThemeOrSumulaQuery;
      if (!isExactIdentifierQuery && (matchedEntitiesCount >= 1 || (substantiveTokens.length > 0 && matchedSubstantive.length >= 2))) {
        // Se a consulta possui entidades específicas da área trabalhista, exige que a tese ou ementa tenha aderência material
        if (classification.isLaborDispute) {
          const hasLaborConcept = /\b(clt|trabalhador|empregado|cargo de confiança|função de confiança|fundação|verbas rescisórias|rescisão|dispensa|tst|trt)\b/i.test(
            textCorpus
          );
          if (hasLaborConcept) {
            condition3 = true;
          }
        } else if (classification.branch === 'BANCARIO') {
          const hasBankingConcept = /\b(juros|bancário|banco|tarifa|alienação fiduciária|financiamento|taxa)\b/i.test(textCorpus);
          if (hasBankingConcept) {
            condition3 = true;
          }
        } else {
          condition3 = true;
        }
      }

      // PORTÃO ELIMINATÓRIO: Se nenhuma condição for cumprida, o precedente é SUMARIAMENTE DESCARTADO
      const passesPertinenceFilter = condition1 || condition2 || condition3 || condition4;
      if (!passesPertinenceFilter) {
        continue;
      }

      const officialUrlIsDirect = /^https:\/\//i.test(d.officialUrl)
        && !/\/processo\/pesquisa\/?\?termo=/i.test(d.officialUrl);
      const payload = d.rawPayloadPreserved as any;
      const hasOfficialDatasetEvidence = d.sourceId === 'stj-dados-abertos'
        && Array.isArray(payload?.processosRow)
        && Array.isArray(payload?.temasRow)
        && /^[a-f0-9]{64}$/i.test(payload?.processosSha256 || '')
        && /^[a-f0-9]{64}$/i.test(payload?.temasSha256 || '');
      const hasOfficialTstApiEvidence = d.sourceId === 'tst-jurisprudencia'
        && Boolean(payload?.officialApiRecordId)
        && /^https:\/\/jurisprudencia-backend\.tst\.jus\.br\/rest\/pesquisa-textual(?:\/|$)/i.test(payload?.officialApiEndpoint || '')
        && /^[a-f0-9]{64}$/i.test(payload?.officialQuerySha256 || '')
        && /^[a-f0-9]{64}$/i.test(payload?.officialResponseSha256 || '');
      const hasAuditableEvidence =
        d.verificationStatus === 'VERIFIED_OFFICIAL'
        && /^[a-f0-9]{64}$/i.test(d.contentSha256)
        && Boolean(d.lastVerifiedAt)
        && Boolean(d.rawPayloadPreserved)
        && (officialUrlIsDirect || hasOfficialDatasetEvidence || hasOfficialTstApiEvidence)
        && !/^Espelhos de ac[óo]rd[ãa]os\b/i.test(d.rawCaseNumber)
        && !/\/dataset(?:\/|$)/i.test(d.officialUrl);

      if (queryInput.onlyVerified && !hasAuditableEvidence) continue;
      sourcesActuallyConsulted.add(d.sourceId);

      // -------------------------------------------------------------
      // 3. PONTUAÇÃO (APENAS PARA OS QUE PASSARAM NO FILTRO DE PERTINÊNCIA)
      // -------------------------------------------------------------
      let score = 0;
      const reasons: string[] = [];

      if (condition1) {
        score += 100;
        reasons.push('Correspondência exata do número do processo/CNJ');
      }
      if (condition2) {
        score += 80;
        reasons.push(`Correspondência direta de Tema/Súmula pesquisada (${d.themeNumber})`);
      }
      if (condition3) {
        const uniqueMaterialMatches = Array.from(new Set(matchedSubstantive));
        const basePertinenceScore = Math.min(
          90,
          uniqueMaterialMatches.length * 4 + matchedEntitiesCount * 12 + leadingLaborConceptCount * 15
        );
        score += basePertinenceScore;
        reasons.push(
          `Correspondência temática material confirmada: ${uniqueMaterialMatches.slice(0, 6).join(', ')}`
          + (leadingLaborConceptCount > 0 ? ` • ${leadingLaborConceptCount} conceito(s) central(is) na abertura da ementa` : '')
        );
      }

      // Autoridade como DESEMPATE (Somente +5 para Vinculante e +3 para Qualificado)
      if (d.precedentStrength === 'VINCULANTE') {
        score += 5;
        reasons.push('Desempate: Eficácia vinculante (Art. 927 CPC)');
      } else if (d.precedentStrength === 'QUALIFICADO') {
        score += 3;
        reasons.push('Desempate: Precedente qualificado');
      }

      // Penalização de precedentes cancelados ou superados
      if (d.precedentSituation === 'CANCELADO' || d.precedentSituation === 'SUPERADO') {
        score -= 60;
        reasons.push(`Alerta de vigência: Precedente ${d.precedentSituation}`);
      }

      scoredItems.push({
        decision: d,
        score: Math.max(1, score),
        pertinenceReason: reasons.join(' • '),
        substantiveMatches: matchedSubstantive,
      });
    }

    // Ordenação estrita por pontuação final de pertinência
    scoredItems.sort((a, b) => b.score - a.score);

    const page = queryInput.page || 1;
    const pageSize = queryInput.pageSize || 10;
    const paginated = scoredItems.slice((page - 1) * pageSize, page * pageSize);

    const results: LegalSearchResultItem[] = paginated.map((item) => {
      const d = item.decision;
      const officialUrlIsDirect = /^https:\/\//i.test(d.officialUrl)
        && !/\/processo\/pesquisa\/?\?termo=/i.test(d.officialUrl);
      const payload = d.rawPayloadPreserved as any;
      const hasOfficialDatasetEvidence = d.sourceId === 'stj-dados-abertos'
        && Array.isArray(payload?.processosRow)
        && Array.isArray(payload?.temasRow)
        && /^[a-f0-9]{64}$/i.test(payload?.processosSha256 || '')
        && /^[a-f0-9]{64}$/i.test(payload?.temasSha256 || '');
      const hasOfficialTstApiEvidence = d.sourceId === 'tst-jurisprudencia'
        && Boolean(payload?.officialApiRecordId)
        && /^https:\/\/jurisprudencia-backend\.tst\.jus\.br\/rest\/pesquisa-textual(?:\/|$)/i.test(payload?.officialApiEndpoint || '')
        && /^[a-f0-9]{64}$/i.test(payload?.officialQuerySha256 || '')
        && /^[a-f0-9]{64}$/i.test(payload?.officialResponseSha256 || '');
      const hasAuditableEvidence = d.verificationStatus === 'VERIFIED_OFFICIAL'
        && /^[a-f0-9]{64}$/i.test(d.contentSha256)
        && Boolean(d.lastVerifiedAt)
        && Boolean(d.rawPayloadPreserved)
        && (officialUrlIsDirect || hasOfficialDatasetEvidence || hasOfficialTstApiEvidence)
        && !/^Espelhos de ac[óo]rd[ãa]os\b/i.test(d.rawCaseNumber)
        && !/\/dataset(?:\/|$)/i.test(d.officialUrl);
      const evidenceState = hasAuditableEvidence
        ? 'VERIFIED_OFFICIAL'
        : d.officialUrl
          ? 'FOUND_PENDING_REVIEW'
          : 'NOT_VERIFIED_PROHIBITED';
      const citationBadge = evidenceState === 'VERIFIED_OFFICIAL'
        ? `[OFICIAL ${d.courtCode} - VERIFICADO]`
        : evidenceState === 'FOUND_PENDING_REVIEW'
          ? `[${d.courtCode} - ENCONTRADO, PENDENTE DE CONFERÊNCIA]`
          : `[${d.courtCode} - NÃO VERIFICADO — PROIBIDO USAR EM PEÇA]`;

      const officialCitation = `${d.courtCode}, ${d.rawCaseNumber}, Rel. ${d.rapporteur}, ${d.courtOrgan || ''}, julgado em ${d.judgmentDate || 'N/D'}, DJe ${d.publicationDate || 'N/D'}`;

      return {
        id: d.id,
        sourceId: d.sourceId,
        court: d.court,
        courtCode: d.courtCode,
        judicialBranch: d.judicialBranch,
        courtOrgan: d.courtOrgan,
        processClass: d.processClass,
        caseNumber: d.rawCaseNumber,
        normalizedCnjNumber: d.normalizedCnjNumber,
        rapporteur: d.rapporteur,
        judgmentDate: d.judgmentDate,
        publicationDate: d.publicationDate,
        headnote: d.officialHeadnote,
        relevantSnippet: d.rulingThesis || d.officialHeadnote.substring(0, 300) + '...',
        rulingThesis: d.rulingThesis,
        themeNumber: d.themeNumber,
        precedentStrength: d.precedentStrength,
        precedentSituation: d.precedentSituation,
        verificationStatus: d.verificationStatus,
        verificationBadge: citationBadge,
        officialUrl: d.officialUrl,
        fullTextUrl: d.fullTextUrl,
        officialCitation,
        scoreTextual: item.score,
        scoreSemantic: null, // Sem embeddings reais executados = null garantido
        scoreFinal: item.score,
        relevanceReason: item.pertinenceReason,
        verifiedAt: d.lastVerifiedAt,
        evidenceState,
        evidenceId: hasAuditableEvidence ? `${d.sourceId}:${d.contentSha256}` : undefined,
        contentSha256: d.contentSha256,
      };
    });

    return {
      query,
      total: scoredItems.length,
      page,
      pageSize,
      results,
      sourcesConsulted: Array.from(sourcesActuallyConsulted),
      executionTimeMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  }
}
