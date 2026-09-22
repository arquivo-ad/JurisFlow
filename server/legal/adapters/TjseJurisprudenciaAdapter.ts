import { isExactTjseSearchUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TJSE_SEARCH = 'https://www.tjse.jus.br/Dgorg/paginas/jurisprudencia/consultarJurisprudencia.tjse';
type FetchLike = typeof fetch;

export interface TjseSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  requiresInteractiveChallenge: boolean;
}

export class TjseJurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 15_000
  ) {}

  async searchOfficialJurisprudence(_query: string): Promise<TjseSearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();

    if (!isExactTjseSearchUrl(TJSE_SEARCH)) {
      return this.failed(timestamp, startedAt, 'Endpoint oficial TJSE fora da allowlist exata.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(TJSE_SEARCH, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
        },
        signal: controller.signal,
      });
      const raw = await response.text();
      if (!response.ok) {
        return this.failed(
          timestamp,
          startedAt,
          `HTTP ${response.status} ao consultar jurisprudência TJSE.`,
          response.status
        );
      }

      const turnstileRequired =
        /challenges\.cloudflare\.com\/turnstile/i.test(raw)
        || /cf-turnstile/i.test(raw)
        || /turnstile/i.test(raw);

      return {
        decisions: [],
        requiresInteractiveChallenge: turnstileRequired,
        diagnostic: {
          adapter: 'tjse-jurisprudencia',
          sourceName: 'TJSE - Pesquisa de Jurisprudência Judicial',
          courtCode: 'TJSE',
          officialUrl: TJSE_SEARCH,
          timestamp,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: turnstileRequired ? 'SOURCE_UNAVAILABLE' : 'SOURCE_NOT_IMPLEMENTED',
          stateDescription: turnstileRequired
            ? 'Pesquisa judicial oficial exige Cloudflare Turnstile. JurisFlow permanece fail-closed e não gera nem contorna token.'
            : 'Portal oficial respondeu sem Turnstile detectável, mas o fluxo de submit ainda requer validação antes de automação.',
          bytesTransferred: Buffer.byteLength(raw, 'utf8'),
          documentsReceived: 0,
          documentsNormalized: 0,
          documentsRejected: 0,
          recordsRead: 0,
          recordsAccepted: 0,
          recordsRejected: 0,
          parsingErrors: [],
          rejectionReasons: turnstileRequired
            ? ['INTERACTIVE_TURNSTILE_REQUIRED']
            : ['SEARCH_FLOW_NOT_IMPLEMENTED'],
          connectorStatus: turnstileRequired ? 'DEGRADED' : 'PARTIAL',
        },
      };
    } catch (error: any) {
      return this.failed(
        timestamp,
        startedAt,
        error?.name === 'AbortError'
          ? 'Tempo limite ao consultar jurisprudência TJSE.'
          : String(error?.message || error),
        error?.name === 'AbortError' ? 408 : 503
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
  ): TjseSearchResult {
    return {
      decisions: [],
      requiresInteractiveChallenge: false,
      diagnostic: {
        adapter: 'tjse-jurisprudencia',
        sourceName: 'TJSE - Pesquisa de Jurisprudência Judicial',
        courtCode: 'TJSE',
        officialUrl: TJSE_SEARCH,
        timestamp,
        httpStatus,
        latencyMs: Date.now() - startedAt,
        lifecycleState: 'SOURCE_UNAVAILABLE',
        stateDescription: message,
        documentsReceived: 0,
        documentsNormalized: 0,
        documentsRejected: 0,
        recordsRead: 0,
        recordsAccepted: 0,
        recordsRejected: 0,
        parsingErrors: [message],
        rejectionReasons: [message],
        connectorStatus: httpStatus === 408 ? 'DEGRADED' : 'FAILED',
      },
    };
  }
}
