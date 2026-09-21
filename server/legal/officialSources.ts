const OFFICIAL_HOSTS_BY_COURT: Record<string, ReadonlySet<string>> = {
  TST: new Set(['jurisprudencia-backend.tst.jus.br', 'jurisprudencia.tst.jus.br', 'www.tst.jus.br']),
  STJ: new Set(['processo.stj.jus.br', 'scon.stj.jus.br', 'dadosabertos.web.stj.jus.br']),
  STF: new Set(['portal.stf.jus.br', 'jurisprudencia.stf.jus.br']),
  TRT2: new Set(['pje.trt2.jus.br']),
  TJSP: new Set(['esaj.tjsp.jus.br']),
  TRF3: new Set(['web.trf3.jus.br']),
  CNJ: new Set(['api-publica.datajud.cnj.jus.br', 'comunicaapi.pje.jus.br']),
};

export function getExactHostname(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isAllowedOfficialUrl(value: string, courtCode?: string): boolean {
  const hostname = getExactHostname(value);
  if (!hostname || !courtCode) return false;
  return OFFICIAL_HOSTS_BY_COURT[courtCode]?.has(hostname) === true;
}

export function isExactTstDocumentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'jurisprudencia-backend.tst.jus.br'
      && /^\/rest\/documentos\/\d{20}\/\d{2}-\d{2}-\d{4}\/\d{2}-\d{2}-\d{4}\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function isExactStjDocumentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'processo.stj.jus.br'
      && url.pathname === '/SCON/GetInteiroTeorDoAcordao'
      && /^\d{2}\/\d{2}\/\d{4}$/.test(url.searchParams.get('dt_publicacao') || '')
      && /^\d{10,14}$/.test(url.searchParams.get('num_registro') || '');
  } catch {
    return false;
  }
}

export function isExactStfThemeIndexUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'portal.stf.jus.br'
      && url.pathname === '/jurisprudenciaRepercussao/tema.asp'
      && /^\d{1,4}$/.test(url.searchParams.get('num') || '')
      && [...url.searchParams.keys()].every((key) => key === 'num');
  } catch {
    return false;
  }
}

export function isExactStfThemeDetailUrl(value: string, expectedTheme?: number): boolean {
  try {
    const url = new URL(value);
    const allowed = new Set(['classeProcesso', 'incidente', 'numeroProcesso', 'numeroTema']);
    const theme = url.searchParams.get('numeroTema') || '';
    return url.protocol === 'https:'
      && url.hostname === 'portal.stf.jus.br'
      && url.pathname === '/jurisprudenciaRepercussao/verAndamentoProcesso.asp'
      && /^(?:RE|ARE|AI)$/i.test(url.searchParams.get('classeProcesso') || '')
      && /^\d+$/.test(url.searchParams.get('incidente') || '')
      && /^\d+$/.test(url.searchParams.get('numeroProcesso') || '')
      && /^\d{1,4}$/.test(theme)
      && (expectedTheme === undefined || Number(theme) === expectedTheme)
      && [...url.searchParams.keys()].every((key) => allowed.has(key));
  } catch {
    return false;
  }
}

export function isExactDataJudSearchUrl(value: string, expectedAlias?: string): boolean {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/api_publica_([a-z0-9]+)\/_search$/);
    return url.protocol === 'https:'
      && url.hostname === 'api-publica.datajud.cnj.jus.br'
      && Boolean(match)
      && (!expectedAlias || match?.[1] === expectedAlias.toLowerCase())
      && !url.search;
  } catch {
    return false;
  }
}


export function isExactTrt2OptionsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'pje.trt2.jus.br'
      && url.pathname === '/juris-backend/api/opcoes'
      && !url.search;
  } catch {
    return false;
  }
}


export function isExactTjspSearchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'esaj.tjsp.jus.br'
      && url.pathname === '/cjsg/consultaCompleta.do'
      && !url.search;
  } catch {
    return false;
  }
}


export function isExactTrf3DocumentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'web.trf3.jus.br'
      && url.pathname === '/jurisprudencia/Home/ListaColecao/9'
      && /^\d+$/.test(url.searchParams.get('np') || '')
      && [...url.searchParams.keys()].every((key) => key === 'np');
  } catch {
    return false;
  }
}


export function isExactTstNormativeCollectionUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'www.tst.jus.br'
      && url.pathname === '/documents/d/guest/livrointernet-12-pdf'
      && !url.search;
  } catch {
    return false;
  }
}


const DJEN_ALLOWED_QUERY_PARAMS = new Set([
  'numeroOab',
  'ufOab',
  'nomeAdvogado',
  'nomeParte',
  'numeroProcesso',
  'dataDisponibilizacaoInicio',
  'dataDisponibilizacaoFim',
  'siglaTribunal',
  'numeroComunicacao',
  'pagina',
  'itensPorPagina',
  'orgaoId',
  'meio',
]);

export function isExactDjenSearchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'comunicaapi.pje.jus.br'
      && url.pathname === '/api/v1/comunicacao'
      && [...url.searchParams.keys()].every((key) => DJEN_ALLOWED_QUERY_PARAMS.has(key));
  } catch {
    return false;
  }
}

export function isExactDjenCertificateUrl(value: string, expectedHash?: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'comunicaapi.pje.jus.br' || url.search) return false;
    const match = url.pathname.match(/^\/api\/v1\/comunicacao\/([A-Za-z0-9_-]+)\/certidao$/);
    if (!match) return false;
    return expectedHash ? match[1] === expectedHash : true;
  } catch {
    return false;
  }
}
