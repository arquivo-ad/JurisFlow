import { isExactTjspSearchUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TJSP_SEARCH_URL = 'https://esaj.tjsp.jus.br/cjsg/consultaCompleta.do';

type FetchLike = typeof fetch;

export interface TjspSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  requiresInteractiveChallenge: boolean;
}

/**
 * Conector de capacidade da consulta pública de jurisprudência do TJSP/e-SAJ.
 *
 * O formulário oficial usa reCAPTCHA e controle de acesso por CAPTCHA.
 * Este adapter NÃO gera token, não resolve e não contorna o desafio.
 */
export class TjspJurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 15_000
  ) {}
  public async searchOfficialJurisprudence(_query: string): Promise<TjspSearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();

    if (!isExactTjspSearchUrl(TJSP_SEARCH_URL)) {
      return this.failed(timestamp, startedAt, 'Endpoint oficial do TJSP fora da allowlist exata.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(TJSP_SEARCH_URL, {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'JurisFlow/1.4 LegalResearchConnector',
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      const html = await response.text();
      if (!response.ok) {
        return this.failed(timestamp, startedAt, `HTTP ${response.status} no portal de jurisprudência do TJSP.`, response.status);
      }
      const recaptchaDetected =
        /grecaptcha\.execute\s*\(/i.test(html)
        || /recaptcha_response_token/i.test(html)
        || /captchaControleAcesso\.do/i.test(html);

      const formDetected =
        /resultadoCompleta\.do/i.test(html)
        && /dados\.buscaInteiroTeor/i.test(html);

      if (!formDetected) {
        return this.failed(timestamp, startedAt, 'Estrutura esperada da consulta completa do TJSP não foi encontrada.', 502);
      }

      return {
        decisions: [],
        requiresInteractiveChallenge: recaptchaDetected,
        diagnostic: {
          adapter: 'tjsp-jurisprudencia',
          sourceName: 'Tribunal de Justiça de São Paulo - Consulta de Jurisprudência e-SAJ',
          courtCode: 'TJSP',
          officialUrl: TJSP_SEARCH_URL,
          timestamp,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: recaptchaDetected ? 'SOURCE_UNAVAILABLE' : 'SOURCE_NOT_IMPLEMENTED',
          stateDescription: recaptchaDetected
            ? 'Portal oficial disponível, mas a pesquisa exige reCAPTCHA/CAPTCHA interativo. Automação bloqueada por desenho.'
            : 'Portal oficial disponível; fluxo automatizado de pesquisa ainda não implementado.',
          bytesTransferred: Buffer.byteLength(html, 'utf8'),
          documentsReceived: 0,
          documentsNormalized: 0,
          documentsRejected: 0,
          rejectionReasons: recaptchaDetected ? ['INTERACTIVE_RECAPTCHA_REQUIRED'] : ['SEARCH_FLOW_NOT_IMPLEMENTED'],
          connectorStatus: recaptchaDetected ? 'DEGRADED' : 'PARTIAL',
        },
      };
    } catch (error: any) {
      const timeoutError = error?.name === 'AbortError';
      return this.failed(
        timestamp,
        startedAt,
        timeoutError ? 'Tempo limite ao consultar o portal oficial do TJSP.' : String(error?.message || error),
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
  ): TjspSearchResult {
    return {
      decisions: [],
      requiresInteractiveChallenge: false,
      diagnostic: {
        adapter: 'tjsp-jurisprudencia',
        sourceName: 'Tribunal de Justiça de São Paulo - Consulta de Jurisprudência e-SAJ',
        courtCode: 'TJSP',
        officialUrl: TJSP_SEARCH_URL,
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
