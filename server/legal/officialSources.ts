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
  TJCE: new Set(['gateway.tjce.jus.br']),
  TJPE: new Set(['consultajurisprudencia.app.tjpe.jus.br']),
  TJAL: new Set(['www2.tjal.jus.br']),
  TJMS: new Set(['esaj.tjms.jus.br']),
  TJPA: new Set(['jurisprudencia.tjpa.jus.br']),
  TJRR: new Set(['jurisprudencia.tjrr.jus.br']),
  TJRN: new Set(['jurisprudencia.tjrn.jus.br']),
  TJRO: new Set(['liame.tjro.jus.br']),
  TJMA: new Set(['apijuris.tjma.jus.br', 'jurisconsult.tjma.jus.br']),
  TJTO: new Set(['jurisprudencia.tjto.jus.br', 'eproc2.tjto.jus.br']),
  TJPI: new Set(['jurisprudencia.tjpi.jus.br']),
  TJAM: new Set(['consultasaj.tjam.jus.br']),
  TJAC: new Set(['esaj.tjac.jus.br']),
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

export function isExactTjceSearchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:'
      || url.hostname !== 'gateway.tjce.jus.br'
      || url.pathname !== '/sjuris/api/v1/jurisprudencia/'
    ) return false;
    const allowed = new Set(['page', 'size']);
    if (![...url.searchParams.keys()].every((key) => allowed.has(key))) return false;
    return /^\d+$/.test(url.searchParams.get('page') || '')
      && /^(?:[1-9]|10)$/.test(url.searchParams.get('size') || '');
  } catch {
    return false;
  }
}

export function isExactTjceDocumentUrl(value: string, expectedId?: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'gateway.tjce.jus.br') return false;
    const match = decodeURIComponent(url.pathname).match(
      /^\/sjuris\/api\/v1\/jurisprudencia\/(\d{20}_\d+)\/ACÓRDÃO\/2º GRAU$/
    );
    if (!match || url.search || url.hash) return false;
    return !expectedId || match[1] === expectedId;
  } catch {
    return false;
  }
}

const TJPE_ALLOWED_SEARCH_PARAMS = new Set([
  'page', 'size', 'sort',
  'pesquisaLivre.contains',
  'npuSemFormatacao.equals',
  'numAntigo.equals',
  'dataJulgamento.greaterThanOrEqual',
  'dataJulgamento.lessThanOrEqual',
  'relator.in',
  'assuntoCNJ.in',
  'classeCNJ.in',
  'orgaoJulgador.in',
  'competencia.in',
  'origem.in',
  'tipoSentenca.in',
  'empty',
]);

export function isExactTjpeSearchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:'
      || url.hostname !== 'consultajurisprudencia.app.tjpe.jus.br'
      || url.pathname !== '/api/v1/jurisprudencias'
    ) return false;
    return [...url.searchParams.keys()].every((key) => TJPE_ALLOWED_SEARCH_PARAMS.has(key));
  } catch {
    return false;
  }
}

export function isExactTjpeCandidatePdfUrl(value: string, expectedProcessId?: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'consultajurisprudencia.app.tjpe.jus.br') return false;
    const match = url.pathname.match(/^\/api\/v1\/processo\/(\d+)\/inteiro-teor$/);
    if (!match || url.search || url.hash) return false;
    return !expectedProcessId || match[1] === expectedProcessId;
  } catch {
    return false;
  }
}

const ESAJ_HOST_BY_COURT: Record<string, string> = {
  TJAC: 'esaj.tjac.jus.br',
  TJAL: 'www2.tjal.jus.br',
  TJAM: 'consultasaj.tjam.jus.br',
  TJMS: 'esaj.tjms.jus.br',
};

export function isExactEsajSearchUrl(value: string, courtCode: string): boolean {
  try {
    const url = new URL(value);
    const host = ESAJ_HOST_BY_COURT[courtCode];
    if (!host || url.protocol !== 'https:' || url.hostname !== host) return false;
    return url.pathname === '/cjsg/resultadoCompleta.do'
      || /^\/cjsg\/resultadoCompleta\.do;jsessionid=[A-Za-z0-9._-]+$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function isExactEsajDocumentUrl(value: string, courtCode: string): boolean {
  try {
    const url = new URL(value);
    const host = ESAJ_HOST_BY_COURT[courtCode];
    if (!host || url.protocol !== 'https:' || url.hostname !== host || url.pathname !== '/cjsg/getArquivo.do') return false;
    const cdAcordao = url.searchParams.get('cdAcordao') || '';
    const cdForo = url.searchParams.get('cdForo') || '';
    const allowed = new Set(['cdAcordao', 'cdForo']);
    return /^\d+$/.test(cdAcordao)
      && /^\d+$/.test(cdForo)
      && [...url.searchParams.keys()].every((key) => allowed.has(key));
  } catch {
    return false;
  }
}

export function isExactTjpiSearchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'jurisprudencia.tjpi.jus.br') return false;
    if (url.pathname !== '/jurisprudences/search') return false;
    const allowed = new Set(['q', 'tipo']);
    if (![...url.searchParams.keys()].every((key) => allowed.has(key))) return false;
    return Boolean(url.searchParams.get('q')) && url.searchParams.get('tipo') === 'Acórdão';
  } catch {
    return false;
  }
}

export function isExactTjpiDetailUrl(value: string, expectedId?: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'jurisprudencia.tjpi.jus.br') return false;
    const match = url.pathname.match(/^\/jurisprudences\/(\d+)\/public$/);
    if (!match || url.search || url.hash) return false;
    return !expectedId || match[1] === expectedId;
  } catch {
    return false;
  }
}

export function isExactTjpaSearchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'jurisprudencia.tjpa.jus.br'
      && url.pathname === '/bff/api/decisoes/buscar'
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

export function isExactTjpaDetailUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'jurisprudencia.tjpa.jus.br'
      && url.pathname === '/bff/api/decisoes/buscar-por-numero-documento'
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

export function isExactTjpaPublicDocumentUrl(value: string, expectedId?: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'jurisprudencia.tjpa.jus.br') return false;
    const match = url.pathname.match(/^\/documento\/(\d+)$/);
    if (!match || url.search || url.hash) return false;
    return !expectedId || match[1] === expectedId;
  } catch {
    return false;
  }
}

export function isExactTjrrSearchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'jurisprudencia.tjrr.jus.br') return false;
    return url.pathname === '/index.xhtml'
      || /^\/index\.xhtml;jsessionid=[A-Za-z0-9._-]+$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function isExactTjrrPdfUrl(value: string, expectedId?: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'jurisprudencia.tjrr.jus.br') return false;
    if (!/^\/pdf(?:;jsessionid=[A-Za-z0-9._-]+)?$/.test(url.pathname)) return false;
    const id = url.searchParams.get('id') || '';
    if (!/^\d+$/.test(id)) return false;
    return !expectedId || id === expectedId;
  } catch {
    return false;
  }
}

export function isExactTjtoSearchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'jurisprudencia.tjto.jus.br') return false;
    if (url.pathname !== '/consulta.php') return false;
    const allowed = new Set(['q']);
    for (const key of url.searchParams.keys()) if (!allowed.has(key)) return false;
    return Boolean(url.searchParams.get('q'));
  } catch {
    return false;
  }
}

export function isExactTjtoCandidateDocumentUrl(value: string, expectedUuid?: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'jurisprudencia.tjto.jus.br') return false;
    if (url.pathname !== '/viewFileDoc.php') return false;
    const uuid = url.searchParams.get('uuid') || '';
    if (!/^[a-f0-9]{32}$/i.test(uuid)) return false;
    for (const key of url.searchParams.keys()) if (key !== 'uuid' && key !== 'options') return false;
    return !expectedUuid || uuid.toLowerCase() === expectedUuid.toLowerCase();
  } catch {
    return false;
  }
}

export function isExactTjrnSearchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'jurisprudencia.tjrn.jus.br'
      && url.pathname === '/api/pesquisar'
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

export function isExactTjroPrecedentsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'liame.tjro.jus.br'
      && url.pathname === '/api/pesquisa/precedentes'
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

export function isExactTjmaTurnstileStatusUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'apijuris.tjma.jus.br'
      && url.pathname === '/v1/util/turnstile/check_habilitado'
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

export function isExactTjmaSearchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'apijuris.tjma.jus.br'
      && url.pathname === '/v1/sg/jurisprudencias/processos'
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}
