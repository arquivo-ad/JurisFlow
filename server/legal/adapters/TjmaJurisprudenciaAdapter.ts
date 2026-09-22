import { isExactTjmaSearchUrl, isExactTjmaTurnstileStatusUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TJMA_API = 'https://apijuris.tjma.jus.br/v1';
const TJMA_TURNSTILE_STATUS = TJMA_API + '/util/turnstile/check_habilitado';
const TJMA_SEARCH = TJMA_API + '/sg/jurisprudencias/processos';
type FetchLike = typeof fetch;

export interface TjmaSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  requiresInteractiveChallenge: boolean;
}

export class TjmaJurisprudenciaAdapter {
  constructor(private readonly fetchImpl: FetchLike = fetch, private readonly timeoutMs = 15_000) {}

  async searchOfficialJurisprudence(_query: string): Promise<TjmaSearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();

    if (!isExactTjmaTurnstileStatusUrl(TJMA_TURNSTILE_STATUS) || !isExactTjmaSearchUrl(TJMA_SEARCH)) {
      return this.failed(timestamp, startedAt, 'Endpoint oficial TJMA fora da allowlist exata.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(TJMA_TURNSTILE_STATUS, {
        headers: {
          Accept: 'application/json',
          Referer: 'https://jurisconsult.tjma.jus.br/',
          'User-Agent': 'JurisFlow/1.4 LegalResearchConnector',
        },
        signal: controller.signal,
      });
      const raw = await response.text();
      if (!response.ok) {
        return this.failed(timestamp, startedAt, `HTTP ${response.status} ao consultar estado do Turnstile TJMA.`, response.status);
      }

      let enabled = false;
      try {
        enabled = Number(JSON.parse(raw)?.habilitado) === 1;
      } catch {
        return this.failed(timestamp, startedAt, 'Resposta inválida no endpoint oficial de estado do Turnstile TJMA.', 502);
      }

      return {
        decisions: [],
        requiresInteractiveChallenge: enabled,
        diagnostic: {
          adapter: 'tjma-jurisprudencia',
          sourceName: 'TJMA - Jurisconsult / API Jurisprudência',
          courtCode: 'TJMA',
          officialUrl: TJMA_SEARCH,
          timestamp,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: enabled ? 'SOURCE_UNAVAILABLE' : 'SOURCE_NOT_IMPLEMENTED',
          stateDescription: enabled
            ? 'Pesquisa pública oficial exige Cloudflare Turnstile. JurisFlow permanece fail-closed e não gera nem contorna token.'
            : 'Turnstile oficial não está habilitado, mas o fluxo de busca ainda requer validação antes de automação.',
          bytesTransferred: Buffer.byteLength(raw, 'utf8'),
          documentsReceived: 0,
          documentsNormalized: 0,
          documentsRejected: 0,
          rejectionReasons: enabled ? ['INTERACTIVE_TURNSTILE_REQUIRED'] : ['SEARCH_FLOW_NOT_IMPLEMENTED'],
          connectorStatus: enabled ? 'DEGRADED' : 'PARTIAL',
        },
      };
    } catch (error: any) {
      return this.failed(
        timestamp,
        startedAt,
        error?.name === 'AbortError' ? 'Tempo limite ao consultar API oficial TJMA.' : String(error?.message || error),
        error?.name === 'AbortError' ? 408 : 503
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private failed(timestamp: string, startedAt: number, message: string, httpStatus = 503): TjmaSearchResult {
    return {
      decisions: [],
      requiresInteractiveChallenge: false,
      diagnostic: {
        adapter: 'tjma-jurisprudencia',
        sourceName: 'TJMA - Jurisconsult / API Jurisprudência',
        courtCode: 'TJMA',
        officialUrl: TJMA_SEARCH,
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
