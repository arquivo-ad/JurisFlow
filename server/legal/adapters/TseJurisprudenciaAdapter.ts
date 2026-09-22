import { isExactTseSearchUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TSE_SEARCH_URL = 'https://sjur-pesquisa-api.tse.jus.br/tse/sjur-pesquisa-backend/rest/public/pesquisa';
type FetchLike = typeof fetch;

export interface TseSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  requiresInteractiveChallenge: boolean;
}

export class TseJurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 15_000,
  ) {}

  async searchOfficialJurisprudence(_query: string): Promise<TseSearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    if (!isExactTseSearchUrl(TSE_SEARCH_URL)) {
      return this.failed(timestamp, startedAt, 'Endpoint TSE fora da allowlist exata.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(TSE_SEARCH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Origin: 'https://jurisprudencia.tse.jus.br',
          Referer: 'https://jurisprudencia.tse.jus.br/',
          'User-Agent': 'JurisFlow/1.4 LegalResearchConnector',
        },
        body: '{}',
        signal: controller.signal,
      });
      const body = await response.text();
      const antiRobot = /falha\s+na\s+verifica[cç][aã]o\s+antirrob[oô]/i.test(body);

      if (antiRobot) {
        return {
          decisions: [],
          requiresInteractiveChallenge: true,
          diagnostic: {
            adapter: 'tse-jurisprudencia',
            sourceName: 'Tribunal Superior Eleitoral - Jurisprudência 4.0',
            courtCode: 'TSE',
            officialUrl: TSE_SEARCH_URL,
            timestamp,
            httpStatus: response.status,
            latencyMs: Date.now() - startedAt,
            lifecycleState: 'SOURCE_UNAVAILABLE',
            stateDescription: 'API oficial disponível, mas a pesquisa exige hCaptcha/validação antirrobô. JurisFlow permanece fail-closed.',
            bytesTransferred: Buffer.byteLength(body, 'utf8'),
            documentsReceived: 0,
            documentsNormalized: 0,
            documentsRejected: 0,
            rejectionReasons: ['INTERACTIVE_HCAPTCHA_REQUIRED'],
            connectorStatus: 'DEGRADED',
          },
        };
      }

      return this.failed(
        timestamp,
        startedAt,
        response.ok
          ? 'A API TSE respondeu sem o marcador esperado de hCaptcha e sem conjunto validável; fluxo permanece fail-closed.'
          : 'HTTP ' + response.status + ' na API pública do TSE.',
        response.status || 503,
      );
    } catch (error: any) {
      const timeoutHit = error?.name === 'AbortError';
      return this.failed(
        timestamp,
        startedAt,
        timeoutHit ? 'Tempo limite ao consultar a API do TSE.' : String(error?.message || error),
        timeoutHit ? 408 : 503,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private failed(timestamp: string, startedAt: number, message: string, httpStatus = 503): TseSearchResult {
    return {
      decisions: [],
      requiresInteractiveChallenge: false,
      diagnostic: {
        adapter: 'tse-jurisprudencia',
        sourceName: 'Tribunal Superior Eleitoral - Jurisprudência 4.0',
        courtCode: 'TSE',
        officialUrl: TSE_SEARCH_URL,
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
