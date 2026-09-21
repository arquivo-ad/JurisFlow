import {
  CourtCapabilityState,
  CourtFamilyConfig,
  CourtSystemFamily,
  getCourtFamilyConfig,
  isAllowedCourtFamilyUrl,
} from '../courtFamilies.ts';

type FetchLike = typeof fetch;

export interface CourtFamilyProbeResult {
  courtCode: string;
  courtName: string;
  family: CourtSystemFamily;
  officialPortalUrl: string;
  finalUrl?: string;
  httpStatus: number;
  contentType?: string;
  capabilityState: CourtCapabilityState;
  interactiveChallengeDetected: boolean;
  authenticationDetected: boolean;
  publicConsultationDetected: boolean;
  latencyMs: number;
  checkedAt: string;
  stateDescription: string;
  rejectionReasons: string[];
}

function fold(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function detectCapability(config: CourtFamilyConfig, html: string, finalUrl: string): {
  state: CourtCapabilityState;
  interactive: boolean;
  auth: boolean;
  publicConsultation: boolean;
} {
  const text = fold(html);
  const urlText = fold(finalUrl);
  const interactive = /recaptcha|captcha|hcaptcha|turnstile/.test(text);
  const publicConsultation =
    /consulta publica|consulta process(?:o|ual)|consulta de documento|consulta precedentes|jurisprudencia/.test(text);
  const auth =
    /openid-connect\/auth|sign in|entrar no sistema|usuario|senha|login/.test(text + ' ' + urlText);

  if (interactive) {
    return { state: 'INTERACTIVE_REQUIRED', interactive, auth, publicConsultation };
  }
  if (auth && config.family === 'EPROC') {
    return { state: 'AUTH_REQUIRED', interactive, auth, publicConsultation };
  }
  if (publicConsultation) {
    return { state: config.capabilityHint === 'PUBLIC_SEARCH' ? 'PUBLIC_SEARCH' : 'PUBLIC_PORTAL', interactive, auth, publicConsultation };
  }
  return { state: config.capabilityHint, interactive, auth, publicConsultation };
}

export class CourtFamilyProbeAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 20_000
  ) {}

  public async probe(courtCode: string): Promise<CourtFamilyProbeResult> {
    const config = getCourtFamilyConfig(courtCode);
    const checkedAt = new Date().toISOString();
    const startedAt = Date.now();

    if (!config) {
      return {
        courtCode: String(courtCode || '').toUpperCase(),
        courtName: 'Tribunal não configurado',
        family: 'PJE',
        officialPortalUrl: '',
        httpStatus: 404,
        capabilityState: 'UNAVAILABLE',
        interactiveChallengeDetected: false,
        authenticationDetected: false,
        publicConsultationDetected: false,
        latencyMs: Date.now() - startedAt,
        checkedAt,
        stateDescription: 'Tribunal sem configuração de família tecnológica.',
        rejectionReasons: ['COURT_FAMILY_NOT_CONFIGURED'],
      };
    }

    if (!isAllowedCourtFamilyUrl(config, config.probeUrl)) {
      return this.failed(config, checkedAt, startedAt, 400, 'URL de probe fora da allowlist da família.', ['INVALID_PROBE_URL']);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(config.probeUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/json',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 CourtFamilyCapabilityProbe',
        },
        redirect: 'manual',
        signal: controller.signal,
      });

      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        const redirectUrl = new URL(location, config.probeUrl).toString();
        if (!isAllowedCourtFamilyUrl(config, redirectUrl)) {
          return this.failed(config, checkedAt, startedAt, 502, 'Redirecionamento saiu da allowlist oficial da família.', ['UNEXPECTED_REDIRECT_HOST'], redirectUrl);
        }

        const foldedRedirect = fold(redirectUrl);
        const authBoundary = config.family === 'EPROC'
          && (/acao=sso%2flogin|acao=sso\/login|openid-connect\/auth|sso\.cloud\.pje\.jus\.br|eproc-sso/.test(foldedRedirect));

        if (authBoundary) {
          return {
            courtCode: config.courtCode,
            courtName: config.courtName,
            family: config.family,
            officialPortalUrl: config.officialPortalUrl,
            finalUrl: redirectUrl,
            httpStatus: response.status,
            contentType: response.headers.get('content-type') || undefined,
            capabilityState: 'AUTH_REQUIRED',
            interactiveChallengeDetected: false,
            authenticationDetected: true,
            publicConsultationDetected: config.publicConsultationKnown,
            latencyMs: Date.now() - startedAt,
            checkedAt,
            stateDescription: this.describe(config, 'AUTH_REQUIRED'),
            rejectionReasons: [],
          };
        }

        return this.failed(config, checkedAt, startedAt, response.status, 'Redirecionamento oficial não classificado como capacidade pública conhecida.', ['UNCLASSIFIED_REDIRECT'], redirectUrl);
      }

      const body = await response.text();
      const finalUrl = response.url || config.probeUrl;

      if (!isAllowedCourtFamilyUrl(config, finalUrl)) {
        return this.failed(config, checkedAt, startedAt, 502, 'Resposta saiu da allowlist oficial da família.', ['UNEXPECTED_RESPONSE_HOST'], finalUrl);
      }

      if (!response.ok) {
        return this.failed(config, checkedAt, startedAt, response.status, `HTTP ${response.status} no portal oficial.`, [`HTTP_${response.status}`], finalUrl);
      }

      const detected = detectCapability(config, body, finalUrl);
      if (config.publicConsultationKnown) detected.publicConsultation = detected.publicConsultation || true;
      return {
        courtCode: config.courtCode,
        courtName: config.courtName,
        family: config.family,
        officialPortalUrl: config.officialPortalUrl,
        finalUrl,
        httpStatus: response.status,
        contentType: response.headers.get('content-type') || undefined,
        capabilityState: detected.state,
        interactiveChallengeDetected: detected.interactive,
        authenticationDetected: detected.auth,
        publicConsultationDetected: detected.publicConsultation,
        latencyMs: Date.now() - startedAt,
        checkedAt,
        stateDescription: this.describe(config, detected.state),
        rejectionReasons: [],
      };
    } catch (error: any) {
      const timeoutError = error?.name === 'AbortError';
      return this.failed(
        config,
        checkedAt,
        startedAt,
        timeoutError ? 408 : 503,
        timeoutError ? 'Tempo limite ao sondar o portal oficial.' : String(error?.message || error),
        [timeoutError ? 'TIMEOUT' : 'TRANSPORT_ERROR']
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  public async probeAll(): Promise<CourtFamilyProbeResult[]> {
    const courts = ['TRT2', 'TRT15', 'TJSP', 'TRF4', 'TJPR'];
    return Promise.all(courts.map((court) => this.probe(court)));
  }

  private describe(config: CourtFamilyConfig, state: CourtCapabilityState): string {
    if (state === 'INTERACTIVE_REQUIRED') return `${config.family}: portal oficial disponível, mas a operação automatizada exige desafio interativo.`;
    if (state === 'AUTH_REQUIRED') return `${config.family}: portal oficial disponível; acesso principal autenticado, com consultas públicas específicas detectadas quando expostas pelo portal.`;
    if (state === 'PUBLIC_SEARCH') return `${config.family}: pesquisa pública oficial disponível.`;
    if (state === 'PUBLIC_PORTAL') return `${config.family}: portal/consulta pública oficial disponível; operação específica ainda não automatizada.`;
    return `${config.family}: fonte oficial indisponível no momento.`;
  }

  private failed(
    config: CourtFamilyConfig,
    checkedAt: string,
    startedAt: number,
    httpStatus: number,
    stateDescription: string,
    rejectionReasons: string[],
    finalUrl?: string
  ): CourtFamilyProbeResult {
    return {
      courtCode: config.courtCode,
      courtName: config.courtName,
      family: config.family,
      officialPortalUrl: config.officialPortalUrl,
      finalUrl,
      httpStatus,
      capabilityState: 'UNAVAILABLE',
      interactiveChallengeDetected: false,
      authenticationDetected: false,
      publicConsultationDetected: false,
      latencyMs: Date.now() - startedAt,
      checkedAt,
      stateDescription,
      rejectionReasons,
    };
  }
}
