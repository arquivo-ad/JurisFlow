import { CaseMetadata, CourtMovement } from '../types.ts';

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
// nunca ficar embutida no código-fonte.
const DEFAULT_DATAJUD_API_KEY = process.env.DATAJUD_API_KEY?.trim() || '';
const DATAJUD_BASE_URL = 'https://api-publica.datajud.cnj.jus.br';

export class DataJudAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || DEFAULT_DATAJUD_API_KEY;
    this.baseUrl = baseUrl || DATAJUD_BASE_URL;
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
        '26': 'TJSP',
        '19': 'TJRJ',
        '13': 'TJMG',
        '21': 'TJRS',
        '16': 'TJPR',
        '24': 'TJSC',
        '05': 'TJBA',
        '07': 'TJDFT',
      };
      return { courtCode: stateMap[tr] || `TJ_${tr}`, judicialBranch: 'ESTADUAL' };
    } else if (j === '4') {
      return { courtCode: `TRF${parseInt(tr, 10)}`, judicialBranch: 'FEDERAL' };
    } else if (j === '5') {
      return { courtCode: `TRT${parseInt(tr, 10)}`, judicialBranch: 'TRABALHO' };
    } else if (j === '1') {
      return { courtCode: 'STF', judicialBranch: 'SUPERIOR' };
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
    // Endpoint do DataJud para busca por processo por tribunal:
    // POST /api_publica_{sigla_tribunal}/_search
    const endpointAlias = courtCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const url = `${this.baseUrl}/api_publica_${endpointAlias}/_search`;

    const requestBody = {
      query: {
        match: {
          numeroProcesso: normalized.replace(/\D/g, ''),
        },
      },
      size: 1,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `APIKey ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'JurisFlow-LegalTech-PrecedentEngine/2026.8 (LGPD-Compliant)',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        // Se a API externa retornar erro (ex: 401, 403, 404), trata transparentemente sem simulação
        return {
          success: false,
          statusCode: response.status,
          error: `Falha na consulta oficial DataJud [HTTP ${response.status}]: ${response.statusText}`,
        };
      }

      const data = await response.json();
      const hits = data?.hits?.hits || [];

      if (hits.length === 0) {
        return {
          success: false,
          error: `Processo nº ${normalized} não localizado no repositório público do ${courtCode} via DataJud.`,
        };
      }

      const sourceData = hits[0]._source;
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
        metadata,
        movements,
        rawPayload: sourceData,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Exceção ao conectar à API Pública DataJud: ${err.message || String(err)}`,
      };
    }
  }
}
