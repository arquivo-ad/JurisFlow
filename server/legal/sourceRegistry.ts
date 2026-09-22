import { LegalSourceRegistryItem } from './types.ts';

const DATAJUD_CONFIGURED = Boolean(process.env.DATAJUD_API_KEY?.trim());

/**
 * REGISTRO PERSISTENTE DE FONTES OFICIAIS DO PODER JUDICIÁRIO BRASILEIRO
 *
 * Princípio: Todo conector aponta para documentação oficial e URL pública verificável.
 * Nenhum tribunal é declarado "CONNECTED" sem uma integração real executada e auditável.
 */

export const INITIAL_LEGAL_SOURCE_REGISTRY: LegalSourceRegistryItem[] = [
  // 1. FONTES DE PRECEDENTES QUALIFICADOS E DADOS ABERTOS (AUTOMATIZADAS NO MVP)
  {
    sourceId: 'stj-dados-abertos',
    name: 'Superior Tribunal de Justiça - Portal de Dados Abertos (SCON/CKAN)',
    courtCode: 'STJ',
    jurisdiction: 'BRASIL',
    sourceType: 'OFFICIAL_OPEN_DATA',
    officialBaseUrl: 'https://dadosabertos.web.stj.jus.br/',
    documentationUrl: 'https://dadosabertos.web.stj.jus.br/dataset',
    connectorStatus: 'PARTIAL',
    coverageStatus: 'Dataset oficial de precedentes qualificados; validação individual obrigatória',
    verificationMethod: 'OPEN_DATA_DIGEST',
    termsStatus: 'COMPLIANT_PUBLIC_ACCESS',
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  },
  {
    sourceId: 'cnj-datajud',
    name: 'Conselho Nacional de Justiça - DataJud (API Pública Processual)',
    courtCode: 'CNJ',
    jurisdiction: 'BRASIL',
    sourceType: 'OFFICIAL_API',
    officialBaseUrl: 'https://api-publica.datajud.cnj.jus.br/',
    documentationUrl: 'https://datajud-wiki.cnj.jus.br/api-publica/',
    connectorStatus: DATAJUD_CONFIGURED ? 'READY' : 'NOT_CONFIGURED',
    coverageStatus: DATAJUD_CONFIGURED
      ? 'Metadados processuais reais do CNJ validados ao vivo em múltiplos tribunais; identidade, movimentos e hashes auditáveis.'
      : 'Metadados processuais (capa, classe, órgão julgador, movimentos e TPU) - aguardando DATAJUD_API_KEY',
    verificationMethod: 'AUTOMATED_API',
    termsStatus: 'COMPLIANT_PUBLIC_ACCESS',
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: true,
    credentialConfigured: DATAJUD_CONFIGURED,
  },
  {
    sourceId: 'cnj-djen-public',
    name: 'Conselho Nacional de Justiça - DJEN API Pública',
    courtCode: 'CNJ',
    jurisdiction: 'BRASIL',
    sourceType: 'OFFICIAL_API',
    officialBaseUrl: 'https://comunicaapi.pje.jus.br/api/v1/comunicacao',
    documentationUrl: 'https://comunicaapi.pje.jus.br/',
    connectorStatus: 'READY',
    coverageStatus: 'Consulta pública de comunicações do DJEN/Editais com certidão PDF individual por hash e SHA-256',
    verificationMethod: 'AUTOMATED_API',
    termsStatus: 'COMPLIANT_PUBLIC_ACCESS',
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  },
  {
    sourceId: 'cnj-bnp-pangea',
    name: 'Banco Nacional de Precedentes (BNP / Pangea - Justiça 4.0)',
    courtCode: 'BNP',
    jurisdiction: 'BRASIL',
    sourceType: 'OFFICIAL_API',
    officialBaseUrl: 'https://bnp.pdpj.jus.br/',
    documentationUrl: 'https://www.cnj.jus.br/tecnologia-da-informacao-e-comunicacao/justica-4-0/banco-nacional-de-precedentes-bnp/',
    connectorStatus: 'NOT_IMPLEMENTED',
    coverageStatus: 'Temas Repetitivos, Repercussão Geral, IRDR, IAC e Súmulas Vinculantes',
    verificationMethod: 'AUTOMATED_API',
    termsStatus: 'COMPLIANT_PUBLIC_ACCESS',
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  },

  // 2. TRIBUNAIS SUPERIORES (CONSULTA OFICIAL E DADOS ABERTOS)
  {
    sourceId: 'stf-jurisprudencia',
    name: 'Supremo Tribunal Federal - Pesquisa de Jurisprudência & Corte Aberta',
    courtCode: 'STF',
    jurisdiction: 'BRASIL',
    sourceType: 'OFFICIAL_SEARCH',
    officialBaseUrl: 'https://portal.stf.jus.br/jurisprudencia/',
    documentationUrl: 'https://portal.stf.jus.br/hotsites/corteaberta/',
    connectorStatus: 'PARTIAL',
    coverageStatus: 'Temas de repercussão geral individualizados; cadeia TLS corrigida com intermediária oficial GlobalSign; runtime local ainda recebe HTTP 403 do ELB; Súmulas Vinculantes pendentes',
    verificationMethod: 'OPEN_DATA_DIGEST',
    termsStatus: 'COMPLIANT_PUBLIC_ACCESS',
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  },
  {
    sourceId: 'tst-jurisprudencia',
    name: 'Tribunal Superior do Trabalho - Consulta Unificada de Jurisprudência',
    courtCode: 'TST',
    jurisdiction: 'BRASIL',
    sourceType: 'OFFICIAL_API',
    officialBaseUrl: 'https://jurisprudencia-backend.tst.jus.br/',
    documentationUrl: 'https://www.tst.jus.br/jurisprudencia',
    connectorStatus: 'PARTIAL',
    coverageStatus: 'Consulta oficial em tempo real de acórdãos; coleção normativa integrada separadamente em tst-normativos',
    verificationMethod: 'AUTOMATED_API',
    termsStatus: 'COMPLIANT_PUBLIC_ACCESS',
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  },
  {
    sourceId: 'tst-normativos',
    name: 'Tribunal Superior do Trabalho - Livro de Súmulas, OJs e Precedentes Normativos',
    courtCode: 'TST',
    jurisdiction: 'BRASIL',
    sourceType: 'OFFICIAL_DOCUMENT_DOWNLOAD',
    officialBaseUrl: 'https://www.tst.jus.br/documents/d/guest/livrointernet-12-pdf',
    documentationUrl: 'https://www.tst.jus.br/livro-de-sumulas-ojs-e-pns',
    connectorStatus: 'READY',
    coverageStatus: 'Coleção oficial consolidada: Súmulas, Orientações Jurisprudenciais e Precedentes Normativos; status de cancelamento preservado',
    verificationMethod: 'OPEN_DATA_DIGEST',
    termsStatus: 'COMPLIANT_PUBLIC_ACCESS',
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  },
  {
    sourceId: 'falcao-jurisprudencia',
    name: 'Sistema Falcão - Repositório Nacional de Jurisprudência da Justiça do Trabalho',
    courtCode: 'JT',
    jurisdiction: 'BRASIL',
    sourceType: 'OFFICIAL_API',
    officialBaseUrl: 'https://jurisprudencia.jt.jus.br/jurisprudencia-nacional-backend/api/no-auth/',
    documentationUrl: 'https://jurisprudencia.jt.jus.br/',
    connectorStatus: 'READY',
    coverageStatus: 'Acórdãos oficiais dos TRT1 a TRT24 com busca pública, documento individual e SHA-256; rate limit HTTP 429 tratado em fail-closed',
    verificationMethod: 'AUTOMATED_API',
    termsStatus: 'COMPLIANT_PUBLIC_ACCESS',
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  },
  {
    sourceId: 'tse-jurisprudencia',
    name: 'Tribunal Superior Eleitoral - Jurisprudência & Súmulas',
    courtCode: 'TSE',
    jurisdiction: 'BRASIL',
    sourceType: 'OFFICIAL_SEARCH',
    officialBaseUrl: 'https://www.tse.jus.br/jurisprudencia',
    documentationUrl: 'https://www.tse.jus.br/jurisprudencia',
    connectorStatus: 'MANUAL_ONLY',
    coverageStatus: 'Matéria eleitoral especializada - Link oficial para conferência humana',
    verificationMethod: 'HUMAN_VERIFICATION_LINK',
    termsStatus: 'MANUAL_ONLY',
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  },
  {
    sourceId: 'stm-jurisprudencia',
    name: 'Superior Tribunal Militar - Jurisprudência Militar da União',
    courtCode: 'STM',
    jurisdiction: 'BRASIL',
    sourceType: 'OFFICIAL_SEARCH',
    officialBaseUrl: 'https://www.stm.jus.br/jurisprudencia',
    documentationUrl: 'https://www.stm.jus.br/jurisprudencia',
    connectorStatus: 'MANUAL_ONLY',
    coverageStatus: 'Justiça Militar Federal - Link oficial para conferência humana',
    verificationMethod: 'HUMAN_VERIFICATION_LINK',
    termsStatus: 'MANUAL_ONLY',
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  },

  // 3. JUSTIÇA FEDERAL (TRF1 A TRF6)
  ...([1, 2, 3, 4, 5, 6].map((region) => ({
    sourceId: `trf${region}-jurisprudencia`,
    name: `Tribunal Regional Federal da ${region}ª Região (TRF${region})`,
    courtCode: `TRF${region}`,
    jurisdiction: `TRF${region}`,
    sourceType: region === 3 || region === 4 ? 'OFFICIAL_SEARCH' as const : 'MANUAL_VERIFICATION_ONLY' as const,
    officialBaseUrl: region === 3
      ? 'https://web.trf3.jus.br/jurisprudencia/'
      : region === 4
        ? 'https://jurisprudencia.trf4.jus.br/'
        : `https://www.trf${region}.jus.br/`,
    documentationUrl: region === 3
      ? 'https://web.trf3.jus.br/jurisprudencia/'
      : region === 4
        ? 'https://jurisprudencia.trf4.jus.br/'
        : `https://www.trf${region}.jus.br/jurisprudencia`,
    connectorStatus: region === 3 || region === 4 ? 'READY' as const : 'MANUAL_ONLY' as const,
    coverageStatus: region === 3
      ? 'Pesquisa oficial automatizada de acórdãos com verificação individual e SHA-256'
      : region === 4
        ? 'Pesquisa pública eproc automatizada com inteiro teor individual oficial, verificação determinística e SHA-256'
        : 'Jurisprudência Regional Federal - Conferência Humana Obrigatória',
    verificationMethod: region === 3 || region === 4 ? 'OPEN_DATA_DIGEST' as const : 'HUMAN_VERIFICATION_LINK' as const,
    termsStatus: region === 3 || region === 4 ? 'COMPLIANT_PUBLIC_ACCESS' as const : 'MANUAL_ONLY' as const,
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  }))),

  // 4. JUSTIÇA DO TRABALHO (TRT1 A TRT24)
  ...([
    { region: 1, name: 'TRT1 (Rio de Janeiro)', url: 'https://www.trt1.jus.br/' },
    { region: 2, name: 'TRT2 (São Paulo Capital/Litoral)', url: 'https://pje.trt2.jus.br/jurisprudencia/' },
    { region: 3, name: 'TRT3 (Minas Gerais)', url: 'https://portal.trt3.jus.br/' },
    { region: 4, name: 'TRT4 (Rio Grande do Sul)', url: 'https://www.trt4.jus.br/' },
    { region: 15, name: 'TRT15 (Campinas / SP Interior)', url: 'https://trt15.jus.br/' },
  ].map((item) => ({
    sourceId: `trt${item.region}-jurisprudencia`,
    name: item.name,
    courtCode: `TRT${item.region}`,
    jurisdiction: `TRT${item.region}`,
    sourceType: item.region === 2 || item.region === 15 ? 'OFFICIAL_SEARCH' as const : 'MANUAL_VERIFICATION_ONLY' as const,
    officialBaseUrl: item.region === 2
      ? 'https://pje.trt2.jus.br/jurisprudencia/'
      : item.region === 15
        ? 'https://pje.trt15.jus.br/precedentesWeb/pages/public/TemaLista.seam'
        : item.url,
    documentationUrl: item.region === 2
      ? 'https://pje.trt2.jus.br/jurisprudencia/'
      : item.region === 15
        ? 'https://pje.trt15.jus.br/precedentesWeb/pages/public/TemaLista.seam?tipo=IRDR'
        : `${item.url}jurisprudencia`,
    connectorStatus: item.region === 2 ? 'DEGRADED' as const : item.region === 15 ? 'PARTIAL' as const : 'MANUAL_ONLY' as const,
    coverageStatus: item.region === 2
      ? 'Portal oficial identificado; pesquisa pública exige CAPTCHA interativo e permanece fail-closed na automação'
      : item.region === 15
        ? 'Índice público oficial PJe-JT de IRDR/IAC integrado com hash da página e dos registros; detalhe individual ainda sem URL estável verificável. Pesquisa jurisprudencial geral exige reCAPTCHA.'
        : 'Jurisprudência Regional Trabalhista - Conferência Humana Obrigatória',
    verificationMethod: 'HUMAN_VERIFICATION_LINK' as const,
    termsStatus: item.region === 15 ? 'COMPLIANT_PUBLIC_ACCESS' as const : 'MANUAL_ONLY' as const,
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  }))),

  // 5. TRIBUNAIS DE JUSTIÇA ESTADUAIS E DISTRITAL — MATRIZ NACIONAL
  ...([
    { code: 'TJPB', name: 'Tribunal de Justiça do Estado da Paraíba', url: 'https://pje-jurisprudencia.tjpb.jus.br/' },
    { code: 'TJMT', name: 'Tribunal de Justiça do Estado de Mato Grosso', url: 'https://jurisprudencia.tjmt.jus.br/' },
    { code: 'TJRO', name: 'Tribunal de Justiça do Estado de Rondônia', url: 'https://liame.tjro.jus.br/' },
    { code: 'TJES', name: 'Tribunal de Justiça do Estado do Espírito Santo', url: 'https://www.tjes.jus.br/portal-transparencia/audiencias-e-sessoes/jurisprudencia/' },
    { code: 'TJMA', name: 'Tribunal de Justiça do Estado do Maranhão', url: 'https://jurisconsult.tjma.jus.br/' },
    { code: 'TJAP', name: 'Tribunal de Justiça do Estado do Amapá', url: 'https://tucujuris.tjap.jus.br/' },
    { code: 'TJSE', name: 'Tribunal de Justiça do Estado de Sergipe', url: 'https://www.tjse.jus.br/portal/servicos/judiciais/eproc' },
    { code: 'TJSP', name: 'Tribunal de Justiça de São Paulo', url: 'https://esaj.tjsp.jus.br/cjsg/' },
    { code: 'TJRJ', name: 'Tribunal de Justiça do Rio de Janeiro', url: 'https://www3.tjrj.jus.br/ejuris/ConsultarJurisprudencia.aspx' },
    { code: 'TJMG', name: 'Tribunal de Justiça de Minas Gerais', url: 'https://www.tjmg.jus.br/jurisprudencia/' },
    { code: 'TJRS', name: 'Tribunal de Justiça do Rio Grande do Sul', url: 'https://www.tjrs.jus.br/novo/jurisprudencia/' },
    { code: 'TJPR', name: 'Tribunal de Justiça do Paraná', url: 'https://www.tjpr.jus.br/jurisprudencia' },
    { code: 'TJSC', name: 'Tribunal de Justiça de Santa Catarina', url: 'https://www.tjsc.jus.br/jurisprudencia' },
    { code: 'TJBA', name: 'Tribunal de Justiça da Bahia', url: 'https://www.tjba.jus.br/' },
    { code: 'TJCE', name: 'Tribunal de Justiça do Ceará', url: 'https://sjuris.tjce.jus.br/' },
    { code: 'TJPE', name: 'Tribunal de Justiça de Pernambuco', url: 'https://consultajurisprudencia.app.tjpe.jus.br/' },
    { code: 'TJGO', name: 'Tribunal de Justiça do Estado de Goiás', url: 'https://projudi.tjgo.jus.br/ConsultaJurisprudencia' },
    { code: 'TJAC', name: 'Tribunal de Justiça do Estado do Acre', url: 'https://esaj.tjac.jus.br/cjsg/consultaCompleta.do' },
    { code: 'TJAL', name: 'Tribunal de Justiça do Estado de Alagoas', url: 'https://www2.tjal.jus.br/cjsg/consultaCompleta.do' },
    { code: 'TJAM', name: 'Tribunal de Justiça do Estado do Amazonas', url: 'https://consultasaj.tjam.jus.br/cjsg/consultaCompleta.do' },
    { code: 'TJMS', name: 'Tribunal de Justiça do Estado de Mato Grosso do Sul', url: 'https://esaj.tjms.jus.br/cjsg/consultaCompleta.do' },
    { code: 'TJPI', name: 'Tribunal de Justiça do Estado do Piauí', url: 'https://jurisprudencia.tjpi.jus.br/' },
    { code: 'TJPA', name: 'Tribunal de Justiça do Estado do Pará', url: 'https://jurisprudencia.tjpa.jus.br/' },
    { code: 'TJRR', name: 'Tribunal de Justiça do Estado de Roraima', url: 'https://jurisprudencia.tjrr.jus.br/' },
    { code: 'TJTO', name: 'Tribunal de Justiça do Estado do Tocantins', url: 'https://jurisprudencia.tjto.jus.br/' },
    { code: 'TJRN', name: 'Tribunal de Justiça do Estado do Rio Grande do Norte', url: 'https://jurisprudencia.tjrn.jus.br/' },
    { code: 'TJDFT', name: 'Tribunal de Justiça do Distrito Federal e Territórios', url: 'https://pesquisajurisprudencia.tjdft.jus.br/' },
  ].map((tj) => ({
    sourceId: `${tj.code.toLowerCase()}-jurisprudencia`,
    name: `${tj.name} (${tj.code})`,
    courtCode: tj.code,
    jurisdiction: tj.code.replace('TJ', ''),
    sourceType: tj.code === 'TJDFT' || tj.code === 'TJBA' || tj.code === 'TJCE' || tj.code === 'TJPA' || tj.code === 'TJES'
      ? 'OFFICIAL_API' as const
      : tj.code === 'TJSP' || tj.code === 'TJPR' || tj.code === 'TJRS' || tj.code === 'TJRJ' || tj.code === 'TJSC' || tj.code === 'TJMG' || tj.code === 'TJPE' || tj.code === 'TJGO' || tj.code === 'TJAC' || tj.code === 'TJAL' || tj.code === 'TJAM' || tj.code === 'TJMS' || tj.code === 'TJPI' || tj.code === 'TJRR' || tj.code === 'TJTO' || tj.code === 'TJRN' || tj.code === 'TJPB' || tj.code === 'TJMT' || tj.code === 'TJRO' || tj.code === 'TJES' || tj.code === 'TJMA' || tj.code === 'TJAP' || tj.code === 'TJSE'
        ? 'OFFICIAL_SEARCH' as const
        : 'MANUAL_VERIFICATION_ONLY' as const,
    officialBaseUrl: tj.code === 'TJES'
      ? 'https://sistemas.tjes.jus.br/consulta-jurisprudencia/api/search'
      : tj.code === 'TJRO'
      ? 'https://liame.tjro.jus.br/api/pesquisa/precedentes'
      : tj.code === 'TJPR'
      ? 'https://consulta.tjpr.jus.br/projudi_consulta/paginaPrincipal.jsp'
      : tj.code === 'TJDFT'
        ? 'https://jurisdf.tjdft.jus.br/api/v1/pesquisa'
        : tj.code === 'TJBA'
          ? 'https://jurisprudenciaws.tjba.jus.br/graphql'
          : tj.code === 'TJCE'
            ? 'https://gateway.tjce.jus.br/sjuris/api/v1/jurisprudencia'
            : tj.code === 'TJPA'
              ? 'https://jurisprudencia.tjpa.jus.br/bff/api/decisoes/buscar'
              : tj.code === 'TJRN'
                ? 'https://jurisprudencia.tjrn.jus.br/api/pesquisar'
                : tj.code === 'TJPE'
              ? 'https://consultajurisprudencia.app.tjpe.jus.br/api/v1/jurisprudencias'
              : tj.url,
    documentationUrl: tj.code === 'TJES'
      ? 'https://sistemas.tjes.jus.br/consulta-jurisprudencia/'
      : tj.code === 'TJRO'
      ? 'https://liame.tjro.jus.br/'
      : tj.code === 'TJPR'
      ? 'https://consulta.tjpr.jus.br/projudi_consulta/paginaPrincipal.jsp'
      : tj.code === 'TJDFT'
        ? 'https://www.tjdft.jus.br/transparencia/tecnologia-da-informacao-e-comunicacao/dados-abertos/webservice-ou-api'
        : tj.code === 'TJBA'
          ? 'https://jurisprudencia.tjba.jus.br/'
          : tj.code === 'TJCE'
            ? 'https://sjuris.tjce.jus.br/'
            : tj.code === 'TJPA'
              ? 'https://jurisprudencia.tjpa.jus.br/'
              : tj.code === 'TJRN'
                ? 'https://jurisprudencia.tjrn.jus.br/'
                : tj.code === 'TJPE'
              ? 'https://consultajurisprudencia.app.tjpe.jus.br/'
              : tj.url,
    connectorStatus: tj.code === 'TJSP'
      ? 'DEGRADED' as const
      : tj.code === 'TJDFT' || tj.code === 'TJSC' || tj.code === 'TJBA' || tj.code === 'TJCE' || tj.code === 'TJMS' || tj.code === 'TJPI' || tj.code === 'TJPA' || tj.code === 'TJRR' || tj.code === 'TJES'
        ? 'READY' as const
        : tj.code === 'TJMA'
          ? 'DEGRADED' as const
          : tj.code === 'TJPR' || tj.code === 'TJRS' || tj.code === 'TJPE' || tj.code === 'TJGO' || tj.code === 'TJAC' || tj.code === 'TJAL' || tj.code === 'TJAM' || tj.code === 'TJTO' || tj.code === 'TJRN' || tj.code === 'TJPB' || tj.code === 'TJMT' || tj.code === 'TJRO' || tj.code === 'TJAP' || tj.code === 'TJSE'
            ? 'PARTIAL' as const
          : tj.code === 'TJRJ' || tj.code === 'TJMG'
            ? 'DEGRADED' as const
            : 'MANUAL_ONLY' as const,
    coverageStatus: tj.code === 'TJSP'
      ? 'Portal e-SAJ oficial identificado; pesquisa jurisprudencial exige reCAPTCHA/CAPTCHA interativo e permanece fail-closed'
      : tj.code === 'TJPR'
        ? 'Família Projudi identificada; consulta processual e consulta pública de precedentes exigem reCAPTCHA no submit. JurisFlow permanece fail-closed e não contorna o desafio interativo.'
        : tj.code === 'TJRS'
          ? 'Pesquisa oficial Solr automatizada com metadados, ementa e inteiro teor em Base64. Registros permanecem FOUND_UNVERIFIED por ausência de URL individual oficial estável.'
          : tj.code === 'TJDFT'
            ? 'API pública oficial documentada; busca estruturada e confirmação individual por UUID com SHA-256.'
            : tj.code === 'TJRJ'
              ? 'Desde 04/02/2026 a jurisprudência está dividida entre eJURIS legado e eproc. O eJURIS exige reCAPTCHA v3 no fluxo de pesquisa; o eproc 2G redireciona para SSO. JurisFlow não contorna CAPTCHA nem autenticação.'
              : tj.code === 'TJSC'
                ? 'Pesquisa pública eproc automatizada com inteiro teor individual oficial, URL canônica e SHA-256.'
                : tj.code === 'TJBA'
                  ? 'GraphQL oficial público com busca estruturada e inteiro teor individual por hash UUID, confirmado com SHA-256.'
                  : tj.code === 'TJMG'
                    ? 'Sistema legado de jurisprudência possui pesquisa e espelhos individuais, mas a descoberta exige CAPTCHA. O novo eproc reconhece a ação de jurisprudência, porém atualmente retorna falha de processamento sem formulário público.'
                    : tj.code === 'TJCE'
                      ? 'SJURIS/PJe oficial com API pública, consulta individual e PDF autenticado por registro; SHA-256 calculado sobre o PDF confirmado.'
                      : tj.code === 'TJPA'
                        ? 'Banco de Jurisprudência oficial com BFF público; busca estruturada e confirmação individual única por id, com página pública /documento/{id} e SHA-256.'
                        : tj.code === 'TJRR'
                          ? 'Pesquisa pública PrimeFaces/JSF sem CAPTCHA, com inteiro teor e PDF individual oficial por ID; SHA-256 calculado sobre o PDF confirmado.'
                          : tj.code === 'TJTO'
                            ? 'Busca pública automatizada com CNJ, relator, órgão, ementa completa e UUID. Inteiro teor viewFileDoc.php retornou HTTP 403 no smoke direto; resultados permanecem FOUND_UNVERIFIED.'
                            : tj.code === 'TJRN'
                              ? 'API pública oficial retorna acórdãos, ementas e inteiro teor reais. O documento individual PJe redireciona para SSO; resultados permanecem FOUND_UNVERIFIED.'
                              : tj.code === 'TJPE'
                        ? 'Busca REST oficial automatizada com texto de acórdãos. Inteiro teor por codigoProcesso apresentou PDFs de processos divergentes em smoke real; resultados permanecem FOUND_UNVERIFIED e fail-closed.'
                        : tj.code === 'TJGO'
                          ? 'Portal Projudi oficial identificado. Pesquisa e AJAX de texto formatado exigem Turnstile/Cloudflare; automação permanece INTERACTIVE_REQUIRED e fail-closed.'
                          : tj.code === 'TJMS'
                            ? 'Pesquisa e-SAJ automatizada com acórdão individual PDF via getArquivo.do e SHA-256; VERIFIED_OFFICIAL.'
                            : tj.code === 'TJPI'
                              ? 'JusPI público com pesquisa atual, página individual oficial por ID, ementa/acórdão completos e SHA-256.'
                              : tj.code === 'TJAC' || tj.code === 'TJAL' || tj.code === 'TJAM'
                              ? 'Pesquisa e-SAJ automatizada com ementa completa. Inteiro teor individual exige reCAPTCHA; resultados permanecem FOUND_UNVERIFIED.'
                              : tj.code === 'TJPB'
                                ? 'Novo PJe-Jurisprudência oficial identificado, porém o acesso automatizado atual recebe Cloudflare HTTP 403. Fail-closed, sem bypass.'
                                : tj.code === 'TJMT'
                                  ? 'Portal oficial de jurisprudência identificado, mas atualmente responde página de manutenção. Sem reutilizar dados antigos.'
                                  : tj.code === 'TJRO'
                                    ? 'Liame público oficial com API de precedentes qualificados (IRDR/IAC), tese e processos paradigma. Acórdão individual PJe exige SSO; resultados permanecem FOUND_UNVERIFIED.'
                                    : tj.code === 'TJES'
                                      ? 'Nova consulta pública oficial com API Solr agregadora. PJe 2G e acervo legado são pesquisados e cada acórdão é reconfirmado por ID único com inteiro teor e SHA-256.'
                                      : tj.code === 'TJMA'
                                        ? 'Jurisconsult e API apijuris oficiais confirmados. Backend informa Turnstile habilitado e a rota de acórdãos responde captcha_not_provided sem token; automação permanece fail-closed.'
                                        : tj.code === 'TJAP'
                                          ? 'Tucujuris oficial identificado, porém o acesso automatizado atual recebe Cloudflare HTTP 403. Fail-closed, sem bypass.'
                                          : tj.code === 'TJSE'
                                            ? 'eproc público expõe formulário de jurisprudência, porém as origens atuais estão configuradas como TRF4/TRU4/Justiça Federal; JurisFlow não atribui esses dados ao TJSE.'
                                            : 'Justiça Estadual Comum - Conferência Humana Obrigatória',
    verificationMethod: tj.code === 'TJRS' || tj.code === 'TJPE' || tj.code === 'TJDFT' || tj.code === 'TJSC' || tj.code === 'TJBA' || tj.code === 'TJCE' || tj.code === 'TJMS' || tj.code === 'TJPI' || tj.code === 'TJPA' || tj.code === 'TJRR' || tj.code === 'TJES' ? 'OPEN_DATA_DIGEST' as const : 'HUMAN_VERIFICATION_LINK' as const,
    termsStatus: tj.code === 'TJRS' || tj.code === 'TJPE' || tj.code === 'TJDFT' || tj.code === 'TJSC' || tj.code === 'TJBA' || tj.code === 'TJCE' || tj.code === 'TJMS' || tj.code === 'TJPI' || tj.code === 'TJPA' || tj.code === 'TJRR' || tj.code === 'TJES' || tj.code === 'TJAC' || tj.code === 'TJAL' || tj.code === 'TJAM' || tj.code === 'TJRN' ? 'COMPLIANT_PUBLIC_ACCESS' as const : 'MANUAL_ONLY' as const,
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  }))),

  // 6. ÓRGÃOS ADMINISTRATIVOS E TURMAS RECURSAIS
  {
    sourceId: 'tnu-jurisprudencia',
    name: 'Turma Nacional de Uniformização dos JEFs (TNU / CJF)',
    courtCode: 'TNU',
    jurisdiction: 'BRASIL',
    sourceType: 'OFFICIAL_SEARCH',
    officialBaseUrl: 'https://www.cjf.jus.br/cjf/jurisprudencia/turma-nacional-de-uniformizacao',
    documentationUrl: 'https://www.cjf.jus.br/cjf/jurisprudencia/turma-nacional-de-uniformizacao',
    connectorStatus: 'MANUAL_ONLY',
    coverageStatus: 'Juizados Especiais Federais - Temas Representativos da Controvérsia',
    verificationMethod: 'HUMAN_VERIFICATION_LINK',
    termsStatus: 'MANUAL_ONLY',
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  },
  {
    sourceId: 'tcu-jurisprudencia',
    name: 'Tribunal de Contas da União - Pesquisa Selecionada & Súmulas',
    courtCode: 'TCU',
    jurisdiction: 'BRASIL',
    sourceType: 'OFFICIAL_SEARCH',
    officialBaseUrl: 'https://pesquisa.apps.tcu.gov.br/',
    documentationUrl: 'https://portal.tcu.gov.br/jurisprudencia/',
    connectorStatus: 'MANUAL_ONLY',
    coverageStatus: 'Direito Administrativo e Controle Externo - Link oficial para conferência',
    verificationMethod: 'HUMAN_VERIFICATION_LINK',
    termsStatus: 'MANUAL_ONLY',
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  },
  {
    sourceId: 'carf-jurisprudencia',
    name: 'Conselho Administrativo de Recursos Fiscais (CARF)',
    courtCode: 'CARF',
    jurisdiction: 'BRASIL',
    sourceType: 'OFFICIAL_SEARCH',
    officialBaseUrl: 'https://carf.fazenda.gov.br/sincon/',
    documentationUrl: 'https://carf.fazenda.gov.br/',
    connectorStatus: 'MANUAL_ONLY',
    coverageStatus: 'Contencioso Administrativo Tributário Federal',
    verificationMethod: 'HUMAN_VERIFICATION_LINK',
    termsStatus: 'MANUAL_ONLY',
    documentsDiscovered: 0,
    documentsFetched: 0,
    documentsValidated: 0,
    documentsRejected: 0,
    enabled: true,
    requiresCredential: false,
    credentialConfigured: false,
  },
];
