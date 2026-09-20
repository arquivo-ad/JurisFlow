import { isExactTrt2OptionsUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TRT2_BASE = 'https://pje.trt2.jus.br';
const TRT2_OPTIONS_ENDPOINT = `${TRT2_BASE}/juris-backend/api/opcoes`;
const TRT2_PORTAL_URL = `${TRT2_BASE}/jurisprudencia/`;

type FetchLike = typeof fetch;

interface Trt2Options {
  regional?: string;
  captchaOption?: string;
  version?: string;
  pjeConsultaUrl?: string;
}

export interface Trt2SearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  requiresInteractiveChallenge: boolean;
}

/**
 * Conector de capacidade do TRT2.
 *
 * O portal público usa CAPTCHA/reCAPTCHA antes da pesquisa de documentos.
 * Este adapter NÃO tenta resolver, reutilizar ou contornar o desafio.
 */export class Trt2JurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 15_000
  ) {}

  public async searchOfficialJurisprudence(_query: string): Promise<Trt2SearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();

    if (!isExactTrt2OptionsUrl(TRT2_OPTIONS_ENDPOINT)) {
      return this.failed(timestamp, startedAt, 'Endpoint oficial do TRT2 fora da allowlist exata.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(TRT2_OPTIONS_ENDPOINT, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Referer: TRT2_PORTAL_URL,
          'User-Agent': 'JurisFlow/1.4 LegalResearchConnector',
        },
        signal: controller.signal,
      });

      const raw = await response.text();
      if (!response.ok) {
        return this.failed(timestamp, startedAt, `HTTP ${response.status} no endpoint de opções do TRT2.`, response.status);
      }      let options: Trt2Options;
      try {
        options = JSON.parse(raw) as Trt2Options;
      } catch {
        return this.failed(timestamp, startedAt, 'TRT2 retornou opções em formato não JSON.', 502);
      }

      const captchaRequired = options.captchaOption === '1' || options.captchaOption === '2';
      const description = captchaRequired
        ? `Portal oficial disponível (versão ${options.version || 'não informada'}), mas a pesquisa exige desafio interativo CAPTCHA/reCAPTCHA. Automação bloqueada por desenho.`
        : 'Portal oficial disponível, porém o fluxo de pesquisa automática ainda não foi implementado.';

      return {
        decisions: [],
        requiresInteractiveChallenge: captchaRequired,
        diagnostic: {
          adapter: 'trt2-jurisprudencia',
          sourceName: 'TRT da 2ª Região - Sistema de Jurisprudência PJe',
          courtCode: 'TRT2',
          officialUrl: TRT2_OPTIONS_ENDPOINT,
          timestamp,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: captchaRequired ? 'SOURCE_UNAVAILABLE' : 'SOURCE_NOT_IMPLEMENTED',
          stateDescription: description,
          bytesTransferred: Buffer.byteLength(raw, 'utf8'),
          documentsReceived: 0,
          documentsNormalized: 0,
          documentsRejected: 0,
          rejectionReasons: captchaRequired ? ['INTERACTIVE_CAPTCHA_REQUIRED'] : ['SEARCH_FLOW_NOT_IMPLEMENTED'],
          connectorStatus: captchaRequired ? 'DEGRADED' : 'PARTIAL',
        },
      };    } catch (error: any) {
      const timeoutError = error?.name === 'AbortError';
      return this.failed(
        timestamp,
        startedAt,
        timeoutError ? 'Tempo limite ao consultar o endpoint oficial do TRT2.' : String(error?.message || error),
        timeoutError ? 408 : 503
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private failed(
    timestamp: string,
    startedAt: number,
    message: string,
    httpStatus = 503
  ): Trt2SearchResult {
    return {
      decisions: [],
      requiresInteractiveChallenge: false,
      diagnostic: {
        adapter: 'trt2-jurisprudencia',
        sourceName: 'TRT da 2ª Região - Sistema de Jurisprudência PJe',
        courtCode: 'TRT2',
        officialUrl: TRT2_OPTIONS_ENDPOINT,
        timestamp,
        httpStatus,
        latencyMs: Date.now() - startedAt,
        lifecycleState: 'SOURCE_UNAVAILABLE',
        stateDescription: message,
        documentsReceived: 0,
        documentsNormalized: 0,
        documentsRejected: 0,
        parsingErrors: [message],
        rejectionReasons: [message],
        connectorStatus: httpStatus === 408 ? 'DEGRADED' : 'FAILED',
      },
    };
  }
}
