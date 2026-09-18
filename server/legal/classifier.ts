import { LegalQueryClassification } from './types.ts';

/**
 * CLASSIFICADOR DETERMINÍSTICO DE RAMO JURÍDICO, MATÉRIA E COMPETÊNCIA CONSTITUCIONAL
 *
 * Princípios Fundamentais:
 * 1. Competência Constitucional (CF/1988, Arts. 102, 105, 114):
 *    - Matéria Trabalhista (CLT, empregado público, verbas rescisórias): Justiça do Trabalho (TRT / TST).
 *      STJ é materialmente incompetente (CF, art. 105). Nunca buscar ou admitir precedentes cíveis/bancários do STJ!
 * 2. Admissão por Pertinência:
 *    - Identifica entidades, institutos jurídicos e fontes prioritárias antes da busca.
 *    - Descarta fontes incongruentes.
 */

export class LegalCompetenceClassifier {
  /**
   * Classifica a consulta jurídica do usuário identificando ramo, matéria, competência e termos substantivos
   */
  public static classify(rawQuery: string): LegalQueryClassification {
    const q = rawQuery.toLowerCase();

    // 1. Extração de Números de Processos Específicos
    const processMatch = rawQuery.match(/\b(REsp|RE|RR|AIRR|Ag-RR|RO)\s*(?:n[º°.]\s*)?[-:]?\s*([0-9\.\-]+(?:\s*[\/-]\s*[A-Z]{2})?)\b/i);
    const cnjMatch = rawQuery.match(/\b([0-9]{7}-[0-9]{2}\.[0-9]{4}\.[0-9]\.[0-9]{2}\.[0-9]{4})\b/);

    // 2. Extração de Temas e Súmulas Específicos
    const temaMatch = rawQuery.match(/\b(Tema)\s+([0-9]+)(?:\s*(?:\/|\s+do\s+)?(STJ|STF|TST))?\b/i);
    const sumulaVinculanteMatch = rawQuery.match(/\b(Súmula Vinculante|SV)\s+([0-9]+)\b/i);
    const sumulaMatch = rawQuery.match(/\b(Súmula)\s+([0-9]+)(?:\s*(?:\/|\s+do\s+)?(STJ|STF|TST))?\b/i);
    const ojMatch = rawQuery.match(/\b(OJ|Orientação Jurisprudencial)\s+(?:n[º°.]\s*)?([0-9]+)\b/i);

    let extractedThemeOrSumula: LegalQueryClassification['extractedThemeOrSumula'] | undefined;
    if (sumulaVinculanteMatch) {
      extractedThemeOrSumula = {
        type: 'SUMULA_VINCULANTE',
        court: 'STF',
        number: parseInt(sumulaVinculanteMatch[2], 10),
      };
    } else if (temaMatch) {
      extractedThemeOrSumula = {
        type: 'TEMA',
        court: temaMatch[3]?.toUpperCase(),
        number: parseInt(temaMatch[2], 10),
      };
    } else if (sumulaMatch) {
      extractedThemeOrSumula = {
        type: 'SUMULA',
        court: sumulaMatch[3]?.toUpperCase(),
        number: parseInt(sumulaMatch[2], 10),
      };
    } else if (ojMatch) {
      extractedThemeOrSumula = {
        type: 'OJ',
        court: 'TST',
        number: parseInt(ojMatch[2], 10),
      };
    }

    // 3. Detecção de Ramo Jurídico
    // Dicionários conceituais por área do Direito
    const isLabor =
      /\b(clt|trabalhist[ao]|trabalhador|empregad[ao]|emprego|cargo de confiança|função de confiança|fundação estadual|fundação pública|verbas rescisórias|rescis[ãa]o|demiss[ãa]o|demitid[ao]|dispensa|aviso prévio|fgts|férias|13[º°]? salário|décimo terceiro|saldo de salário|multa rescisória|tst|trt|oj\b|sindicato|categoria profissional)\b/i.test(
        q
      );

    const isBanking =
      /\b(banc[áa]ri[ao]|banco|instituiç[ãa]o financeira|juros remunerat[óo]rios|taxa de juros|limitaç[ãa]o de juros|lei de usura|capitalizaç[ãa]o|anatocismo|tarifa de avaliaç[ãa]o|tarifa de abertura|alienaç[ãa]o fiduci[áa]ria|contrato de financiamento|bacen)\b/i.test(
        q
      );

    const isConsumer =
      /\b(cdc|consumidor|fornecedor|relaç[ãa]o de consumo|v[íi]cio do produto|propaganda enganosa|inscriç[ãa]o indevida|spc|serasa|dano moral consumidor|comiss[ãa]o de corretagem|taxa sati)\b/i.test(
        q
      );

    const isTax =
      /\b(tribut[áa]ri[ao]|tributo|imposto|icms|iss|pis|cofins|irpf|irpj|base de c[áa]lculo|cr[ée]dito tribut[áa]rio|execuç[ãa]o fiscal|certid[ãa]o negativa)\b/i.test(
        q
      );

    const isConstitutional =
      /\b(constitucional|stf|repercuss[ãa]o geral|s[úu]mula vinculante|adi|adc|adpf|inconstitucionalidade|reserva de plen[áa]rio|isonomia|art\.? 37|art\.? 5[º°]|cf\/88)\b/i.test(
        q
      );

    const isPenal =
      /\b(penal|crime|delito|pris[ãa]o|habeas corpus|cpp|c[óo]digo penal|pena|regime fechado|semiaberto)\b/i.test(q);

    // 4. Mapeamento das Entidades e Institutos
    const entities: string[] = [];
    if (/\b(clt|celetista)\b/i.test(q)) entities.push('regime celetista (CLT)');
    if (/\bfundaç[ãa]o (estadual|p[úu]blica)\b/i.test(q)) entities.push('fundação pública estadual');
    if (/\b(cargo|funç[ãa]o) de confiança\b/i.test(q)) entities.push('cargo/função de confiança ou em comissão');
    if (/\b(demiss[ãa]o|demitid[ao]|dispensa)\b/i.test(q)) entities.push('dispensa/rescisão contratual');
    if (/\bverbas rescis[óo]rias\b/i.test(q)) entities.push('verbas rescisórias');
    if (/\b(juros remunerat[óo]rios|taxa de juros)\b/i.test(q)) entities.push('juros remuneratórios bancários');
    if (/\b(alienaç[ãa]o fiduci[áa]ria)\b/i.test(q)) entities.push('alienação fiduciária');
    if (/\btarifa de avaliaç[ãa]o\b/i.test(q)) entities.push('tarifa de avaliação de bem');
    if (/\bicms\b/i.test(q)) entities.push('ICMS');

    // 5. Montagem da Classificação
    if (isLabor) {
      return {
        branch: 'TRABALHO',
        branchLabel: 'Direito do Trabalho',
        subject: 'Empregado público celetista de fundação estadual - Cargo de confiança - Dispensa e verbas rescisórias',
        competentCourts: ['TST', 'TRT'],
        prioritySources: ['tst-jurisprudencia', 'trt-jurisprudencia'],
        complementarySources: isConstitutional ? ['stf-jurisprudencia'] : [],
        excludedSources: ['stj-dados-abertos'], // STJ é incompetente para relação celetista (CF/88, art. 114)
        entities: entities.length > 0 ? entities : ['empregado público', 'CLT', 'verbas rescisórias'],
        isLaborDispute: true,
        isSpecificCaseNumberQuery: !!(processMatch || cnjMatch),
        isSpecificThemeOrSumulaQuery: !!extractedThemeOrSumula,
        extractedProcessNumber: (processMatch ? processMatch[0] : undefined) || (cnjMatch ? cnjMatch[0] : undefined),
        extractedThemeOrSumula,
      };
    }

    if (isBanking) {
      return {
        branch: 'BANCARIO',
        branchLabel: 'Direito Bancário',
        subject: 'Contratos bancários, taxas de juros remuneratórios e encargos financeiros',
        competentCourts: ['STJ', 'TJ', 'TRF'],
        prioritySources: ['stj-dados-abertos', 'cnj-bnp-pangea'],
        complementarySources: ['stf-jurisprudencia'],
        excludedSources: ['tst-jurisprudencia'],
        entities: entities.length > 0 ? entities : ['contrato bancário', 'juros remuneratórios'],
        isLaborDispute: false,
        isSpecificCaseNumberQuery: !!(processMatch || cnjMatch),
        isSpecificThemeOrSumulaQuery: !!extractedThemeOrSumula,
        extractedProcessNumber: (processMatch ? processMatch[0] : undefined) || (cnjMatch ? cnjMatch[0] : undefined),
        extractedThemeOrSumula,
      };
    }

    if (isTax) {
      return {
        branch: 'TRIBUTARIO',
        branchLabel: 'Direito Tributário',
        subject: 'Tributos, bases de cálculo e execuções fiscais',
        competentCourts: ['STF', 'STJ', 'TRF', 'TJ'],
        prioritySources: ['stf-jurisprudencia', 'stj-dados-abertos', 'cnj-bnp-pangea'],
        complementarySources: [],
        excludedSources: ['tst-jurisprudencia'],
        entities: entities.length > 0 ? entities : ['tributo', 'base de cálculo'],
        isLaborDispute: false,
        isSpecificCaseNumberQuery: !!(processMatch || cnjMatch),
        isSpecificThemeOrSumulaQuery: !!extractedThemeOrSumula,
        extractedProcessNumber: (processMatch ? processMatch[0] : undefined) || (cnjMatch ? cnjMatch[0] : undefined),
        extractedThemeOrSumula,
      };
    }

    if (isConsumer) {
      return {
        branch: 'CONSUMIDOR',
        branchLabel: 'Direito do Consumidor',
        subject: 'Relações de consumo, abusividade contratual e reparação civil',
        competentCourts: ['STJ', 'TJ'],
        prioritySources: ['stj-dados-abertos', 'cnj-bnp-pangea'],
        complementarySources: ['stf-jurisprudencia'],
        excludedSources: ['tst-jurisprudencia'],
        entities: entities.length > 0 ? entities : ['consumidor', 'responsabilidade civil'],
        isLaborDispute: false,
        isSpecificCaseNumberQuery: !!(processMatch || cnjMatch),
        isSpecificThemeOrSumulaQuery: !!extractedThemeOrSumula,
        extractedProcessNumber: (processMatch ? processMatch[0] : undefined) || (cnjMatch ? cnjMatch[0] : undefined),
        extractedThemeOrSumula,
      };
    }

    if (isConstitutional) {
      return {
        branch: 'CONSTITUCIONAL',
        branchLabel: 'Direito Constitucional',
        subject: 'Matéria constitucional, controle de constitucionalidade e direitos fundamentais',
        competentCourts: ['STF'],
        prioritySources: ['stf-jurisprudencia', 'cnj-bnp-pangea'],
        complementarySources: ['stj-dados-abertos'],
        excludedSources: [],
        entities: entities.length > 0 ? entities : ['Constituição Federal', 'precedente vinculante'],
        isLaborDispute: false,
        isSpecificCaseNumberQuery: !!(processMatch || cnjMatch),
        isSpecificThemeOrSumulaQuery: !!extractedThemeOrSumula,
        extractedProcessNumber: (processMatch ? processMatch[0] : undefined) || (cnjMatch ? cnjMatch[0] : undefined),
        extractedThemeOrSumula,
      };
    }

    if (isPenal) {
      return {
        branch: 'PENAL',
        branchLabel: 'Direito Penal e Processual Penal',
        subject: 'Matéria penal, dosimetria e execução de penas',
        competentCourts: ['STJ', 'STF', 'TJ', 'TRF'],
        prioritySources: ['stj-dados-abertos', 'stf-jurisprudencia'],
        complementarySources: ['cnj-bnp-pangea'],
        excludedSources: ['tst-jurisprudencia'],
        entities: entities.length > 0 ? entities : ['direito penal'],
        isLaborDispute: false,
        isSpecificCaseNumberQuery: !!(processMatch || cnjMatch),
        isSpecificThemeOrSumulaQuery: !!extractedThemeOrSumula,
        extractedProcessNumber: (processMatch ? processMatch[0] : undefined) || (cnjMatch ? cnjMatch[0] : undefined),
        extractedThemeOrSumula,
      };
    }

    // Padrão Geral Cível
    return {
      branch: 'CIVIL',
      branchLabel: 'Direito Civil e Processual Civil',
      subject: 'Obrigações, contratos, responsabilidade civil e normas do CPC/2015',
      competentCourts: ['STJ', 'TJ', 'TRF'],
      prioritySources: ['stj-dados-abertos', 'cnj-bnp-pangea'],
      complementarySources: ['stf-jurisprudencia'],
      excludedSources: ['tst-jurisprudencia'],
      entities: entities.length > 0 ? entities : ['direito civil'],
      isLaborDispute: false,
      isSpecificCaseNumberQuery: !!(processMatch || cnjMatch),
      isSpecificThemeOrSumulaQuery: !!extractedThemeOrSumula,
      extractedProcessNumber: (processMatch ? processMatch[0] : undefined) || (cnjMatch ? cnjMatch[0] : undefined),
      extractedThemeOrSumula,
    };
  }
}
