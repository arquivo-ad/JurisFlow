const OFFICIAL_HOSTS_BY_COURT: Record<string, ReadonlySet<string>> = {
  TST: new Set(['jurisprudencia-backend.tst.jus.br', 'jurisprudencia.tst.jus.br']),
  STJ: new Set(['processo.stj.jus.br', 'scon.stj.jus.br', 'dadosabertos.web.stj.jus.br']),
  STF: new Set(['portal.stf.jus.br', 'jurisprudencia.stf.jus.br']),
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
