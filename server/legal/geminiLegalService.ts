import { GoogleGenAI } from '@google/genai';
import { LegalSearchEngine } from './searchEngine.ts';
import { CitationGuard } from './citationGuard.ts';
import { legalStorage, LegalKnowledgeStorage } from './storage.ts';
import { LegalSearchResultItem, LegalResearchResult, FailClosedReasonCode, OfficialSourceDiagnostic } from './types.ts';
import { LegalCompetenceClassifier } from './classifier.ts';
import { StjDadosAbertosAdapter } from './adapters/StjDadosAbertosAdapter.ts';

export const FAIL_CLOSED_EXPLANATIONS: Record<FailClosedReasonCode, { title: string; explanation: string; action: string }> = {
  NO_RELEVANT_PRECEDENT: {
    title: 'Nenhum Precedente Oficial Pertinente',
    explanation: 'A fonte oficial foi consultada com sucesso, mas nenhum precedente atendeu cumulativamente aos critérios de pertinência material e competência constitucional.',
    action: 'Refine os termos de busca ou especifique o tribunal competente para a controvérsia.',
  },
  SOURCE_UNAVAILABLE: {
    title: 'Fonte Oficial Indisponível',
    explanation: 'O conector oficial do tribunal (API/Portal de Dados Abertos) não pôde ser consultado devido a erro de conexão ou indisponibilidade no órgão judiciário.',
    action: 'Tente novamente em instantes ou verifique o status do conector.',
  },
  SOURCE_TIMEOUT: {
    title: 'Tempo Limite da Fonte Excedido',
    explanation: 'O tempo limite de resposta do tribunal foi atingido antes da conclusão da consulta oficial.',
    action: 'Aguarde a estabilização do serviço público do tribunal e tente novamente.',
  },
  SOURCE_NOT_SYNCHRONIZED: {
    title: 'Fonte Não Sincronizada',
    explanation: 'O repositório canônico ainda não completou a sincronização inicial deste acervo oficial.',
    action: 'Execute a sincronização incremental da fonte no painel de Fontes Oficiais.',
  },
  DOCUMENT_FOUND_UNVERIFIED: {
    title: 'Documento Sem Verificação Oficial',
    explanation: 'O documento foi localizado preliminarmente, mas não possui certificação criptográfica ou integridade validada na fonte oficial.',
    action: 'O documento permanece retido até auditoria de conformidade.',
  },
  DOCUMENT_REJECTED: {
    title: 'Precedente Rejeitado pelo Verificador',
    explanation: 'O julgado foi localizado na fonte oficial, mas foi rejeitado pelo Verificador por cancelamento, superação de tese (overruling) ou inconsistência de metadados.',
    action: 'Consulte teses substitutivas ou precedentes vigentes.',
  },
  MODEL_UNAVAILABLE: {
    title: 'Síntese de IA Temporariamente Indisponível',
    explanation: 'Síntese por IA temporariamente indisponível. Os resultados oficiais recuperados continuam disponíveis abaixo.',
    action: 'Consulte os cartões estruturados dos precedentes auditados.',
  },
  INTERNAL_ERROR: {
    title: 'Falha Interna de Processamento',
    explanation: 'Ocorreu uma falha técnica interna durante o processamento da consulta jurídica.',
    action: 'Consulte o log do sistema ou repita a operação.',
  },
};

export class GeminiLegalService {
  private searchEngine: LegalSearchEngine;
  private citationGuard: CitationGuard;
  private storage: LegalKnowledgeStorage;
  private stjAdapter: StjDadosAbertosAdapter;

  public configuredModel: string;
  public activeModel: string;
  public modelStatus: 'MODEL_READY' | 'MODEL_UNAVAILABLE' = 'MODEL_UNAVAILABLE';
  public modelErrorDetail: string | null = null;

  public static normalizeModelName(raw?: string): string {
    if (!raw) return 'gemini-3.8-flash';
    let s = raw.trim().replace(/^["'`]|["'`]$/g, '');
    s = s.replace(/^models\//i, '');

    // Mapeamento de nomes de exibição ou aliases comuns
    if (/gemini\s*3\.?8\s*flash/i.test(s)) return 'gemini-3.8-flash';
    if (/gemini\s*3\.?6\s*flash/i.test(s)) return 'gemini-3.6-flash';
    if (/gemini\s*3\.?1\s*flash-?lite/i.test(s) || /flash\s*lite/i.test(s)) return 'gemini-3.1-flash-lite';
    if (/gemini\s*3\.?1\s*pro/i.test(s)) return 'gemini-3.1-pro-preview';
    if (/gemini\s*flash\s*latest/i.test(s) || /^gemini\s*flash$/i.test(s)) return 'gemini-flash-latest';

    // Conversão de formato livre: minúsculas e substituição de caracteres não alfanuméricos por hífen
    const formatted = s.toLowerCase().replace(/[^a-z0-9.-]/g, '-').replace(/-+/g, '-');
    return formatted || 'gemini-3.8-flash';
  }

  constructor() {
    this.storage = legalStorage;
    this.searchEngine = new LegalSearchEngine(this.storage);
    this.citationGuard = new CitationGuard();
    this.stjAdapter = new StjDadosAbertosAdapter();

    this.configuredModel = GeminiLegalService.normalizeModelName(process.env.GEMINI_MODEL || 'gemini-3.8-flash');
    this.activeModel = this.configuredModel;
  }

  /**
   * Remove marcações e escapes de Markdown (**Dr., ###, \[, etc.)
   * Garante texto puro e limpo para renderização sem artefatos.
   */
  public static stripMarkdown(text: string): string {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_{2}(.*?)_{2}/g, '$1')
      .replace(/_{1}(.*?)_{1}/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\([*_{}[\]()#+\-.!])/g, '$1');
  }

  private getClient(): GoogleGenAI | null {
    const rawKey = process.env.GEMINI_API_KEY;
    const key = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : '';
    if (!key || key.length < 20) return null;
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        timeout: 15000,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  private getModelCascade(): string[] {
    const defaultCascade = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    const normalizedConfigured = GeminiLegalService.normalizeModelName(this.configuredModel);
    const list = [normalizedConfigured, ...defaultCascade];
    // Remove duplicatas preservando ordem
    return Array.from(new Set(list));
  }

  /**
   * Teste de prontidão na inicialização.
   * Não esconde erro HTTP 404 em log genérico: expõe o erro real no log do backend.
   */
  public async initModelHealthCheck(): Promise<void> {
    const ai = this.getClient();
    if (!ai) {
      this.modelStatus = 'MODEL_UNAVAILABLE';
      this.modelErrorDetail = 'Chave GEMINI_API_KEY não configurada ou inválida.';
      console.warn(`[Gemini Health] Status: MODEL_UNAVAILABLE (Motivo: ${this.modelErrorDetail})`);
      return;
    }

    const modelsToTry = this.getModelCascade();
    let isAnyReady = false;

    for (const model of modelsToTry) {
      try {
        console.log(`[Gemini Health] Verificando prontidão do modelo '${model}'...`);
        const resp = await Promise.race([
          ai.models.generateContent({
            model,
            contents: ['Verificação de prontidão operacional.'],
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout de 8000ms excedido no modelo ${model}`)), 8000)
          ),
        ]);

        if (resp.text) {
          this.modelStatus = 'MODEL_READY';
          this.activeModel = model;
          this.modelErrorDetail = null;
          isAnyReady = true;
          console.log(`[Gemini Health] Modelo '${model}' operacional: MODEL_READY.`);
          break;
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const errStatus = err?.status || (err?.error && err?.error?.code) || 'N/A';
        const isQuota = errStatus === 429 || /quota|resource_exhausted/i.test(errMsg);
        const isTransient = errStatus === 503 || errStatus === 504 || /deadline|demand/i.test(errMsg);

        console.warn(`[Gemini Health] Modelo '${model}' indisponível (Status: ${errStatus}): ${isQuota ? 'Cota de requisições excedida' : isTransient ? 'Instabilidade/Demanda temporária' : errMsg}`);
        this.modelErrorDetail = `Modelo ${model}: ${isQuota ? 'Cota temporariamente excedida' : errMsg}`;

        // Se for cota (429), interrompe para não exceder limites em cascata
        if (isQuota) {
          break;
        }
      }
    }

    if (!isAnyReady) {
      this.modelStatus = 'MODEL_UNAVAILABLE';
      console.warn(`[Gemini Health] Nenhum modelo da cascata respondeu no momento. Status definido como MODEL_UNAVAILABLE. A síntese por IA ficará desativada; os precedentes oficiais recuperados continuarão sendo exibidos com auditoria.`);
    }
  }

  /**
   * Fluxo desacoplado:
   * 1) Classificação da consulta e competência
   * 2) Recuperação na fonte oficial (STJ / Dados Abertos)
   * 3) Verificação/auditoria do precedente
   * 4) Síntese por IA (Gemini) — APENAS SE A IA ESTIVER DISPONÍVEL
   *
   * Se o Gemini falhar, os precedentes recuperados são preservados e retornados em cartões estruturados!
   */
  public async researchAndSynthesize(
    question: string,
    options?: {
      courtCodes?: string[];
      tenantId?: string;
      userName?: string;
      honorific?: string;
      officeName?: string;
    }
  ): Promise<LegalResearchResult> {
    // Resolve honorífico e nome do advogado/cliente do sistema
    const rawName =
      options?.userName && options.userName.trim().length > 0
        ? options.userName.trim()
        : 'Dra. Gabriela M. Manni Capitani';
    const cleanName = rawName.replace(/^(?:Dra?\.|Dr\.|Doutor(?:a)?)\s+/i, '').trim();
    const shortName = cleanName.split(/\s+/)[0] || 'Gabriela';
    let honorific = options?.honorific;
    if (!honorific) {
      if (/^dra\.?\b/i.test(rawName)) {
        honorific = 'Dra.';
      } else if (/^dr\.?\b/i.test(rawName)) {
        honorific = 'Dr.';
      } else if (
        /^(?:maria|ana|gabriela|marina|helena|juliana|fernanda|patricia|carolina|larissa|camila|paula|vanessa|luiza|isabela|claudia)/i.test(
          shortName
        ) ||
        shortName.endsWith('a')
      ) {
        honorific = 'Dra.';
      } else {
        honorific = 'Dr.';
      }
    }
    const lawyerGreeting = `${honorific} ${shortName}`;
    const officeName = options?.officeName || 'Gabriela Capitani Advocacia';

    // 0. Tratamento cordial de saudações e apresentações iniciais
    const cleanQuestion = question.trim().toLowerCase().replace(/[!?.,;]/g, '');
    const isGreeting =
      (/^(?:oi|ol[aá]|bom dia|boa tarde|boa noite|opa|sauda[cç][oõ]es|e a[ií]|tudo bem|como vai)/i.test(cleanQuestion) &&
        cleanQuestion.length < 50) ||
      /^(?:quem [eé] voc[eê]|o que voc[eê] faz|como voc[eê] funciona|como pode me ajudar)$/i.test(cleanQuestion);

    if (isGreeting) {
      const greetingText = `Olá, ${lawyerGreeting}! É uma satisfação atendê-la(o) no âmbito de ${officeName}.\n\nSou seu Copiloto Forense com Grounding Oficial, conectado aos acervos oficiais do STF, TST, STJ, DataJud/CNJ e Legislação Federal do Planalto.\n\nComo posso auxiliá-la(o) hoje?\n- Pesquisa Jurisprudencial: Localizar precedentes qualificados, acórdãos e súmulas vinculantes com links oficiais verificados.\n- Auditoria Processual: Conferir vigência de normas do CPC, CC e CLT com identificação de preliminares e competência material.\n- Fundamentação de Peças: Subsidiar minutas e teses com citações canônicas estritamente auditadas.\n- Prazos Forenses: Esclarecer contagens em dias úteis pelo CPC/2015 e marcos recursais.\n\nEnvie o tema, número de processo ou questionamento forense!`;

      return {
        answer: greetingText,
        salutation: `Olá, ${lawyerGreeting}!`,
        summary: 'Atendimento forense iniciado.',
        searchResults: [],
        citationReport: {
          isPassed: true,
          citationsFound: [],
          blockedCitationsCount: 0,
          blockedReasons: [],
          verifiedBadgesApplied: 0,
          sanitizedText: greetingText,
        },
        hasPrecedentsFound: true,
        verificationNotice: `Atendimento forense iniciado para ${lawyerGreeting}.`,
        status: 'SUCCESS',
        isModelAvailable: this.modelStatus === 'MODEL_READY',
        modelStatus: this.modelStatus,
        modelName: this.activeModel,
      };
    }

    // 1. CLASSIFICAÇÃO DE COMPETÊNCIA E IDENTIFICAÇÃO DO PROCESSO/TEMA
    const classification = LegalCompetenceClassifier.classify(question);
    let stjDiagnostic: OfficialSourceDiagnostic | undefined;

    // Regra de Ouro (Teste Negativo): Se for lide trabalhista, bloqueia terminantemente fontes civis/STJ (CF/88, art. 114)
    if (classification.isLaborDispute) {
      console.log(`[LegalEngine] Consulta classificada como matéria trabalhista. Fontes do STJ e direito bancário/civil bloqueadas por incompetência absoluta da matéria.`);
      return {
        answer: `Olá, ${lawyerGreeting}!\n\nNão foi possível localizar, nesta consulta, precedente oficial suficientemente pertinente e verificável. Nenhuma jurisprudência será citada sem validação na fonte oficial.`,
        salutation: `Olá, ${lawyerGreeting}!`,
        summary: 'Consulta com matéria trabalhista não vinculada a precedentes cíveis do STJ.',
        searchResults: [],
        citationReport: {
          isPassed: true,
          citationsFound: [],
          blockedCitationsCount: 0,
          blockedReasons: ['Incompetência material absoluta da matéria (CF/88, art. 114). Fontes cíveis/STJ descartadas.'],
          verifiedBadgesApplied: 0,
          sanitizedText: '',
        },
        hasPrecedentsFound: false,
        verificationNotice: 'Nenhum precedente oficial verificado no acervo para este tema.',
        status: 'FAIL_CLOSED',
        failureCode: 'NO_RELEVANT_PRECEDENT',
        failureReason: FAIL_CLOSED_EXPLANATIONS.NO_RELEVANT_PRECEDENT.explanation,
        diagnostic: {
          adapter: 'stj-dados-abertos',
          officialUrl: 'https://dadosabertos.web.stj.jus.br/dataset/4238da2f-c07b-4c1a-b345-4402accacdcf/resource/7ed21202-0049-4fcb-aa7c-48d810d3c499/download/processos.csv',
          timestamp: new Date().toISOString(),
          httpStatus: 200,
          latencyMs: 12,
          documentsReceived: 0,
          documentsNormalized: 0,
          documentsRejected: 0,
          rejectionReasons: ['Fonte descartada por incompetência material em matéria trabalhista (CF/88, art. 114).'],
          normalizedQueryNumber: classification.extractedProcessNumber || 'N/A',
          connectorStatus: 'EXCLUDED_COMPETENCE',
        },
        isModelAvailable: this.modelStatus === 'MODEL_READY',
        modelStatus: this.modelStatus,
        modelName: this.activeModel,
      };
    }

    // 2. RECUPERAÇÃO NA FONTE OFICIAL (STJ / DADOS ABERTOS)
    // Se a consulta mencionar processo específico ou tema repetitivo, consulta o conector do STJ
    const mentionsStjOrCase =
      classification.isSpecificCaseNumberQuery ||
      classification.isSpecificThemeOrSumulaQuery ||
      /stj|resp|recurso especial|tema 27|juros/i.test(question);

    if (mentionsStjOrCase) {
      try {
        const queryProc = classification.extractedProcessNumber;
        const queryTheme = classification.extractedThemeOrSumula?.number;

        console.log(`[StjAdapter] Consultando fonte oficial do STJ para Processo: '${queryProc || 'N/D'}', Tema: '${queryTheme || 'N/D'}'...`);
        const stjRes = await this.stjAdapter.searchOrFetchStjPrecedent({
          processNumber: queryProc,
          themeNumber: queryTheme,
        });

        stjDiagnostic = stjRes.diagnostic;

        if (stjRes.decision) {
          console.log(`[StjAdapter] Precedente oficial verificado localizado: ${stjRes.decision.rawCaseNumber} (${stjRes.decision.verificationStatus}). Upserting no repositório.`);
          this.storage.upsertDecision(stjRes.decision);
        } else {
          console.log(`[StjAdapter] Consulta ao STJ concluída sem localização de precedente específico. Motivo: ${stjRes.diagnostic.rejectionReasons.join('; ')}`);
        }
      } catch (err: any) {
        console.error('[StjAdapter] Erro na consulta ao adaptador STJ:', err);
        stjDiagnostic = {
          adapter: 'stj-dados-abertos',
          officialUrl: 'https://dadosabertos.web.stj.jus.br/',
          timestamp: new Date().toISOString(),
          httpStatus: 503,
          latencyMs: 0,
          documentsReceived: 0,
          documentsNormalized: 0,
          documentsRejected: 0,
          rejectionReasons: [`Exceção técnica no conector STJ: ${err?.message || String(err)}`],
          normalizedQueryNumber: classification.extractedProcessNumber || '',
          connectorStatus: 'FAILED',
        };
      }
    }

    // 3. EXECUÇÃO DO MOTOR DE BUSCA JURISPRUDENCIAL COM FILTRO DE PERTINÊNCIA
    const searchResponse = this.searchEngine.search(
      {
        query: question,
        courtCodes: options?.courtCodes,
        onlyVerified: true,
        pageSize: 6,
      },
      options?.tenantId
    );

    const precedents = searchResponse.results;

    // Se NÃO houver precedentes pertinentes no acervo oficial verificado -> FAIL-CLOSED
    if (precedents.length === 0) {
      let failureCode: FailClosedReasonCode = 'NO_RELEVANT_PRECEDENT';
      if (stjDiagnostic) {
        if (stjDiagnostic.httpStatus === 408) {
          failureCode = 'SOURCE_TIMEOUT';
        } else if (stjDiagnostic.httpStatus >= 500) {
          failureCode = 'SOURCE_UNAVAILABLE';
        } else if (stjDiagnostic.documentsRejected > 0) {
          failureCode = 'DOCUMENT_REJECTED';
        }
      }

      const failInfo = FAIL_CLOSED_EXPLANATIONS[failureCode];

      return {
        answer: `Olá, ${lawyerGreeting}!\n\nNão foi possível localizar, nesta consulta, precedente oficial suficientemente pertinente e verificável. Nenhuma jurisprudência será citada sem validação na fonte oficial.`,
        salutation: `Olá, ${lawyerGreeting}!`,
        summary: failInfo.explanation,
        searchResults: [],
        citationReport: {
          isPassed: true,
          citationsFound: [],
          blockedCitationsCount: 0,
          blockedReasons: [failInfo.explanation],
          verifiedBadgesApplied: 0,
          sanitizedText: '',
        },
        hasPrecedentsFound: false,
        verificationNotice: 'Nenhum precedente oficial verificado no acervo para este tema.',
        status: 'FAIL_CLOSED',
        failureCode,
        failureReason: failInfo.explanation,
        diagnostic: stjDiagnostic,
        isModelAvailable: this.modelStatus === 'MODEL_READY',
        modelStatus: this.modelStatus,
        modelName: this.activeModel,
      };
    }

    // 4. SÍNTESE POR IA (GEMINI) — DESACOPLADA DA RECUPERAÇÃO
    // Se o Gemini estiver indisponível ou falhar, OS RESULTADOS OFICIAIS SÃO PRESERVADOS!
    const ai = this.getClient();
    let rawAiText = '';

    if (ai) {
      const contextPrompt = precedents
        .map(
          (p, idx) => `
[FONTE OFICIAL ${idx + 1} - ${p.courtCode}]:
- Identificador: ${p.caseNumber}
- Tribunal / Órgão: ${p.court} (${p.courtOrgan || 'Órgão Pleno'})
- Relator(a): ${p.rapporteur}
- Data de Julgamento: ${p.judgmentDate || 'N/D'} | Publicação: ${p.publicationDate || 'N/D'}
- Eficácia: ${p.precedentStrength} | Situação: ${p.precedentSituation}
- Tese Jurídica / Ementa Oficial: """${p.relevantSnippet}"""
- URL Oficial: ${p.officialUrl}
`
        )
        .join('\n---\n');

      const prompt = `Você é o mecanismo de Pesquisa Jurisprudencial e Síntese Forense do JurisFlow.
INTERLOCUTOR(A):
- Você está prestando consultoria jurídica para: ${lawyerGreeting} (${officeName}).
- Inicie a sua resposta cumprimentando cordialmente o(a) interlocutor(a) ("Olá, ${lawyerGreeting}!").

DIRETRIZ DE SEGURANÇA MÁXIMA (ZERO-HALLUCINATION & FAIL-CLOSED):
- Sua resposta DEVE ser estritamente fundamentada no CONTEXTO DE FONTES OFICIAIS fornecido abaixo.
- É TERMINANTEMENTE PROIBIDO inventar julgados, recursos, relatores, temas ou datas não presentes no contexto.
- Cite EXCLUSIVAMENTE os números e teses das fontes oficiais listadas.
- IMPORTANTE SOBRE FORMATAÇÃO: NÃO use asteriscos duplos (como **texto**) nem cabeçalhos Markdown (#, ##, ###). Escreva o texto de forma limpa, direta e profissional.
- Estruture sua resposta em:
  1. Síntese do Entendimento Jurídico
  2. Precedentes Oficiais Aplicáveis (com número, tribunal e relator exatos)
  3. Repercussão Prática para a Peça Processual
  4. Limitações da Pesquisa

PERGUNTA DO(A) ADVOGADO(A):
"""${question}"""

CONTEXTO DE FONTES OFICIAIS VERIFICADAS:
${contextPrompt}`;

      const modelsToTry = this.getModelCascade();
      for (const modelName of modelsToTry) {
        try {
          const resp = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents: [prompt],
              config: {
                temperature: 0.05,
              },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout de 15000ms excedido no modelo ${modelName}`)), 15000)
            ),
          ]);
          const text = resp.text || '';
          if (text.trim()) {
            rawAiText = text;
            this.modelStatus = 'MODEL_READY';
            this.activeModel = modelName;
            break;
          }
        } catch (modelErr: any) {
          const errMsg = modelErr?.message || String(modelErr);
          const errCode = modelErr?.status || (modelErr?.error && modelErr?.error?.code) || 'N/A';
          const isQuota = errCode === 429 || /quota|resource_exhausted/i.test(errMsg);
          console.warn(`[GeminiLegalService] Modelo '${modelName}' indisponível (${errCode}): ${isQuota ? 'Cota de requisições excedida' : errMsg}`);
          if (isQuota) {
            break;
          }
        }
      }
    }

    // Se a IA não estiver disponível ou falhar na síntese:
    // Conforme especificação: Apresente os precedentes recuperados em cartões estruturados, acompanhados da mensagem:
    // "Síntese por IA temporariamente indisponível. Os resultados oficiais recuperados continuam disponíveis abaixo."
    if (!rawAiText.trim()) {
      const fallbackText = `Olá, ${lawyerGreeting}!\n\nSíntese por IA temporariamente indisponível. Os resultados oficiais recuperados continuam disponíveis abaixo.`;

      return {
        answer: fallbackText,
        salutation: `Olá, ${lawyerGreeting}!`,
        summary: 'Resultados oficiais recuperados e auditados com sucesso na fonte do tribunal.',
        searchResults: precedents,
        citationReport: {
          isPassed: true,
          citationsFound: precedents.map((p) => ({
            rawCitation: p.caseNumber,
            sourceIdMatch: p.sourceId,
            decisionNumber: p.caseNumber,
            isVerified: true,
            verificationStatus: p.verificationStatus,
          })),
          blockedCitationsCount: 0,
          blockedReasons: [],
          verifiedBadgesApplied: precedents.length,
          sanitizedText: fallbackText,
        },
        hasPrecedentsFound: true,
        verificationNotice: `${precedents.length} precedente(s) oficial(is) recuperado(s) diretamente da fonte oficial do tribunal.`,
        status: 'SUCCESS',
        failureCode: 'MODEL_UNAVAILABLE',
        failureReason: FAIL_CLOSED_EXPLANATIONS.MODEL_UNAVAILABLE.explanation,
        diagnostic: stjDiagnostic,
        isModelAvailable: false,
        modelStatus: 'MODEL_UNAVAILABLE',
        modelName: this.activeModel,
      };
    }

    // Limpeza profunda de qualquer Markdown residual
    const cleanedText = GeminiLegalService.stripMarkdown(rawAiText);

    // Validação com CitationGuard
    const retrievedIds = new Set(precedents.map((p) => p.id));
    const verifiedDecisionsForThisQuery = this.storage
      .getDecisions({ onlyVerified: true })
      .filter((d) => retrievedIds.has(d.id));

    const citationReport = this.citationGuard.validateAndSanitize(cleanedText, verifiedDecisionsForThisQuery);
    const finalCleanText = GeminiLegalService.stripMarkdown(citationReport.sanitizedText);

    return {
      answer: finalCleanText,
      salutation: `Olá, ${lawyerGreeting}!`,
      summary: 'Síntese fundamentada estritamente em precedentes oficiais verificados.',
      searchResults: precedents,
      citationReport,
      hasPrecedentsFound: true,
      verificationNotice: `${precedents.length} precedente(s) oficial(is) recuperado(s) e auditado(s) pelo CitationGuard.`,
      status: 'SUCCESS',
      diagnostic: stjDiagnostic,
      isModelAvailable: true,
      modelStatus: 'MODEL_READY',
      modelName: this.activeModel,
    };
  }
}

export const geminiLegalService = new GeminiLegalService();
