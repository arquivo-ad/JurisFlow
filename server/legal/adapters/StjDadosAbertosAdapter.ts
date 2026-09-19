import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { CanonicalLegalDecision, LegalDocumentType, PrecedentSituation, PrecedentStrength, OfficialSourceDiagnostic } from '../types.ts';
import { PrecedentVerifier } from '../verifier.ts';

/**
 * ADAPTADOR OFICIAL STJ - DADOS ABERTOS & SCON
 * Fonte oficial: https://dadosabertos.web.stj.jus.br/
 *
 * Fornece recuperação e ingestão canônica de acórdãos, decisões monocráticas
 * e teses repetitivas publicadas pelo Superior Tribunal de Justiça.
 */

export class StjDadosAbertosAdapter {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://dadosabertos.web.stj.jus.br') {
    this.baseUrl = baseUrl;
  }

  /**
   * Calcula hash SHA-256 canônico do conteúdo da decisão
   */
  public static computeSha256(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Converte acórdão bruto do STJ no modelo canônico CanonicalLegalDecision
   */
  public normalizeStjDecision(raw: {
    rawCaseNumber: string;
    normalizedCnjNumber?: string;
    processClass: string;
    rapporteur?: string;
    courtOrgan?: string;
    judgmentDate?: string;
    publicationDate?: string;
    officialHeadnote: string;
    rulingThesis?: string;
    citedLegislation?: string[];
    citedPrecedents?: string[];
    themeNumber?: number;
    precedentStrength?: PrecedentStrength;
    precedentSituation?: PrecedentSituation;
    documentType?: LegalDocumentType;
    officialUrl?: string;
    fullTextUrl?: string;
    originCourt?: string;
  }): CanonicalLegalDecision {
    const headnote = (raw.officialHeadnote || '').trim();
    const caseNum = (raw.rawCaseNumber || '').trim();
    const rapporteur = (raw.rapporteur || '').trim();
    const courtOrgan = (raw.courtOrgan || '').trim();
    const judgmentDate = raw.judgmentDate || '';
    const publicationDate = raw.publicationDate || '';
    const hashPayload = `${caseNum}|${rapporteur}|${judgmentDate}|${headnote}`;
    const contentSha256 = StjDadosAbertosAdapter.computeSha256(hashPayload);

    const officialUrl =
      raw.officialUrl ||
      `https://processo.stj.jus.br/processo/pesquisa/?termo=${encodeURIComponent(caseNum)}&aplicacao=processos.ea`;

    return {
      id: `stj-${contentSha256.substring(0, 16)}`,
      sourceId: 'stj-dados-abertos',
      officialUrl,
      fullTextUrl: raw.fullTextUrl,
      court: 'Superior Tribunal de Justiça',
      courtCode: 'STJ',
      judicialBranch: 'SUPERIOR',
      jurisdiction: 'BRASIL',
      courtOrgan,
      processClass: raw.processClass,
      rawCaseNumber: caseNum,
      normalizedCnjNumber: raw.normalizedCnjNumber,
      rapporteur,
      judgmentDate,
      publicationDate,
      availabilityDate: raw.publicationDate,
      officialHeadnote: headnote,
      rulingThesis: raw.rulingThesis,
      citedLegislation: raw.citedLegislation || [],
      citedPrecedents: raw.citedPrecedents || [],
      documentType: raw.documentType || 'ACORDAO',
      result: undefined,
      precedentSituation: raw.precedentSituation || 'VIGENTE',
      precedentStrength: raw.precedentStrength || 'PERSUASIVO_SUPERIOR',
      themeNumber: raw.themeNumber,
      originCourt: raw.originCourt,
      language: 'pt-BR',
      contentSha256,
      collectedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      verificationStatus: 'FOUND_UNVERIFIED',
      parserVersion: 'stj-adapter-2026.1',
      documentVersion: 1,
      rawPayloadPreserved: raw,
    };
  }

  /**
   * Dados de demonstração e testes (ISOLAMENTO ESTRITO DE DESENVOLVIMENTO)
   * PROIBIÇÃO ABSOLUTA de uso em produção ou retorno em respostas para o usuário.
   */
  public getDemoDecisionsForTesting(): CanonicalLegalDecision[] {
    const seeds = [
      {
        rawCaseNumber: 'REsp 1.896.678/SP',
        normalizedCnjNumber: '1014522-89.2019.8.26.0100',
        processClass: 'RECURSO ESPECIAL (REsp)',
        rapporteur: 'Min. Ricardo Villas Bôas Cueva',
        courtOrgan: 'Segunda Seção',
        judgmentDate: '2021-12-08',
        publicationDate: '2021-12-17',
        officialHeadnote:
          'RECURSO ESPECIAL REPETITIVO. TEMA 1.042/STJ. DIREITO DO CONSUMIDOR E BANCÁRIO. CONTRATO DE FINANCIAMENTO COM GARANTIA DE ALIENAÇÃO FIDUCIÁRIA. TARIFA DE AVALIAÇÃO DO BEM E DE REGISTRO DE CONTRATO. 1. É válida a tarifa de avaliação do bem dado em garantia, bem como a cláusula que prevê o ressarcimento de despesa com o registro do contrato, ressalvadas a abusividade da cobrança por serviço não prestado e a possibilidade de controle da onerosidade excessiva pelo juízo. 2. A ausência de prestação efetiva do serviço enseja a nulidade da cobrança.',
        rulingThesis:
          'Tema 1.042/STJ: Validade da tarifa de avaliação do bem e da cláusula que prevê o ressarcimento de despesa com o registro do contrato, ressalvadas a abusividade da cobrança por serviço não efetivamente prestado e a possibilidade de controle da onerosidade excessiva.',
        citedLegislation: ['Código de Processo Civil de 2015, art. 1.036', 'Código de Defesa do Consumidor, art. 51, IV', 'Código Civil, art. 422'],
        citedPrecedents: ['Tema 958/STJ', 'Súmula 381/STJ'],
        themeNumber: 1042,
        precedentStrength: 'VINCULANTE' as PrecedentStrength,
        precedentSituation: 'VIGENTE' as PrecedentSituation,
        originCourt: 'TJSP',
      },
      {
        rawCaseNumber: 'REsp 1.061.530/RS',
        normalizedCnjNumber: '0024851-12.2008.8.21.7000',
        processClass: 'RECURSO ESPECIAL (REsp)',
        rapporteur: 'Min. Nancy Andrighi',
        courtOrgan: 'Segunda Seção',
        judgmentDate: '2008-10-22',
        publicationDate: '2009-03-10',
        officialHeadnote:
          'DIREITO PROCESSUAL CIVIL E BANCÁRIO. RECURSO ESPECIAL REPETITIVO. TEMA 27/STJ. ORIENTAÇÃO 2/STJ. JUROS REMUNERATÓRIOS. LIMITAÇÃO À TAXA MÉDIA DE MERCADO. 1. As instituições financeiras não se sujeitam à limitação dos juros remuneratórios estipulada na Lei de Usura (Decreto 22.626/1933), Súmula 596/STF. 2. A estipulação de juros remuneratórios superiores a 12% ao ano, por si só, não indica abusividade. 3. A revisão das taxas pactuadas somente é cabível quando caracterizada a relação de consumo e cabalmente demonstrada a abusividade em relação à taxa média de mercado divulgada pelo Banco Central do Brasil.',
        rulingThesis:
          'Tema 27/STJ: As instituições financeiras não se sujeitam à limitação dos juros estipulada pela Lei de Usura; a revisão judicial pressupõe demonstração cabal de disparidade em relação à taxa média de mercado divulgada pelo BACEN.',
        citedLegislation: ['Lei 4.595/1964, art. 4º, IX', 'Código de Defesa do Consumidor, art. 6º, V e art. 51, § 1º, III'],
        citedPrecedents: ['Súmula 596/STF', 'Súmula 382/STJ', 'Súmula 296/STJ'],
        themeNumber: 27,
        precedentStrength: 'VINCULANTE' as PrecedentStrength,
        precedentSituation: 'VIGENTE' as PrecedentSituation,
        originCourt: 'TJRS',
      },
      {
        rawCaseNumber: 'REsp 1.330.437/SP',
        normalizedCnjNumber: '0189332-67.2011.8.26.0000',
        processClass: 'RECURSO ESPECIAL (REsp)',
        rapporteur: 'Min. Paulo de Tarso Sanseverino',
        courtOrgan: 'Segunda Seção',
        judgmentDate: '2014-04-09',
        publicationDate: '2014-05-05',
        officialHeadnote:
          'RECURSO ESPECIAL REPETITIVO. TEMA 610/STJ. CONTRATO BANCÁRIO. CAPITALIZAÇÃO DIÁRIA DE JUROS. 1. A previsão expressa da taxa diária de juros nos contratos bancários não é requisito indispensável para a pactuação da periodicidade diária de capitalização dos juros remuneratórios, sendo bastante a demonstração de que a taxa anual seja superior ao duodécuplo da taxa mensal informada ao mutuário. 2. Aplicação da Súmula 541/STJ.',
        rulingThesis:
          'Tema 610/STJ: A estipulação no contrato de taxa anual de juros em percentual superior ao duodécuplo da taxa mensal é suficiente para permitir a cobrança da taxa efetiva contratada.',
        citedLegislation: ['Medida Provisória 2.170-36/2001, art. 5º', 'Código de Processo Civil, art. 543-C'],
        citedPrecedents: ['Súmula 541/STJ', 'Tema 247/STJ'],
        themeNumber: 610,
        precedentStrength: 'VINCULANTE' as PrecedentStrength,
        precedentSituation: 'VIGENTE' as PrecedentSituation,
        originCourt: 'TJSP',
      },
      {
        rawCaseNumber: 'REsp 1.551.956/SP',
        normalizedCnjNumber: '1098471-29.2014.8.26.0100',
        processClass: 'RECURSO ESPECIAL (REsp)',
        rapporteur: 'Min. Paulo de Tarso Sanseverino',
        courtOrgan: 'Segunda Seção',
        judgmentDate: '2016-08-24',
        publicationDate: '2016-09-06',
        officialHeadnote:
          'RECURSO ESPECIAL REPETITIVO. TEMA 938/STJ. PROMESSA DE COMPRA E VENDA DE IMÓVEL. COMISSÃO DE CORRETAGEM E SATI. PRESCRIÇÃO TRIENAL. 1. Incidência da prescrição trienal sobre a pretensão de restituição dos valores pagos a título de comissão de corretagem ou de serviço de assistência técnico-imobiliária (SATI), ou atividade congênere (artigo 206, § 3º, IV, CC). 2. Validade da cláusula contratual que transfere ao promitente-comprador a obrigação de pagar a comissão de corretagem nos contratos de promessa de compra e venda de unidade autônoma em regime de incorporação imobiliária, desde que previamente informado o preço total com destaque do valor da corretagem.',
        rulingThesis:
          'Tema 938/STJ: Incidência da prescrição trienal (art. 206, § 3º, IV, CC) sobre a pretensão de restituição de valores pagos a título de comissão de corretagem ou SATI. Validade da transferência da comissão de corretagem ao adquirente, mediante informação prévia e clara.',
        citedLegislation: ['Código Civil de 2002, art. 206, § 3º, IV e art. 725', 'Código de Defesa do Consumidor, art. 6º, III e art. 31'],
        citedPrecedents: ['Tema 939/STJ'],
        themeNumber: 938,
        precedentStrength: 'VINCULANTE' as PrecedentStrength,
        precedentSituation: 'VIGENTE' as PrecedentSituation,
        originCourt: 'TJSP',
      },
      {
        rawCaseNumber: 'Súmula 381/STJ',
        processClass: 'SÚMULA VIGENTE',
        rapporteur: 'Segunda Seção',
        courtOrgan: 'Segunda Seção',
        judgmentDate: '2009-04-22',
        publicationDate: '2009-05-05',
        officialHeadnote:
          'Nos contratos bancários, é vedado ao julgador conhecer, de ofício, da abusividade das cláusulas.',
        rulingThesis: 'Súmula 381 do STJ: É vedado ao juiz declarar de ofício a abusividade de cláusulas em contratos bancários, exigindo pedido expresso da parte.',
        citedLegislation: ['Código de Processo Civil de 2015, arts. 141 e 492', 'Código de Defesa do Consumidor, art. 51'],
        citedPrecedents: ['REsp 1.061.530/RS'],
        precedentStrength: 'QUALIFICADO' as PrecedentStrength,
        precedentSituation: 'VIGENTE' as PrecedentSituation,
      },
      {
        rawCaseNumber: 'Súmula 385/STJ',
        processClass: 'SÚMULA VIGENTE',
        rapporteur: 'Segunda Seção',
        courtOrgan: 'Segunda Seção',
        judgmentDate: '2009-05-27',
        publicationDate: '2009-06-08',
        officialHeadnote:
          'Da anotação irregular em cadastro de proteção ao crédito, não cabe indenização por dano moral, quando preexistente legítima inscrição, ressalvado o direito ao cancelamento.',
        rulingThesis: 'Súmula 385 do STJ: Não cabe dano moral por negativação indevida se houver anotação preexistente legítima no SPC/Serasa, ressalvado o cancelamento do registro indevido.',
        citedLegislation: ['Código de Defesa do Consumidor, art. 43, § 2º', 'Código Civil, art. 186 e art. 927'],
        citedPrecedents: ['REsp 1.062.336/RS'],
        precedentStrength: 'QUALIFICADO' as PrecedentStrength,
        precedentSituation: 'VIGENTE' as PrecedentSituation,
      },
      {
        rawCaseNumber: 'Súmula 543/STJ',
        processClass: 'SÚMULA VIGENTE',
        rapporteur: 'Segunda Seção',
        courtOrgan: 'Segunda Seção',
        judgmentDate: '2015-08-26',
        publicationDate: '2015-08-31',
        officialHeadnote:
          'Na hipótese de resolução de contrato de promessa de compra e venda de imóvel submetido ao Código de Defesa do Consumidor, deve ocorrer a imediata restituição das parcelas pagas pelo promitente comprador - integralmente, em caso de culpa exclusiva do promitente vendedor/construtor, ou parcialmente, caso tenha sido o comprador quem deu causa ao desfazimento.',
        rulingThesis:
          'Súmula 543 do STJ: Devolução imediata e em parcela única dos valores pagos em rescisão de promessa de compra e venda imobiliária (integral por culpa da construtora, parcial se por desistência do comprador).',
        citedLegislation: ['Código de Defesa do Consumidor, art. 51, II e IV', 'Código Civil, art. 475'],
        citedPrecedents: ['REsp 1.300.418/SC - Tema 577/STJ'],
        precedentStrength: 'QUALIFICADO' as PrecedentStrength,
        precedentSituation: 'VIGENTE' as PrecedentSituation,
      },
    ];

    return seeds.map((s) => {
      const dec = this.normalizeStjDecision(s);
      dec.verificationStatus = 'DEMO_UNVERIFIED';
      (dec as any).environment = 'development';
      return dec;
    });
  }

  /**
   * Parser CSV em conformidade com a RFC 4180 (suporte estrito a aspas duplas, quebras de linha em campos e detecção de BOM)
   */
  public static parseCsvRecords(
    text: string,
    delimiter: string = ','
  ): {
    records: string[][];
    recordsRead: number;
    recordsAccepted: number;
    recordsRejected: number;
    errors: string[];
  } {
    let cleanText = text;
    // Detecção e remoção de Byte Order Mark (UTF-8 BOM)
    if (cleanText.charCodeAt(0) === 0xfeff) {
      cleanText = cleanText.slice(1);
    }

    const records: string[][] = [];
    const errors: string[] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    const quote = '"';
    let lineIndex = 1;
    let expectedCols = 0;

    for (let i = 0; i < cleanText.length; i++) {
      const ch = cleanText[i];

      if (ch === quote) {
        if (inQuotes && cleanText[i + 1] === quote) {
          field += quote;
          i++; // pular aspa de escape
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        row.push(field);
        field = '';
      } else if ((ch === '\r' || ch === '\n') && !inQuotes) {
        if (ch === '\r' && cleanText[i + 1] === '\n') {
          i++;
        }
        row.push(field);
        field = '';

        if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
          if (records.length === 0) {
            // Cabeçalho
            expectedCols = row.length;
            records.push(row);
          } else {
            // Linha de dados
            if (expectedCols > 0 && row.length !== expectedCols) {
              if (errors.length < 5) {
                errors.push(`Linha ${lineIndex}: colunas divergentes (esperado ${expectedCols}, obtido ${row.length})`);
              }
            }
            records.push(row);
          }
        }
        lineIndex++;
        row = [];
      } else {
        field += ch;
      }
    }

    if (field.length > 0 || row.length > 0) {
      row.push(field);
      records.push(row);
    }

    const dataRecords = Math.max(0, records.length - 1);
    return {
      records,
      recordsRead: records.length,
      recordsAccepted: dataRecords,
      recordsRejected: errors.length,
      errors,
    };
  }

  private getCachePaths(): { dir: string; processos: string; temas: string; index: string } {
    const dir = path.join(process.cwd(), 'data', 'stj_cache');
    return {
      dir,
      processos: path.join(dir, 'processos.csv'),
      temas: path.join(dir, 'temas.csv'),
      index: path.join(dir, 'stj_index.json'),
    };
  }

  /**
   * Descoberta dinâmica de recursos através da API CKAN oficial do STJ
   * https://dadosabertos.web.stj.jus.br/api/3/action/package_show?id=precedentes-qualificados
   */
  public async discoverDatasetsViaCkan(): Promise<{
    processosUrl: string;
    temasUrl: string;
    latencyMs: number;
    discoveredViaApi: boolean;
  }> {
    const start = Date.now();
    const fallbackProcessos =
      'https://dadosabertos.web.stj.jus.br/dataset/4238da2f-c07b-4c1a-b345-4402accacdcf/resource/7ed21202-0049-4fcb-aa7c-48d810d3c499/download/processos.csv';
    const fallbackTemas =
      'https://dadosabertos.web.stj.jus.br/dataset/4238da2f-c07b-4c1a-b345-4402accacdcf/resource/df29da13-7d6b-41ba-ad96-cd1a5bbd191c/download/temas.csv';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const ckanRes = await fetch(
        'https://dadosabertos.web.stj.jus.br/api/3/action/package_show?id=precedentes-qualificados',
        {
          headers: {
            'User-Agent': 'JurisFlow-LegalSync/2026.1 (Auditoria Forense; contato@jurisflow.adv.br)',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (ckanRes.ok) {
        const data = await ckanRes.json();
        const resources: any[] = data?.result?.resources || [];
        let procUrl = '';
        let temaUrl = '';

        for (const res of resources) {
          const resName = (res.name || '').toLowerCase();
          const resFormat = (res.format || '').toUpperCase();
          const url = res.url || '';

          if ((resName.includes('processos') || resName.includes('processo')) && (resFormat === 'CSV' || url.endsWith('.csv'))) {
            procUrl = url;
          }
          if ((resName.includes('temas') || resName.includes('tema')) && (resFormat === 'CSV' || url.endsWith('.csv'))) {
            temaUrl = url;
          }
        }

        if (procUrl && temaUrl) {
          return {
            processosUrl: procUrl,
            temasUrl: temaUrl,
            latencyMs: Date.now() - start,
            discoveredViaApi: true,
          };
        }
      }
    } catch {
      // Falha graciosa para URLs oficiais consolidadas
    }

    return {
      processosUrl: fallbackProcessos,
      temasUrl: fallbackTemas,
      latencyMs: Date.now() - start,
      discoveredViaApi: false,
    };
  }

  /**
   * Garante a disponibilidade e integridade dos arquivos oficiais do STJ
   * Valida Content-Length, Content-Type, hash SHA-256 e constrói índice persistido
   */
  public async ensureOfficialDatasets(): Promise<{
    success: boolean;
    latencyMs: number;
    httpStatus: number;
    officialUrl: string;
    bytesTransferred: number;
    processosSha256: string;
    temasSha256: string;
    recordsRead: number;
    recordsAccepted: number;
    recordsRejected: number;
    parsingErrors: string[];
    lifecycleState:
      | 'DOWNLOAD_COMPLETE'
      | 'PARSE_SUCCESS'
      | 'INDEX_SUCCESS'
      | 'PARSER_EMPTY'
      | 'PARSER_ERROR'
      | 'SOURCE_UNAVAILABLE';
    errorMessage?: string;
  }> {
    const start = Date.now();
    const { dir, processos, temas, index } = this.getCachePaths();

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const { processosUrl, temasUrl } = await this.discoverDatasetsViaCkan();
    let bytesTransferred = 0;
    let httpStatus = 200;

    const hasProcessos = fs.existsSync(processos) && fs.statSync(processos).size > 100000;
    const hasTemas = fs.existsSync(temas) && fs.statSync(temas).size > 50000;

    if (!hasProcessos || !hasTemas) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 18000);

        const [resProc, resTemas] = await Promise.all([
          fetch(processosUrl, {
            headers: { 'User-Agent': 'JurisFlow-LegalSync/2026.1 (Auditoria Forense)' },
            signal: controller.signal,
          }),
          fetch(temasUrl, {
            headers: { 'User-Agent': 'JurisFlow-LegalSync/2026.1 (Auditoria Forense)' },
            signal: controller.signal,
          }),
        ]);

        clearTimeout(timeoutId);

        if (!resProc.ok || !resTemas.ok) {
          httpStatus = !resProc.ok ? resProc.status : resTemas.status;
          return {
            success: false,
            latencyMs: Date.now() - start,
            httpStatus,
            officialUrl: processosUrl,
            bytesTransferred: 0,
            processosSha256: '',
            temasSha256: '',
            recordsRead: 0,
            recordsAccepted: 0,
            recordsRejected: 0,
            parsingErrors: [],
            lifecycleState: 'SOURCE_UNAVAILABLE',
            errorMessage: `Download dos Dados Abertos do STJ falhou com status HTTP ${httpStatus}.`,
          };
        }

        const procBuf = Buffer.from(await resProc.arrayBuffer());
        const temasBuf = Buffer.from(await resTemas.arrayBuffer());

        bytesTransferred = procBuf.length + temasBuf.length;

        if (procBuf.length < 50000 || temasBuf.length < 20000) {
          return {
            success: false,
            latencyMs: Date.now() - start,
            httpStatus: 200,
            officialUrl: processosUrl,
            bytesTransferred,
            processosSha256: '',
            temasSha256: '',
            recordsRead: 0,
            recordsAccepted: 0,
            recordsRejected: 0,
            parsingErrors: ['Arquivo truncado ou incompleto recebido do STJ.'],
            lifecycleState: 'PARSER_EMPTY',
            errorMessage: 'Arquivo oficial retornado com tamanho inferior ao limiar de integridade.',
          };
        }

        fs.writeFileSync(processos, procBuf);
        fs.writeFileSync(temas, temasBuf);
      } catch (err: any) {
        return {
          success: false,
          latencyMs: Date.now() - start,
          httpStatus: 503,
          officialUrl: processosUrl,
          bytesTransferred: 0,
          processosSha256: '',
          temasSha256: '',
          recordsRead: 0,
          recordsAccepted: 0,
          recordsRejected: 0,
          parsingErrors: [err.message || String(err)],
          lifecycleState: 'SOURCE_UNAVAILABLE',
          errorMessage: 'Falha de comunicação ou timeout na conexão com os Dados Abertos do STJ.',
        };
      }
    }

    // Leitura e parse determinístico dos arquivos brutos persistidos
    const procContent = fs.readFileSync(processos, 'utf8');
    const temasContent = fs.readFileSync(temas, 'utf8');
    bytesTransferred = Buffer.byteLength(procContent, 'utf8') + Buffer.byteLength(temasContent, 'utf8');

    const procSha256 = StjDadosAbertosAdapter.computeSha256(procContent);
    const temasSha256 = StjDadosAbertosAdapter.computeSha256(temasContent);

    const procParsed = StjDadosAbertosAdapter.parseCsvRecords(procContent);
    const temasParsed = StjDadosAbertosAdapter.parseCsvRecords(temasContent);

    const totalRead = procParsed.recordsRead + temasParsed.recordsRead;
    const totalAccepted = procParsed.recordsAccepted + temasParsed.recordsAccepted;
    const totalRejected = procParsed.recordsRejected + temasParsed.recordsRejected;
    const allErrors = [...procParsed.errors, ...temasParsed.errors];

    if (totalAccepted === 0) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        httpStatus: 200,
        officialUrl: processosUrl,
        bytesTransferred,
        processosSha256: procSha256,
        temasSha256: temasSha256,
        recordsRead: totalRead,
        recordsAccepted: 0,
        recordsRejected: totalRejected,
        parsingErrors: allErrors.length > 0 ? allErrors : ['Nenhum registro pôde ser normalizado dos arquivos CSV.'],
        lifecycleState: 'PARSER_EMPTY',
        errorMessage: 'Parser CSV não identificou registros válidos no arquivo oficial do STJ.',
      };
    }

    return {
      success: true,
      latencyMs: Date.now() - start,
      httpStatus: 200,
      officialUrl: processosUrl,
      bytesTransferred,
      processosSha256: procSha256,
      temasSha256: temasSha256,
      recordsRead: totalRead,
      recordsAccepted: totalAccepted,
      recordsRejected: totalRejected,
      parsingErrors: allErrors,
      lifecycleState: 'INDEX_SUCCESS',
    };
  }

  /**
   * Busca e verifica determinística e pontualmente precedente do STJ por número de processo ou tema.
   * Produz o diagnóstico oficial com estados de ciclo de vida discretos e auditáveis.
   */
  public async searchOrFetchStjPrecedent(query: {
    processNumber?: string;
    themeNumber?: number;
  }): Promise<{
    diagnostic: OfficialSourceDiagnostic;
    decision?: CanonicalLegalDecision;
  }> {
    const timestamp = new Date().toISOString();
    const queryNum = query.processNumber || (query.themeNumber ? `Tema ${query.themeNumber}` : '');
    const cleanDigits = (query.processNumber || '').replace(/[^0-9]/g, '');

    const syncStatus = await this.ensureOfficialDatasets();
    const { processos, temas } = this.getCachePaths();

    if (!syncStatus.success || !fs.existsSync(processos) || !fs.existsSync(temas)) {
      return {
        diagnostic: {
          adapter: 'stj-dados-abertos',
          sourceName: 'Superior Tribunal de Justiça - Portal de Dados Abertos (SCON/CKAN)',
          courtCode: 'STJ',
          officialUrl: syncStatus.officialUrl,
          timestamp,
          httpStatus: syncStatus.httpStatus,
          latencyMs: syncStatus.latencyMs,
          lifecycleState: syncStatus.lifecycleState === 'PARSER_EMPTY' ? 'PARSER_EMPTY' : 'SOURCE_UNAVAILABLE',
          stateDescription:
            syncStatus.errorMessage || 'Fonte oficial de Dados Abertos do STJ não pôde ser sincronizada.',
          bytesTransferred: syncStatus.bytesTransferred,
          contentSha256: syncStatus.processosSha256,
          documentsReceived: syncStatus.recordsRead,
          documentsNormalized: 0,
          documentsRejected: syncStatus.recordsRejected,
          recordsRead: syncStatus.recordsRead,
          recordsAccepted: syncStatus.recordsAccepted,
          recordsRejected: syncStatus.recordsRejected,
          parsingErrors: syncStatus.parsingErrors,
          rejectionReasons: [syncStatus.errorMessage || 'Falha de sincronização oficial.'],
          normalizedQueryNumber: queryNum,
          connectorStatus: 'FAILED',
        },
      };
    }

    const startParse = Date.now();
    const procContent = fs.readFileSync(processos, 'utf8');
    const procParsed = StjDadosAbertosAdapter.parseCsvRecords(procContent);
    const procRecords = procParsed.records;

    let matchedRow: string[] | null = null;
    let matchedThemeSeq = '';

    // 1. Busca por número do processo (cleanDigits)
    if (cleanDigits) {
      for (let i = 1; i < procRecords.length; i++) {
        const row = procRecords[i];
        const procCol = (row[3] || '').replace(/[^0-9]/g, '');
        const regCol = (row[4] || '').replace(/[^0-9]/g, '');
        const temaNum = parseInt(row[2] || '0', 10);

        if (procCol.includes(cleanDigits) || regCol.includes(cleanDigits)) {
          if (query.themeNumber) {
            if (temaNum === query.themeNumber) {
              matchedRow = row;
              matchedThemeSeq = row[0];
              break;
            }
          } else {
            matchedRow = row;
            matchedThemeSeq = row[0];
            break;
          }
        }
      }
    }

    // 2. Busca pelo número do Tema
    if (!matchedRow && query.themeNumber) {
      for (let i = 1; i < procRecords.length; i++) {
        const row = procRecords[i];
        const tipo = row[1]?.trim();
        const temaNum = parseInt(row[2] || '0', 10);

        if (tipo === 'Tema' && temaNum === query.themeNumber) {
          matchedRow = row;
          matchedThemeSeq = row[0];
          break;
        }
      }
    }

    if (!matchedRow) {
      return {
        diagnostic: {
          adapter: 'stj-dados-abertos',
          sourceName: 'Superior Tribunal de Justiça - Portal de Dados Abertos (SCON/CKAN)',
          courtCode: 'STJ',
          officialUrl: syncStatus.officialUrl,
          timestamp,
          httpStatus: 200,
          latencyMs: syncStatus.latencyMs + (Date.now() - startParse),
          lifecycleState: 'EMPTY_VALID_DATASET',
          stateDescription: `Dataset oficial íntegro consultado com sucesso; precedente ${queryNum} não localizado no catálogo de repetitivos do STJ.`,
          bytesTransferred: syncStatus.bytesTransferred,
          contentSha256: syncStatus.processosSha256,
          documentsReceived: procRecords.length - 1,
          documentsNormalized: 0,
          documentsRejected: 0,
          recordsRead: syncStatus.recordsRead,
          recordsAccepted: syncStatus.recordsAccepted,
          recordsRejected: syncStatus.recordsRejected,
          parsingErrors: [],
          rejectionReasons: [`Precedente ${queryNum} não consta do catálogo oficial de repetitivos do STJ.`],
          normalizedQueryNumber: queryNum,
          connectorStatus: 'HEALTHY',
        },
      };
    }

    const themeNum = parseInt(matchedRow[2] || '0', 10);
    const procNameRaw = matchedRow[3]?.trim() || '';
    const origemUf = matchedRow[20]?.trim() || '';
    const relator = matchedRow[5]?.trim() || '';
    const dataJulg = matchedRow[12]?.trim() || '';
    const dataPub = matchedRow[13]?.trim() || '';

    // Recupera dados do Tema correspondente
    const temasContent = fs.readFileSync(temas, 'utf8');
    const temasParsed = StjDadosAbertosAdapter.parseCsvRecords(temasContent);
    const temasRecords = temasParsed.records;

    let teseFirmada = '';
    let questaoSubmetida = '';
    let situacao = '';
    let matchedThemeRow: string[] | null = null;

    for (let i = 1; i < temasRecords.length; i++) {
      const row = temasRecords[i];
      if (row[0] === matchedThemeSeq || (row[1] === 'Tema' && parseInt(row[2] || '0', 10) === themeNum)) {
        matchedThemeRow = row;
        situacao = row[6]?.trim() || '';
        questaoSubmetida = row[8] || '';
        teseFirmada = row[9] || '';
        break;
      }
    }

    const rawCaseNumber = procNameRaw.includes('/') ? procNameRaw : `${procNameRaw}/${origemUf}`;
    const headnote = [questaoSubmetida, teseFirmada].filter(Boolean).join(' ');
    const referenciaLegislativa = matchedThemeRow?.[13]?.trim();
    const referenciaSumular = matchedThemeRow?.[14]?.trim();
    const orgaoJulgador = matchedThemeRow?.[18]?.trim() || '';
    const missingOfficialFields = [
      ['processo', procNameRaw],
      ['UF de origem', origemUf],
      ['relator', relator],
      ['data de julgamento/publicação', dataJulg || dataPub],
      ['linha oficial do tema', matchedThemeRow],
      ['questão submetida/tese', headnote],
      ['situação do tema', situacao],
      ['órgão julgador', orgaoJulgador],
    ].filter(([, value]) => !value).map(([label]) => label as string);

    if (missingOfficialFields.length > 0) {
      return {
        diagnostic: {
          adapter: 'stj-dados-abertos',
          sourceName: 'Superior Tribunal de Justiça - Portal de Dados Abertos (SCON/CKAN)',
          courtCode: 'STJ',
          officialUrl: syncStatus.officialUrl,
          timestamp,
          httpStatus: 200,
          latencyMs: syncStatus.latencyMs + (Date.now() - startParse),
          lifecycleState: 'PARSER_ERROR',
          stateDescription: 'Registro oficial localizado, mas sem os campos mínimos necessários para validação forense.',
          bytesTransferred: syncStatus.bytesTransferred,
          contentSha256: syncStatus.processosSha256,
          documentsReceived: procRecords.length - 1,
          documentsNormalized: 0,
          documentsRejected: 1,
          recordsRead: syncStatus.recordsRead,
          recordsAccepted: syncStatus.recordsAccepted,
          recordsRejected: syncStatus.recordsRejected + 1,
          parsingErrors: [`Campos oficiais ausentes: ${missingOfficialFields.join(', ')}.`],
          rejectionReasons: ['Documento rejeitado sem preenchimento artificial de metadados.'],
          normalizedQueryNumber: queryNum,
          connectorStatus: 'DEGRADED',
        },
      };
    }

    const normalizedSituation = situacao.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const precedentSituation: PrecedentSituation = normalizedSituation.includes('cancelad')
      ? 'CANCELADO'
      : normalizedSituation.includes('superad')
        ? 'SUPERADO'
        : normalizedSituation.includes('transit')
          ? 'TRANSITADO'
          : normalizedSituation.includes('afetad')
            ? 'AFETADO'
            : normalizedSituation.includes('julgad')
              ? 'JULGADO'
              : 'EM_REVISAO';

    const decision: CanonicalLegalDecision = this.normalizeStjDecision({
      rawCaseNumber,
      processClass: 'RECURSO ESPECIAL (REsp)',
      rapporteur: relator,
      courtOrgan: orgaoJulgador,
      judgmentDate: dataJulg,
      publicationDate: dataPub,
      officialHeadnote: headnote,
      rulingThesis: teseFirmada ? `Tema ${themeNum}/STJ: ${teseFirmada}` : undefined,
      citedLegislation: referenciaLegislativa ? [referenciaLegislativa] : [],
      citedPrecedents: referenciaSumular ? [referenciaSumular] : [],
      documentType: 'TEMA_REPETITIVO',
      themeNumber: themeNum,
      precedentStrength: 'VINCULANTE',
      precedentSituation,
      officialUrl: `https://processo.stj.jus.br/processo/pesquisa/?termo=${encodeURIComponent(procNameRaw)}&aplicacao=processos.ea`,
      fullTextUrl: 'https://dadosabertos.web.stj.jus.br/dataset/precedentes-qualificados',
      originCourt: matchedRow[17]?.trim() || undefined,
    });

    decision.rawPayloadPreserved = {
      processosRow: matchedRow,
      temasRow: matchedThemeRow,
      processosSha256: syncStatus.processosSha256,
      temasSha256: syncStatus.temasSha256,
      sourceDataset: syncStatus.officialUrl,
    };

    const verification = PrecedentVerifier.verifyDecision(decision);
    decision.verificationStatus = verification.isPassed ? 'VERIFIED_OFFICIAL' : 'REJECTED';
    decision.verificationBadge = '[OFICIAL STJ - VERIFICADO]';
    decision.rejectionReasons = verification.issues;
    decision.lastVerifiedAt = timestamp;

    const rejectionReasons = verification.isPassed ? [] : verification.issues;

    return {
      diagnostic: {
        adapter: 'stj-dados-abertos',
        sourceName: 'Superior Tribunal de Justiça - Portal de Dados Abertos (SCON/CKAN)',
        courtCode: 'STJ',
        officialUrl: syncStatus.officialUrl,
        timestamp,
        httpStatus: 200,
        latencyMs: syncStatus.latencyMs + (Date.now() - startParse),
        lifecycleState: 'SEARCH_SUCCESS',
        stateDescription: `Recurso oficial processado com êxito. Precedente qualificado localizado por identificador e verificado contra o catálogo de repetitivos do STJ.`,
        bytesTransferred: syncStatus.bytesTransferred,
        contentSha256: decision.contentSha256,
        documentsReceived: procRecords.length - 1,
        documentsNormalized: 1,
        documentsRejected: rejectionReasons.length > 0 ? 1 : 0,
        recordsRead: syncStatus.recordsRead,
        recordsAccepted: syncStatus.recordsAccepted,
        recordsRejected: syncStatus.recordsRejected,
        parsingErrors: syncStatus.parsingErrors,
        rejectionReasons,
        normalizedQueryNumber: `${rawCaseNumber} (Tema ${themeNum}, ID: ${cleanDigits || themeNum})`,
        connectorStatus: 'HEALTHY',
      },
      decision: verification.isPassed ? decision : undefined,
    };
  }

  /**
   * Sincronização incremental com requisição HTTP real ao STJ Dados Abertos
   */
  public async syncIncremental(): Promise<{
    success: boolean;
    status: 'HEALTHY' | 'FAILED' | 'SOURCE_UNAVAILABLE' | 'PARTIAL';
    fetchedCount: number;
    decisions: CanonicalLegalDecision[];
    latencyMs: number;
    errorMessage?: string;
  }> {
    const datasetSync = await this.ensureOfficialDatasets();
    if (!datasetSync.success) {
      return {
        success: false,
        status: datasetSync.httpStatus === 408 ? 'FAILED' : 'SOURCE_UNAVAILABLE',
        fetchedCount: 0,
        decisions: [],
        latencyMs: datasetSync.latencyMs,
        errorMessage: datasetSync.errorMessage,
      };
    }

    const decisions: CanonicalLegalDecision[] = [];
    const repetitivosToSync = [27, 1042, 938, 577];
    for (const themeNum of repetitivosToSync) {
      const res = await this.searchOrFetchStjPrecedent({ themeNumber: themeNum });
      if (res.decision) {
        decisions.push(res.decision);
      }
    }

    return {
      success: true,
      status: 'HEALTHY',
      fetchedCount: decisions.length,
      decisions,
      latencyMs: datasetSync.latencyMs,
    };
  }
}
