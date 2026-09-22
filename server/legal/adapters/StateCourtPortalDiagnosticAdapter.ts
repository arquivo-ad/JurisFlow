import { isExactStateCourtPortalUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

export type DiagnosticCourtCode = 'TJPB' | 'TJAP' | 'TJMT';
type FetchLike = typeof fetch;

const CONFIG: Record<DiagnosticCourtCode, { url: string; name: string }> = {
  TJPB: {
    url: 'https://app.tjpb.jus.br/juris-pb/',
    name: 'TJPB - PJe Jurisprudência',
  },
  TJAP: {
    url: 'https://tucujuris.tjap.jus.br/',
    name: 'TJAP - Tucujuris',
  },
  TJMT: {
    url: 'https://jurisprudencia.tjmt.jus.br/',
    name: 'TJMT - Portal da Jurisprudência',
  },
};

export interface StateCourtPortalDiagnosticResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
}

export class StateCourtPortalDiagnosticAdapter {
  constructor(
    private readonly courtCode: DiagnosticCourtCode,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 15_000
  ) {}
  async searchOfficialJurisprudence(_query: string): Promise<StateCourtPortalDiagnosticResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const config = CONFIG[this.courtCode];

    if (!isExactStateCourtPortalUrl(config.url, this.courtCode)) {
      return this.failed(timestamp, startedAt, 'Portal oficial fora da allowlist exata.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(config.url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      const raw = await response.text();
      const low = raw.toLowerCase();

      const cloudflareBlocked =
        response.status === 403
        && (
          low.includes('just a moment')
          || low.includes('cloudflare')
          || low.includes('cf-chl')
        );

      const maintenance =
        this.courtCode === 'TJMT'
        && (
          low.includes('site em manutenção')
          || low.includes('site em manutencao')
          || low.includes('manutenção')
        );
      const rejectionReasons = cloudflareBlocked
        ? ['CLOUDFLARE_INTERACTIVE_CHALLENGE_REQUIRED']
        : maintenance
          ? ['OFFICIAL_PORTAL_MAINTENANCE']
          : ['SEARCH_FLOW_NOT_IMPLEMENTED'];

      return {
        decisions: [],
        diagnostic: {
          adapter: `${this.courtCode.toLowerCase()}-portal-diagnostic`,
          sourceName: config.name,
          courtCode: this.courtCode,
          officialUrl: config.url,
          timestamp,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState:
            cloudflareBlocked || maintenance ? 'SOURCE_UNAVAILABLE' : 'SOURCE_NOT_IMPLEMENTED',
          stateDescription: cloudflareBlocked
            ? 'Portal oficial exige desafio interativo Cloudflare. JurisFlow permanece fail-closed e não contorna o desafio.'
            : maintenance
              ? 'Portal oficial está em manutenção. JurisFlow não reutiliza cache antigo como fonte atual.'
              : 'Portal oficial respondeu, mas o fluxo de pesquisa ainda não foi validado para automação.',
          bytesTransferred: Buffer.byteLength(raw, 'utf8'),
          documentsReceived: 0,
          documentsNormalized: 0,
          documentsRejected: 0,
          recordsRead: 0,
          recordsAccepted: 0,
          recordsRejected: 0,
          parsingErrors: [],
          rejectionReasons,
          connectorStatus: cloudflareBlocked || maintenance ? 'DEGRADED' : 'PARTIAL',
        },
      };
    } catch (error: any) {
      return this.failed(
        timestamp,
        startedAt,
        error?.name === 'AbortError' ? 'Tempo limite ao consultar portal oficial.' : String(error?.message || error),
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
  ): StateCourtPortalDiagnosticResult {
    const config = CONFIG[this.courtCode];
    return {
      decisions: [],
      diagnostic: {
        adapter: `${this.courtCode.toLowerCase()}-portal-diagnostic`,
        sourceName: config.name,
        courtCode: this.courtCode,
        officialUrl: config.url,
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
