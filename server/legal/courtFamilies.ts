export type CourtSystemFamily = 'PJE' | 'ESAJ' | 'EPROC' | 'PROJUDI';

export type CourtCapabilityState =
  | 'PUBLIC_PORTAL'
  | 'PUBLIC_SEARCH'
  | 'INTERACTIVE_REQUIRED'
  | 'AUTH_REQUIRED'
  | 'UNAVAILABLE';

export interface CourtFamilyConfig {
  courtCode: string;
  courtName: string;
  family: CourtSystemFamily;
  officialPortalUrl: string;
  probeUrl: string;
  expectedHosts: string[];
  capabilityHint: CourtCapabilityState;
  publicConsultationKnown: boolean;
  notes: string;
}

export const COURT_FAMILY_CONFIGS: readonly CourtFamilyConfig[] = [
  {
    courtCode: 'TRT2',
    courtName: 'Tribunal Regional do Trabalho da 2ª Região',
    family: 'PJE',
    officialPortalUrl: 'https://pje.trt2.jus.br/jurisprudencia/',
    probeUrl: 'https://pje.trt2.jus.br/juris-backend/api/opcoes',
    expectedHosts: ['pje.trt2.jus.br'],
    capabilityHint: 'INTERACTIVE_REQUIRED',
    publicConsultationKnown: true,
    notes: 'Portal público de jurisprudência identificado; a pesquisa exige CAPTCHA interativo.',
  },
  {
    courtCode: 'TJSP',
    courtName: 'Tribunal de Justiça de São Paulo',
    family: 'ESAJ',
    officialPortalUrl: 'https://esaj.tjsp.jus.br/cjsg/consultaCompleta.do',
    probeUrl: 'https://esaj.tjsp.jus.br/cjsg/consultaCompleta.do',
    expectedHosts: ['esaj.tjsp.jus.br'],
    capabilityHint: 'INTERACTIVE_REQUIRED',
    publicConsultationKnown: true,
    notes: 'Consulta completa de jurisprudência e-SAJ identificada; reCAPTCHA/CAPTCHA obrigatório.',
  },
  {
    courtCode: 'TRF4',
    courtName: 'Tribunal Regional Federal da 4ª Região',
    family: 'EPROC',
    officialPortalUrl: 'https://eproc.trf4.jus.br/eproc2trf4/',
    probeUrl: 'https://eproc.trf4.jus.br/eproc2trf4/',
    expectedHosts: ['eproc.trf4.jus.br', 'eproc-sso.trf4.jus.br', 'sso.cloud.pje.jus.br'],
    capabilityHint: 'AUTH_REQUIRED',
    publicConsultationKnown: true,
    notes: 'eproc redireciona ao SSO; a própria tela oferece consultas públicas específicas por processo/chave.',
  },
  {
    courtCode: 'TJPR',
    courtName: 'Tribunal de Justiça do Paraná',
    family: 'PROJUDI',
    officialPortalUrl: 'https://consulta.tjpr.jus.br/projudi_consulta/paginaPrincipal.jsp',
    probeUrl: 'https://consulta.tjpr.jus.br/projudi_consulta/paginaPrincipal.jsp',
    expectedHosts: ['consulta.tjpr.jus.br'],
    capabilityHint: 'PUBLIC_PORTAL',
    publicConsultationKnown: true,
    notes: 'Portal Projudi público identificado com Consulta Pública, validação por chave e consulta de precedentes.',
  },
] as const;

export function getCourtFamilyConfig(courtCode: string): CourtFamilyConfig | undefined {
  const normalized = String(courtCode || '').trim().toUpperCase();
  return COURT_FAMILY_CONFIGS.find((config) => config.courtCode === normalized);
}

export function isAllowedCourtFamilyUrl(config: CourtFamilyConfig, value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && config.expectedHosts.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
