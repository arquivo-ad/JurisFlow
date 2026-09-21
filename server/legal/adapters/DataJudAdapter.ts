import crypto from 'node:crypto';
import { CaseMetadata, CourtMovement } from '../types.ts';
import { isExactDataJudSearchUrl } from '../officialSources.ts';

/**
 * ADAPTADOR OFICIAL CNJ / DATAJUD
 * Documentação:
 * - https://www.cnj.jus.br/sistemas/datajud/api-publica/
 * - https://datajud-wiki.cnj.jus.br/api-publica/acesso/
 * - https://datajud-wiki.cnj.jus.br/api-publica/endpoints/
 *
 * Finalidade: Confirmar existência e identidade do processo, recuperar capa,
 * tribunal, grau, classe, assuntos TPU, órgão julgador e movimentações.
 */

// A chave pública do CNJ pode mudar. Ela deve ser configurada no ambiente e
// nunca ficar embutida no código-fonte. A leitura ocorre na construção para
// respeitar o bootstrap do .env e permitir testes com chave explicitamente vazia.
const DATAJUD_BASE_URL = 'https://api-publica.datajud.cnj.jus.br';

export class DataJudAdapter {
  private apiKey: string;
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private timeoutMs: number;

  constructor(apiKey?: string, baseUrl?: string, fetchImpl: typeof fetch = fetch, timeoutMs = 30_000) {
    this.apiKey = apiKey === undefined ? (process.env.DATAJUD_API_KEY?.trim() || '') : apiKey.trim();
    this.baseUrl = (baseUrl || DATAJUD_BASE_URL).replace(/\/+$/, '');
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  public static sha256(value: string): string {
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
  }

  public isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /** Validação oficial do dígito verificador CNJ (ISO 7064 / módulo 97). */
  public static isValidCnjNumber(input: string): boolean {
    const digits = (input || '').replace(/\D/g, '');
    if (digits.length !== 20 || /^0{20}$/.test(digits)) return false;

    // NNNNNNN-DD.AAAA.J.TR.OOOO -> NNNNNNNAAAAJTROOOODD
    const reordered = `${digits.slice(0, 7)}${digits.slice(9)}${digits.slice(7, 9)}`;
    try {
      return BigInt(reordered) % 97n === 1n;
    } catch {
      return false;
    }
  }

  /**
   * Normaliza número CNJ para padrão NNNNNNN-DD.AAAA.J.TR.OOOO (20 dígitos + pontuação)
   */
  public static normalizeCnjNumber(input: string): string | null {
    if (!input) return null;
    const digitsOnly = input.replace(/\D/g, '');
    if (digitsOnly.length !== 20 || !DataJudAdapter.isValidCnjNumber(digitsOnly)) {
      return null;
    }
    // Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
    const n = digitsOnly.substring(0, 7);
    const d = digitsOnly.substring(7, 9);
    const a = digitsOnly.substring(9, 13);
    const j = digitsOnly.substring(13, 14);
    const tr = digitsOnly.substring(14, 16);
    const o = digitsOnly.substring(16, 20);
    return `${n}-${d}.${a}.${j}.${tr}.${o}`;
  }

  /**
   * Extrai o código do tribunal a partir do dígito J e TR do número CNJ
   * J=8 -> Justiça Estadual (ex: TR=26 -> TJSP, TR=19 -> TJRJ, TR=13 -> TJMG)
   * J=4 -> Justiça Federal (ex: TR=03 -> TRF3)
   * J=5 -> Justiça do Trabalho (ex: TR=02 -> TRT2)
   */
  public static extractCourtFromCnj(cnj: string): { courtCode: string; judicialBranch: string } {
    const norm = DataJudAdapter.normalizeCnjNumber(cnj);
    if (!norm) return { courtCode: 'INDEFINIDO', judicialBranch: 'GERAL' };

    const parts = norm.split('.');
    const j = parts[2]?.charAt(0);
    const tr = parts[3];

    if (j === '8') {
      const stateMap: Record<string, string> = {
        '01': 'TJAC', '02': 'TJAL', '03': 'TJAP', '04': 'TJAM', '05': 'TJBA', '06': 'TJCE',
        '07': 'TJDFT', '08': 'TJES', '09': 'TJGO', '10': 'TJMA', '11': 'TJMT', '12': 'TJMS',
        '13': 'TJMG', '14': 'TJPA', '15': 'TJPB', '16': 'TJPR', '17': 'TJPE', '18': 'TJPI',
        '19': 'TJRJ', '20': 'TJRN', '21': 'TJRS', '22': 'TJRO', '23': 'TJRR', '24': 'TJSC',
        '25': 'TJSE', '26': 'TJSP', '27': 'TJTO',
      };
      return { courtCode: stateMap[tr] || 'INDEFINIDO', judicialBranch: 'ESTADUAL' };
    } else if (j === '4') {
      return { courtCode: `TRF${parseInt(tr, 10)}`, judicialBranch: 'FEDERAL' };
    } else if (j === '5') {
      return { courtCode: `TRT${parseInt(tr, 10)}`, judicialBranch: 'TRABALHO' };
    } else if (j === '1') {
      return { courtCode: 'STF', judicialBranch: 'SUPERIOR' };
    } else if (j === '2') {
      return { courtCode: 'CNJ', judicialBranch: 'CONSELHO' };
    } else if (j === '3') {
      return { courtCode: 'STJ', judicialBranch: 'SUPERIOR' };
    }

    return { courtCode: 'TRIBUNAL_ESTADUAL', judicialBranch: 'GERAL' };
  }

  /**
   * Consulta oficial de metadados processuais via DataJud API
   */
  public async queryProcessByCnj(cnjNumber: string): Promise<{
    success: boolean;
    metadata?: CaseMetadata;
    movements?: CourtMovement[];
    error?: string;
    statusCode?: number;
    rawPayload?: any;
    evidence?: {
      queryId: string;
      endpoint: string;
      querySha256: string;
      responseSha256: string;
      recordSha256: string;
      verifiedAt: string;
      httpStatus: number;
      latencyMs: number;
    };
  }> {
    const normalized = DataJudAdapter.normalizeCnjNumber(cnjNumber);
    if (!normalized) {
      return {
        success: false,
        error: `Número CNJ inválido: "${cnjNumber}". Verifique o formato e os dígitos verificadores.`,
        statusCode: 400,
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Conector DataJud não configurado: defina DATAJUD_API_KEY no ambiente.',
        statusCode: 503,
      };
    }

    const { courtCode } = DataJudAdapter.extractCourtFromCnj(normalized);
    if (courtCode === 'INDEFINIDO') {
      return { success: false, statusCode: 422, error: 'Tribunal do número CNJ não possui alias DataJud validado.' };
    }
    // Endpoint do DataJud para busca por processo por tribunal:
    // POST /api_publica_{sigla_tribunal}/_search
    const endpointAlias = courtCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const url = `${this.baseUrl}/api_publica_${endpointAlias}/_search`;
    if (!isExactDataJudSearchUrl(url, endpointAlias)) {
      return { success: false, statusCode: 400, error: 'Endpoint DataJud fora da allowlist oficial exata.' };
    }

    const requestBody = {
      query: {
        term: {
          numeroProcesso: normalized.replace(/\D/g, ''),
        },
      },
      size: 1,
    };

    const startedAt = Date.now();
    const controller = new AbortController();
    // A API pública do CNJ frequentemente responde entre 6 e 10 segundos.
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {

      const requestBodyText = JSON.stringify(requestBody);
      const querySha256 = DataJudAdapter.sha256(requestBodyText);
      const queryId = `datajud-query-${querySha256.slice(0, 24)}`;
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'Authorization': `APIKey ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'JurisFlow-LegalTech-PrecedentEngine/2026.8 (LGPD-Compliant)',
        },
        body: requestBodyText,
        signal: controller.signal,
      });
      const rawResponse = await response.text();
      const responseSha256 = DataJudAdapter.sha256(rawResponse);
      const verifiedAt = new Date().toISOString();
      if (!response.ok) {
        // Se a API externa retornar erro (ex: 401, 403, 404), trata transparentemente sem simulação
        return {
          success: false,
          statusCode: response.status,
          error: `Falha na consulta oficial DataJud [HTTP ${response.status}]: ${response.statusText}`,
        };
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('json')) {
        return { success: false, statusCode: 502, error: 'DataJud retornou conteúdo não JSON; resposta rejeitada.' };
      }
      let data: any;
      try {
        data = JSON.parse(rawResponse);
      } catch {
        return { success: false, statusCode: 502, error: 'DataJud retornou JSON inválido; resposta rejeitada.' };
      }
      const hits = data?.hits?.hits || [];

      if (hits.length === 0) {
        return {
          success: false,
          error: `Processo nº ${normalized} não localizado no repositório público do ${courtCode} via DataJud.`,
          statusCode: 404,
        };
      }

      const sourceData = hits[0]._source;
      const expectedDigits = normalized.replace(/\D/g, '');
      const receivedDigits = String(sourceData?.numeroProcesso || '').replace(/\D/g, '');
      const receivedCourt = String(sourceData?.tribunal || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (receivedDigits !== expectedDigits || receivedCourt !== courtCode) {
        return {
          success: false,
          statusCode: 409,
          error: 'Resposta DataJud rejeitada: identidade do processo ou tribunal divergente da consulta.',
        };
      }
      const recordSha256 = DataJudAdapter.sha256(JSON.stringify(sourceData));
      const isConfidential = sourceData.nivelSigilo ? sourceData.nivelSigilo > 0 : false;

      const metadata: CaseMetadata = {
        normalizedCnjNumber: normalized,
        rawCaseNumber: sourceData.numeroProcesso || normalized,
        courtCode: sourceData.tribunal || courtCode,
        judicialDegree: sourceData.grau || 'G1',
        processClass: {
          code: sourceData.classe?.codigo || 0,
          name: sourceData.classe?.nome || 'Não informado pelo DataJud',
        },
        subjects: (sourceData.assuntos || []).map((a: any) => ({
          code: a.codigo,
          name: a.nome,
        })),
        courtOrgan: sourceData.orgaoJulgador?.nome || 'Não informado pelo DataJud',
        distributionDate: sourceData.dataAjuizamento,
        value: sourceData.valorCausa,
        isConfidential,
        lastMovementDate: sourceData.dataHoraUltimaAtualizacao,
        source: 'DATAJUD_CNJ',
        collectedAt: new Date().toISOString(),
      };

      const movements: CourtMovement[] = (sourceData.movimentos || []).slice(0, 30).map((m: any, idx: number) => ({
        id: `mov-${normalized}-${idx}`,
        normalizedCnjNumber: normalized,
        movementCode: m.codigo,
        movementName: m.nome,
        movementDate: m.dataHora,
        complement: m.complementosTabelados?.[0]?.descricao,
        source: 'DATAJUD_CNJ',
      }));

      return {
        success: true,
        statusCode: response.status,
        metadata,
        movements,
        rawPayload: sourceData,
        evidence: { queryId, endpoint: url, querySha256, responseSha256, recordSha256, verifiedAt, httpStatus: response.status, latencyMs: Date.now() - startedAt },
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: err?.name === 'AbortError' ? 408 : 503,
        error: err?.name === 'AbortError'
          ? 'Tempo limite ao conectar à API Pública DataJud.'
          : `Exceção ao conectar à API Pública DataJud: ${err.message || String(err)}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
