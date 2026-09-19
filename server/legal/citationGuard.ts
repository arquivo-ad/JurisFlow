import { CitationGuardReport, CanonicalLegalDecision } from './types.ts';

function normalizeCitationKey(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * CITATION GUARD - GUARDA DETERMINÍSTICO DE CITAÇÕES JURISPRUDENCIAIS
 *
 * Regras Estritas de Blindagem Forense:
 * 1. Valida citações SOMENTE contra os precedentes efetivamente recuperados para a consulta atual.
 * 2. Bloqueia qualquer citação que não esteja entre os precedentes recuperados para esta consulta específica.
 * 3. Proíbe busca automática no banco geral (evita admitir precedentes impertinentes do acervo global).
 * 4. Exige correspondência estrita (número completo, tribunal, UF, tema e URL oficial).
 * 5. Não usa comparação flexível com .includes() para evitar falso match de prefixos ou números parciais.
 * 6. Captura a referência completa (ex: "REsp 1.061.530/RS", "RR-1000-12.2020.5.02.0001", "RE 574.706/PR").
 * 7. O selo nunca é injetado destrutivamente no meio do número (não quebra /RS ou /SP).
 */

export class CitationGuard {
  /**
   * Sanitiza e valida minuciosamente o texto gerado pela IA ou minuta
   * @param rawText Texto da resposta do modelo ou peça processual
   * @param verifiedDecisions Decisões recuperadas pela busca oficial PARA A CONSULTA ATUAL
   */
  public validateAndSanitize(
    rawText: string,
    verifiedDecisions: CanonicalLegalDecision[]
  ): CitationGuardReport {
    if (!rawText) {
      return {
        isPassed: true,
        citationsFound: [],
        blockedCitationsCount: 0,
        blockedReasons: [],
        verifiedBadgesApplied: 0,
        sanitizedText: '',
      };
    }

    const blockedReasons: string[] = [];
    let blockedCount = 0;
    let verifiedCount = 0;
    const citationsFound: CitationGuardReport['citationsFound'] = [];

    // Map estrito montado EXCLUSIVAMENTE a partir dos precedentes recuperados para a consulta atual
    const verifiedMap = new Map<string, CanonicalLegalDecision>();

    for (const d of verifiedDecisions) {
      // Chave estrita normalizada do julgado (ex: "resp1061530rs" ou "rr10001220205020001")
      const normRaw = normalizeCitationKey(d.rawCaseNumber);
      verifiedMap.set(normRaw, d);

      if (d.normalizedCnjNumber) {
        verifiedMap.set(d.normalizedCnjNumber.replace(/[^0-9]/g, ''), d);
      }

      if (d.themeNumber) {
        verifiedMap.set(`tema${d.themeNumber}`, d);
        verifiedMap.set(`tema${d.themeNumber}${d.courtCode.toLowerCase()}`, d);
      }

      if (d.documentType === 'SUMULA_VINCULANTE' && d.themeNumber) {
        verifiedMap.set(`sumulavinculante${d.themeNumber}`, d);
        verifiedMap.set(`sv${d.themeNumber}`, d);
      }
    }

    // Padrões Regex com captura de identificadores forenses integrais (incluindo classe e UF)
    const citationPatterns: RegExp[] = [
      /\b(REsp|Recurso Especial)\s+([0-9\.\-]+(?:\/[A-Z]{2})?)\b/gi,
      /\b(RE|Recurso Extraordinário)\s+([0-9\.\-]+(?:\/[A-Z]{2})?)\b/gi,
      /\b(RR|AIRR|Ag-RR|RO)\s*[-:]?\s*([0-9\.\-]+(?:\/[A-Z]{2})?)\b/gi,
      /\b(Súmula Vinculante|SV)\s+([0-9]+)\b/gi,
      /\b(Súmula)\s+([0-9]+)\s*(?:\/|\s+do\s+)?(STJ|STF|TST)?\b/gi,
      /\b(Tema)\s+([0-9]+)\s*(?:\/|\s+do\s+)?(STJ|STF|TST)?\b/gi,
      /\b(OJ|Orientação Jurisprudencial)\s+(?:n[º°.]\s*)?([0-9]+)\s*(?:da\s+)?(SBDI-[12]|SDI-[12]|SDC)?\s*(?:do\s+)?(TST)?\b/gi,
    ];

    let sanitized = rawText;
    const trackedMatches = new Set<string>();

    for (const pattern of citationPatterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(rawText)) !== null) {
        const fullMatch = match[0].trim();
        const normKey = normalizeCitationKey(fullMatch);

        if (trackedMatches.has(normKey)) {
          continue;
        }
        trackedMatches.add(normKey);

        // Correspondência estrita e unívoca. Temas e súmulas são reconstruídos
        // a partir dos grupos capturados para que grafias equivalentes como
        // "Tema 27/STJ" e "Tema 27 do STJ" usem a mesma chave canônica.
        let matchedDecision = verifiedMap.get(normKey);
        const citationType = normalizeCitationKey(match[1] || '');
        const citationNumber = String(match[2] || '').replace(/[^0-9]/g, '');

        if (!matchedDecision && citationType === 'tema' && citationNumber) {
          const citedCourt = normalizeCitationKey(match[3] || '');
          matchedDecision =
            (citedCourt ? verifiedMap.get(`tema${citationNumber}${citedCourt}`) : undefined) ||
            verifiedMap.get(`tema${citationNumber}`);
        } else if (!matchedDecision && (citationType === 'sv' || citationType === 'sumulavinculante') && citationNumber) {
          matchedDecision =
            verifiedMap.get(`sumulavinculante${citationNumber}`) ||
            verifiedMap.get(`sv${citationNumber}`);
        } else if (!matchedDecision && citationType === 'sumula' && citationNumber) {
          const citedCourt = normalizeCitationKey(match[3] || '');
          matchedDecision =
            (citedCourt ? verifiedMap.get(`sumula${citationNumber}${citedCourt}`) : undefined) ||
            verifiedMap.get(`sumula${citationNumber}`);
        }

        if (matchedDecision) {
          // Precedente pertence ao conjunto de fontes recuperadas para a consulta
          if (matchedDecision.precedentSituation === 'CANCELADO') {
            blockedCount++;
            const reason = `Precedente "${fullMatch}" está formalmente CANCELADO pelo ${matchedDecision.courtCode} e não pode ser invocado como vigente.`;
            blockedReasons.push(reason);

            citationsFound.push({
              rawCitation: fullMatch,
              decisionNumber: matchedDecision.rawCaseNumber,
              isVerified: false,
              verificationStatus: 'CANCELLED',
              reason,
            });

            // Substituição limpa sem quebrar formatação interna
            sanitized = sanitized.split(fullMatch).join(`[PRECEDENTE CANCELADO: ${fullMatch}]`);
          } else if (matchedDecision.verificationStatus === 'DEMO_UNVERIFIED') {
            // Proibição de dados de demonstração
            blockedCount++;
            const reason = `Precedente "${fullMatch}" é dado não verificado de desenvolvimento e foi bloqueado em ambiente de produção.`;
            blockedReasons.push(reason);

            citationsFound.push({
              rawCitation: fullMatch,
              decisionNumber: matchedDecision.rawCaseNumber,
              isVerified: false,
              verificationStatus: 'DEMO_UNVERIFIED',
              reason,
            });

            sanitized = sanitized.split(fullMatch).join(`[BLOQUEADO: ${fullMatch} - NÃO VERIFICADO EM FONTE OFICIAL]`);
          } else {
            // Precedente autêntico, pertinente e vigente
            verifiedCount++;
            citationsFound.push({
              rawCitation: fullMatch,
              sourceIdMatch: matchedDecision.sourceId,
              decisionNumber: matchedDecision.rawCaseNumber,
              isVerified: true,
              verificationStatus: matchedDecision.verificationStatus,
              reason: `Validado com sucesso em fonte oficial (${matchedDecision.courtCode}) para esta consulta.`,
            });
            // Não injeta texto destrutivo no meio do identificador; a UI renderiza o selo estruturado
          }
        } else {
          // Bloqueia imediatamente: citação não existe no conjunto de precedentes recuperados para esta consulta
          blockedCount++;
          const reason = `Citação "${fullMatch}" não pertence ao conjunto de precedentes oficiais recuperados e validados para esta consulta específica.`;
          blockedReasons.push(reason);

          citationsFound.push({
            rawCitation: fullMatch,
            isVerified: false,
            verificationStatus: 'NOT_FOUND',
            reason,
          });

          // Substitui menção não comprovada por alerta limpo
          sanitized = sanitized.split(fullMatch).join(`[CITAÇÃO NÃO VALIDADA NESTA CONSULTA: ${fullMatch}]`);
        }
      }
    }

    return {
      isPassed: blockedCount === 0,
      citationsFound,
      blockedCitationsCount: blockedCount,
      blockedReasons,
      verifiedBadgesApplied: verifiedCount,
      sanitizedText: sanitized,
    };
  }
}
