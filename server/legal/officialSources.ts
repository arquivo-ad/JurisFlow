const OFFICIAL_HOSTS_BY_COURT: Record<string, ReadonlySet<string>> = {
  TST: new Set(['jurisprudencia-backend.tst.jus.br', 'jurisprudencia.tst.jus.br', 'www.tst.jus.br']),
  STJ: new Set(['processo.stj.jus.br', 'scon.stj.jus.br', 'dadosabertos.web.stj.jus.br']),
  STF: new Set(['portal.stf.jus.br', 'jurisprudencia.stf.jus.br']),
  TRT2: new Set(['pje.trt2.jus.br']),
  TJSP: new Set(['esaj.tjsp.jus.br']),
  TRF3: new Set(['web.trf3.jus.br']),
  TRF4: new Set(['jurisprudencia.trf4.jus.br']),
  TJDFT: new Set(['jurisdf.tjdft.jus.br']),
  TJSC: new Set(['eprocwebcon.tjsc.jus.br']),
  TJBA: new Set(['jurisprudenciaws.tjba.jus.br']),
  CNJ: new Set(['api-publica.datajud.cnj.jus.br', 'comunicaapi.pje.jus.br']),
};

for (let region = 1; region <= 24; region++) {
  const code = `TRT${region}`;
  const current = OFFICIAL_HOSTS_BY_COURT[code] || new Set<string>();
  OFFICIAL_HOSTS_BY_COURT[code] = new Set([...current, 'jurisprudencia.jt.jus.br']);
}

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


export function isExactTrf4DocumentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:'
      || url.hostname !== 'jurisprudencia.trf4.jus.br'
      || url.pathname !== '/eproc2trf4/externo_controlador.php'
      || url.searchParams.get('acao') !== 'jurisprudencia@jurisprudencia/download_inteiro_teor'
    ) return false;
    const id = url.searchParams.get('id_jurisprudencia') || '';
    if (!/^\d{20,40}$/.test(id)) return false;
    const allowed = new Set(['acao', 'id_jurisprudencia', 'termosPesquisados']);
    return [...url.searchParams.keys()].every((key) => allowed.has(key));
  } catch {
    return false;
  }
}

export function isExactTrf4SearchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'jurisprudencia.trf4.jus.br'
      && url.pathname === '/eproc2trf4/externo_controlador.php'
      && url.searchParams.get('acao') === 'jurisprudencia@jurisprudencia/listar_resultados'
      && [...url.searchParams.keys()].every((key) => key === 'acao');
  } catch {
    return false;
  }
}


const FALCAO_ALLOWED_SEARCH_PARAMS = new Set([
  'sessionId', 'latitude', 'longitude', 'texto', 'precedente', 'verTodosPrecedentes',
  'tipoPrecedente', 'tribunais', 'nomeRelator', 'orgaoJulgador', 'classeProcesso',
  'faseProcessual', 'prioridade', 'temEmenta', 'pesquisaSomenteNasEmentas',
  'ordenacao', 'filtroRapidoData', 'dataInicio', 'dataFim', 'colecao', 'page', 'size',
]);

export function isExactFalcaoSearchUrl(value: string, expectedCourt?: string): boolean {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:'
      || url.hostname !== 'jurisprudencia.jt.jus.br'
      || url.pathname !== '/jurisprudencia-nacional-backend/api/no-auth/pesquisa'
    ) return false;
    if (![...url.searchParams.keys()].every((key) => FALCAO_ALLOWED_SEARCH_PARAMS.has(key))) return false;
    if (!/^_[a-z0-9]{7}$/.test(url.searchParams.get('sessionId') || '')) return false;
    if (url.searchParams.get('colecao') !== 'acordaos') return false;
    if (url.searchParams.get('page') !== '0' || url.searchParams.get('size') !== '5') return false;
    const court = url.searchParams.get('tribunais') || '';
    return /^TRT(?:[1-9]|1\d|2[0-4])$/.test(court)
      && (!expectedCourt || court === expectedCourt);
  } catch {
    return false;
  }
}

export function isExactFalcaoDocumentUrl(value: string, expectedCourt?: string, expectedId?: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'jurisprudencia.jt.jus.br') return false;
    const match = url.pathname.match(/^\/jurisprudencia-nacional-backend\/api\/no-auth\/pesquisa\/acordaos\/(TRT(?:[1-9]|1\d|2[0-4]))\/(\d+)$/);
    if (!match) return false;
    const [, court, id] = match;
    const allowed = new Set(['sessionId', 'latitude', 'longitude']);
    return [...url.searchParams.keys()].every((key) => allowed.has(key))
      && /^_[a-z0-9]{7}$/.test(url.searchParams.get('sessionId') || '')
      && url.searchParams.has('latitude')
      && url.searchParams.has('longitude')
      && (!expectedCourt || court === expectedCourt)
      && (!expectedId || id === expectedId);
  } catch {
    return false;
  }
}

export function isExactTjdftSearchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'jurisdf.tjdft.jus.br'
      && url.pathname === '/api/v1/pesquisa'
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

export function isExactTjscDocumentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:'
      || url.hostname !== 'eprocwebcon.tjsc.jus.br'
      || url.pathname !== '/consulta1g/externo_controlador.php'
      || url.searchParams.get('acao') !== 'jurisprudencia@jurisprudencia/download_inteiro_teor'
    ) return false;
    const id = url.searchParams.get('id_jurisprudencia') || '';
    if (!/^\d{20,40}$/.test(id)) return false;
    const allowed = new Set(['acao', 'id_jurisprudencia']);
    return [...url.searchParams.keys()].every((key) => allowed.has(key));
  } catch {
    return false;
  }
}

export function isExactTjscSearchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'eprocwebcon.tjsc.jus.br'
      && url.pathname === '/consulta1g/externo_controlador.php'
      && url.searchParams.get('acao') === 'jurisprudencia@jurisprudencia/listar_resultados'
      && [...url.searchParams.keys()].every((key) => key === 'acao');
  } catch {
    return false;
  }
}

export function isExactTjbaGraphqlUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'jurisprudenciaws.tjba.jus.br'
      && url.pathname === '/graphql'
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

export function isExactTjbaDocumentUrl(value: string, expectedHash?: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'jurisprudenciaws.tjba.jus.br') return false;
    const match = url.pathname.match(/^\/inteiroTeor\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
    if (!match || url.search || url.hash) return false;
    return !expectedHash || match[1].toLowerCase() === expectedHash.toLowerCase();
  } catch {
    return false;
  }
}
