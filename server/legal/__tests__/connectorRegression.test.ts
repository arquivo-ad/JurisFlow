import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { TstJurisprudenciaAdapter } from '../adapters/TstJurisprudenciaAdapter.ts';
import { TstNormativeCollectionAdapter } from '../adapters/TstNormativeCollectionAdapter.ts';
import { StjDadosAbertosAdapter } from '../adapters/StjDadosAbertosAdapter.ts';
import { StfJurisprudenciaAdapter } from '../adapters/StfJurisprudenciaAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactStjDocumentUrl } from '../officialSources.ts';
import { DataJudAdapter } from '../adapters/DataJudAdapter.ts';
import { Trt2JurisprudenciaAdapter } from '../adapters/Trt2JurisprudenciaAdapter.ts';
import { TjspJurisprudenciaAdapter } from '../adapters/TjspJurisprudenciaAdapter.ts';
import { Trf3JurisprudenciaAdapter } from '../adapters/Trf3JurisprudenciaAdapter.ts';
import { Trf4JurisprudenciaAdapter } from '../adapters/Trf4JurisprudenciaAdapter.ts';
import { Trt15PrecedentsAdapter, isExactTrt15PrecedentsListUrl } from '../adapters/Trt15PrecedentsAdapter.ts';
import { FalcaoJurisprudenciaAdapter } from '../adapters/FalcaoJurisprudenciaAdapter.ts';
import { TjrsJurisprudenciaAdapter, isExactTjrsAjaxUrl } from '../adapters/TjrsJurisprudenciaAdapter.ts';
import { TjdftJurisprudenciaAdapter } from '../adapters/TjdftJurisprudenciaAdapter.ts';
import { TjscJurisprudenciaAdapter } from '../adapters/TjscJurisprudenciaAdapter.ts';
import { TjbaJurisprudenciaAdapter } from '../adapters/TjbaJurisprudenciaAdapter.ts';
import { TjceJurisprudenciaAdapter } from '../adapters/TjceJurisprudenciaAdapter.ts';
import { TjpeJurisprudenciaAdapter } from '../adapters/TjpeJurisprudenciaAdapter.ts';
import { EsajJurisprudenciaAdapter } from '../adapters/EsajJurisprudenciaAdapter.ts';
import { TjpiJurisprudenciaAdapter } from '../adapters/TjpiJurisprudenciaAdapter.ts';
import { TjpaJurisprudenciaAdapter } from '../adapters/TjpaJurisprudenciaAdapter.ts';
import { DjenPublicationsAdapter } from '../adapters/DjenPublicationsAdapter.ts';
import { CourtFamilyProbeAdapter } from '../adapters/CourtFamilyProbeAdapter.ts';
import { isExactTrt2OptionsUrl, isExactTjspSearchUrl, isExactTrf3DocumentUrl, isExactTrf4DocumentUrl, isExactTrf4SearchUrl, isExactTstNormativeCollectionUrl, isExactDjenSearchUrl, isExactDjenCertificateUrl, isExactFalcaoSearchUrl, isExactFalcaoDocumentUrl, isExactTjdftSearchUrl, isExactTjscDocumentUrl, isExactTjscSearchUrl, isExactTjbaGraphqlUrl, isExactTjbaDocumentUrl, isExactTjceSearchUrl, isExactTjceDocumentUrl, isExactTjpeSearchUrl, isExactTjpeCandidatePdfUrl, isExactEsajSearchUrl, isExactEsajDocumentUrl, isExactTjpiSearchUrl, isExactTjpiDetailUrl, isExactTjpaSearchUrl, isExactTjpaDetailUrl, isExactTjpaPublicDocumentUrl } from '../officialSources.ts';
import { DataJudSearchProvider, JudicialSearchService } from '../judicialSearchProvider.ts';
import { LegalCompetenceClassifier } from '../classifier.ts';
import { getCourtFamilyConfig, isAllowedCourtFamilyUrl } from '../courtFamilies.ts';

const record = {
  id: 'tst-regression-1',
  tipo: 'ACORDAO',
  numFormatado: 'AIRR - 112-81.2021.5.08.0002',
  orgaoJudicante: { descricao: '8ª Turma' },
  nomRelator: 'Relator Oficial',
  dtaJulgamento: '2026-09-02T00:00:00-03:00',
  dtaPublicacao: '2026-09-09T07:00:00-03:00',
  ementa: 'FUNDAÇÃO PÚBLICA. REGIME CELETISTA. VERBAS RESCISÓRIAS. CARGO DE CONFIANÇA.',
  numeracaoUnica: { numero: 112, digito: 81, ano: 2021, orgao: 5, tribunal: 8, vara: 2 },
};

function tstFetch(documentBody: string, documentStatus = 200): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('/rest/documentos/')) {
      return new Response(documentBody, { status: documentStatus, headers: { 'Content-Type': 'text/html' } });
    }
    return new Response(JSON.stringify({ totalRegistros: 1, registros: [{ registro: record }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

test('TST só verifica após baixar o documento individual', async () => {
  const failed = await new TstJurisprudenciaAdapter(tstFetch('indisponível', 503))
    .searchOfficialJurisprudence('fundação pública verbas rescisórias');
  assert.equal(failed.decisions.length, 0);
  assert.equal(failed.diagnostic.lifecycleState, 'EMPTY_VALID_DATASET');
});

test('alteração do documento oficial produz novo SHA-256', async () => {
  const first = await new TstJurisprudenciaAdapter(tstFetch('<html>versão oficial 1</html>'))
    .searchOfficialJurisprudence('fundação pública verbas rescisórias');
  const second = await new TstJurisprudenciaAdapter(tstFetch('<html>versão oficial 2</html>'))
    .searchOfficialJurisprudence('fundação pública verbas rescisórias');
  assert.notEqual(first.decisions[0]?.contentSha256, second.decisions[0]?.contentSha256);
});

test('hostname parecido com jus.br é rejeitado pela lista exata', () => {
  const result = PrecedentVerifier.verifyDecision({
    rawCaseNumber: 'AIRR - 112-81.2021.5.08.0002',
    officialUrl: 'https://jurisprudencia-backend.tst.jus.br.evil.example/rest/documentos/00001128120215080002/02-09-2026/09-09-2026',
    court: 'Tribunal Superior do Trabalho', courtCode: 'TST', courtOrgan: '8ª Turma', rapporteur: 'Relator Oficial',
    documentType: 'ACORDAO', judgmentDate: '2026-09-02', publicationDate: '2026-09-09',
    officialHeadnote: record.ementa, precedentSituation: 'JULGADO', contentSha256: 'a'.repeat(64),
    lastVerifiedAt: '2026-09-20T00:00:00.000Z',
  });
  assert.equal(result.isPassed, false);
  assert.ok(result.issues.some((issue) => issue.startsWith('DOMINIO_NAO_OFICIAL')));
});

test('STJ constrói apenas URL individual oficial com registro e data válidos', () => {
  const url = StjDadosAbertosAdapter.buildOfficialDocumentUrl('2009-03-10', '200801199924');
  assert.equal(
    url,
    'https://processo.stj.jus.br/SCON/GetInteiroTeorDoAcordao?dt_publicacao=10%2F03%2F2009&num_registro=200801199924'
  );
  assert.equal(isExactStjDocumentUrl(url || ''), true);
  assert.equal(StjDadosAbertosAdapter.buildOfficialDocumentUrl('data inválida', '200801199924'), null);
  assert.equal(StjDadosAbertosAdapter.buildOfficialDocumentUrl('2009-03-10', '123'), null);
  assert.equal(
    isExactStjDocumentUrl('https://processo.stj.jus.br.evil.example/SCON/GetInteiroTeorDoAcordao?dt_publicacao=10%2F03%2F2009&num_registro=200801199924'),
    false
  );
});

test('STJ confirma PDF individual e calcula SHA-256 sobre os bytes recebidos', async () => {
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(2048, 65)]);
  const fetchPdf = (async () => new Response(pdf, {
    status: 200,
    headers: { 'Content-Type': 'application/pdf' },
  })) as typeof fetch;
  const adapter = new StjDadosAbertosAdapter(
    undefined,
    fetchPdf,
    30_000,
    async () => `RECURSO ESPECIAL Nº 1.061.530 - RS (2008/0119992-4)\nRELATORA: MINISTRA NANCY ANDRIGHI\nEMENTA\nTexto oficial.\nACÓRDÃO\nVistos, relatados e discutidos estes autos, acordam os Ministros da SEGUNDA SEÇÃO do Superior Tribunal de Justiça.\nDocumento: 826356 - Inteiro Teor do Acórdão.`
  );
  const url = StjDadosAbertosAdapter.buildOfficialDocumentUrl('2009-03-10', '200801199924')!;
  const result = await adapter.fetchOfficialDocument(url);
  assert.equal(result.success, true);
  assert.equal(result.httpStatus, 200);
  assert.equal(result.bytes, pdf.length);
  assert.equal(result.contentSha256, StjDadosAbertosAdapter.computeBufferSha256(pdf));
});

test('STJ rejeita HTML ou bloqueio no lugar do inteiro teor', async () => {
  const fetchHtml = (async () => new Response('<html>challenge</html>', {
    status: 403,
    headers: { 'Content-Type': 'text/html' },
  })) as typeof fetch;
  const adapter = new StjDadosAbertosAdapter(undefined, fetchHtml, 30_000, async () => '');
  const url = StjDadosAbertosAdapter.buildOfficialDocumentUrl('2009-03-10', '200801199924')!;
  const result = await adapter.fetchOfficialDocument(url);
  assert.equal(result.success, false);
  assert.equal(result.httpStatus, 403);
  assert.match(result.error || '', /Inteiro teor STJ inválido/);
});

const stfThemeIndexHtml = `<!doctype html><html><body>
<h1>Tema</h1><div>Tema: 0069</div><div>Título: Inclusão do ICMS na base de cálculo do PIS e da COFINS.</div>
<div>Descrição: Recurso extraordinário sobre a base de cálculo das contribuições. Ver assuntos:</div>
<div>Informações gerais Leading Case: RE 574706 Manifestação Ministro: MIN. CÁRMEN LÚCIA Plenário Virtual</div>
<div>Data da Repercussão geral: 25/04/2008 Situação: Trânsito em Julgado - 09/09/2021</div>
<a href="verAndamentoProcesso.asp?classeProcesso=RE&amp;incidente=2585258&amp;numeroProcesso=574706&amp;numeroTema=69">Leading case</a>
${'registro oficial '.repeat(30)}</body></html>`;

const stfThemeDetailHtml = `<!doctype html><html><body><h1>Tema 69</h1>
<div>Relator(a): MIN. CÁRMEN LÚCIA</div><div>Leading Case: RE 574706</div>
<div>Descrição: Recurso extraordinário em que se discute a inclusão do ICMS.</div>
<div>Tese: O ICMS não compõe a base de cálculo para a incidência do PIS e da COFINS.</div>
<div>Data Andamento Órgão Julgador Observação Documento</div>
${'andamento oficial '.repeat(30)}</body></html>`;

function stfFetch(detailHtml = stfThemeDetailHtml): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    const body = url.includes('tema.asp') ? stfThemeIndexHtml : detailHtml;
    return new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }) as typeof fetch;
}

test('STF verifica Tema de Repercussão Geral em dois registros oficiais individuais', async () => {
  const result = await new StfJurisprudenciaAdapter(stfFetch()).searchTheme(69);
  assert.equal(result.diagnostic.lifecycleState, 'SEARCH_SUCCESS');
  assert.equal(result.decision?.verificationStatus, 'VERIFIED_OFFICIAL');
  assert.equal(result.decision?.rawCaseNumber, 'RE 574706');
  assert.equal(result.decision?.rapporteur, 'MIN. CÁRMEN LÚCIA');
  assert.equal(result.decision?.courtOrgan, 'Plenário Virtual');
  assert.match(result.decision?.rulingThesis || '', /ICMS não compõe/);
  assert.match(result.decision?.contentSha256 || '', /^[a-f0-9]{64}$/);
  assert.match(result.decision?.officialUrl || '', /verAndamentoProcesso\.asp/);
});

test('STF retém Tema sem tese oficial em vez de preencher conteúdo', async () => {
  const withoutThesis = stfThemeDetailHtml.replace('Tese: O ICMS não compõe a base de cálculo para a incidência do PIS e da COFINS.', 'Tese:');
  const result = await new StfJurisprudenciaAdapter(stfFetch(withoutThesis)).searchTheme(69);
  assert.equal(result.decision, undefined);
  assert.equal(result.diagnostic.lifecycleState, 'PARSER_ERROR');
  assert.equal(result.diagnostic.documentsRejected, 1);
});

const dataJudSource = {
  numeroProcesso: '00008323520184013202',
  tribunal: 'TRF1',
  grau: 'G1',
  classe: { codigo: 7, nome: 'Procedimento Comum Cível' },
  assuntos: [{ codigo: 9985, nome: 'Direito Administrativo' }],
  orgaoJulgador: { nome: 'Vara Federal' },
  dataAjuizamento: '2018-01-10T00:00:00.000Z',
  dataHoraUltimaAtualizacao: '2026-09-19T12:00:00.000Z',
  nivelSigilo: 0,
  movimentos: [{ codigo: 26, nome: 'Distribuição', dataHora: '2018-01-10T00:00:00.000Z' }],
};

function dataJudFetch(source = dataJudSource): typeof fetch {
  return (async () => new Response(JSON.stringify({ hits: { hits: [{ _source: source }] } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })) as typeof fetch;
}

test('DataJud verifica identidade exata e preserva hashes da consulta e resposta', async () => {
  const adapter = new DataJudAdapter('chave-publica-de-teste', undefined, dataJudFetch());
  const result = await adapter.queryProcessByCnj('0000832-35.2018.4.01.3202');
  assert.equal(result.success, true);
  assert.equal(result.metadata?.normalizedCnjNumber, '0000832-35.2018.4.01.3202');
  assert.equal(result.metadata?.courtCode, 'TRF1');
  assert.match(result.evidence?.endpoint || '', /^https:\/\/api-publica\.datajud\.cnj\.jus\.br\/api_publica_trf1\/_search$/);
  assert.match(result.evidence?.querySha256 || '', /^[a-f0-9]{64}$/);
  assert.match(result.evidence?.responseSha256 || '', /^[a-f0-9]{64}$/);
  assert.match(result.evidence?.recordSha256 || '', /^[a-f0-9]{64}$/);
});

test('DataJud rejeita hit de processo diferente mesmo com HTTP 200', async () => {
  const divergent = { ...dataJudSource, numeroProcesso: '11111111111111111111' };
  const result = await new DataJudAdapter('chave-publica-de-teste', undefined, dataJudFetch(divergent))
    .queryProcessByCnj('0000832-35.2018.4.01.3202');
  assert.equal(result.success, false);
  assert.equal(result.statusCode, 409);
  assert.match(result.error || '', /identidade do processo/i);
});

test('mudança da resposta DataJud produz novo hash de evidência', async () => {
  const first = await new DataJudAdapter('chave-publica-de-teste', undefined, dataJudFetch())
    .queryProcessByCnj('0000832-35.2018.4.01.3202');
  const secondSource = { ...dataJudSource, dataHoraUltimaAtualizacao: '2026-09-20T12:00:00.000Z' };
  const second = await new DataJudAdapter('chave-publica-de-teste', undefined, dataJudFetch(secondSource))
    .queryProcessByCnj('0000832-35.2018.4.01.3202');
  assert.notEqual(first.evidence?.responseSha256, second.evidence?.responseSha256);
});

test('provedor DataJud só exibe selo verificado com evidência criptográfica', async () => {
  const provider = new DataJudSearchProvider(new DataJudAdapter('chave-publica-de-teste', undefined, dataJudFetch()));
  const result = await provider.getProcessDetails('0000832-35.2018.4.01.3202');
  assert.equal(result?.evidenceState, 'VERIFIED_OFFICIAL');
  assert.match(result?.contentSha256 || '', /^[a-f0-9]{64}$/);
  assert.match(result?.sourceUrl || '', /api_publica_trf1\/_search$/);
  assert.match(result?.evidenceId || '', /^DATAJUD:0000832-35\.2018\.4\.01\.3202:[a-f0-9]{20}$/);
});

test('produção não contém assinatura nem processo DJEN fabricados', () => {
  const server = fs.readFileSync(new URL('../../../server.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(server, /Autoridade Certificadora JurisFlow ICP-Brasil/);
  assert.doesNotMatch(server, /payload\.numeroProcesso \|\| '\d{7}-\d{2}/);
  assert.match(server, /DIGITAL_SIGNATURE_NOT_IMPLEMENTED/);
});


test('TRT2 reconhece somente o endpoint oficial exato de opções', () => {
  assert.equal(
    isExactTrt2OptionsUrl('https://pje.trt2.jus.br/juris-backend/api/opcoes'),
    true
  );
  assert.equal(
    isExactTrt2OptionsUrl('https://pje.trt2.jus.br.evil.example/juris-backend/api/opcoes'),
    false
  );
});

test('TRT2 falha fechado quando o portal exige CAPTCHA interativo', async () => {
  const fetchMock = (async () => new Response(JSON.stringify({
    regional: 'TRT da 2ª Região',
    captchaOption: '2',
    version: '1.5.0-i1',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })) as typeof fetch;

  const result = await new Trt2JurisprudenciaAdapter(fetchMock)
    .searchOfficialJurisprudence('adicional de periculosidade');

  assert.equal(result.decisions.length, 0);
  assert.equal(result.requiresInteractiveChallenge, true);
  assert.equal(result.diagnostic.lifecycleState, 'SOURCE_UNAVAILABLE');
  assert.ok(result.diagnostic.rejectionReasons.includes('INTERACTIVE_CAPTCHA_REQUIRED'));
});


test('busca explícita no TRT2 expõe diagnóstico de CAPTCHA sem fabricar acórdão', async () => {
  const service = new JudicialSearchService();
  (service as any).trt2Adapter = {
    searchOfficialJurisprudence: async () => ({
      decisions: [],
      requiresInteractiveChallenge: true,
      diagnostic: {
        adapter: 'trt2-jurisprudencia',
        courtCode: 'TRT2',
        officialUrl: 'https://pje.trt2.jus.br/juris-backend/api/opcoes',
        timestamp: new Date().toISOString(),
        httpStatus: 200,
        latencyMs: 1,
        lifecycleState: 'SOURCE_UNAVAILABLE',
        stateDescription: 'CAPTCHA interativo obrigatório.',
        documentsReceived: 0,
        documentsNormalized: 0,
        documentsRejected: 0,
        rejectionReasons: ['INTERACTIVE_CAPTCHA_REQUIRED'],
        connectorStatus: 'DEGRADED',
      },
    }),
  };

  const result = await service.searchJurisprudence({
    query: 'adicional de periculosidade',
    courtCodes: ['TRT2'],
    onlyVerified: true,
  });

  assert.equal(result.results.some((item) => item.courtCode === 'TRT2'), false);
  assert.equal(result.diagnostic?.lifecycleState, 'SOURCE_UNAVAILABLE');
  assert.ok(result.sourcesConsulted.includes('trt2-jurisprudencia'));
});


test('TJSP reconhece somente a consulta completa oficial do e-SAJ', () => {
  assert.equal(isExactTjspSearchUrl('https://esaj.tjsp.jus.br/cjsg/consultaCompleta.do'), true);
  assert.equal(isExactTjspSearchUrl('https://esaj.tjsp.jus.br.evil.example/cjsg/consultaCompleta.do'), false);
});

test('TJSP falha fechado quando a página oficial exige reCAPTCHA', async () => {
  const html = '<html><form action="/cjsg/resultadoCompleta.do">'
    + '<input name="dados.buscaInteiroTeor">'
    + '<input name="recaptcha_response_token">'
    + '<script>grecaptcha.execute("site-key", {action: "consulta"});</script>'
    + '</form></html>';
  const fetchMock = (async () => new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  })) as typeof fetch;

  const result = await new TjspJurisprudenciaAdapter(fetchMock)
    .searchOfficialJurisprudence('responsabilidade civil');

  assert.equal(result.decisions.length, 0);
  assert.equal(result.requiresInteractiveChallenge, true);
  assert.equal(result.diagnostic.lifecycleState, 'SOURCE_UNAVAILABLE');
  assert.ok(result.diagnostic.rejectionReasons.includes('INTERACTIVE_RECAPTCHA_REQUIRED'));
});

test('busca explícita no TJSP expõe diagnóstico sem fabricar jurisprudência', async () => {
  const service = new JudicialSearchService();
  (service as any).tjspAdapter = {
    searchOfficialJurisprudence: async () => ({
      decisions: [],
      requiresInteractiveChallenge: true,
      diagnostic: {
        adapter: 'tjsp-jurisprudencia',
        courtCode: 'TJSP',
        officialUrl: 'https://esaj.tjsp.jus.br/cjsg/consultaCompleta.do',
        timestamp: new Date().toISOString(),
        httpStatus: 200,
        latencyMs: 1,
        lifecycleState: 'SOURCE_UNAVAILABLE',
        stateDescription: 'reCAPTCHA interativo obrigatório.',
        documentsReceived: 0,
        documentsNormalized: 0,
        documentsRejected: 0,
        rejectionReasons: ['INTERACTIVE_RECAPTCHA_REQUIRED'],
        connectorStatus: 'DEGRADED',
      },
    }),
  };

  const result = await service.searchJurisprudence({
    query: 'responsabilidade civil',
    courtCodes: ['TJSP'],
    onlyVerified: true,
  });

  assert.equal(result.results.some((item) => item.courtCode === 'TJSP'), false);
  assert.equal(result.diagnostic?.lifecycleState, 'SOURCE_UNAVAILABLE');
  assert.ok(result.sourcesConsulted.includes('tjsp-jurisprudencia'));
});

const trf3DetailHtml = `<!doctype html><html><body>
<section class="processo">
<div class="dado" id="processo">5003867-82.2023.4.03.6112</div>
<div class="dado" id="classe">ApCiv - APELAÇÃO CÍVEL</div>
<div class="dado" id="orgao">8ª Turma</div>
<div class="dado" id="relator">Relator(a): Desembargador Federal TORU YAMAMOTO</div>
<div class="dado" id="decisao">Julgamento: 16/09/2026</div>
<div class="dado info-publicacao" id="publicacao">DJEN Data: 19/09/2026</div>
</section>
<section class="ementa" id="divEmenta">
<p class="titulo-oculto">PODER JUDICIÁRIO Ementa PREVIDENCIÁRIO. BENEFÍCIO PREVIDENCIÁRIO.
EMBARGOS DE DECLARAÇÃO. OMISSÃO. CORREÇÃO. EMBARGOS ACOLHIDOS.
A concessão do benefício foi mantida e o período especial reconhecido nos termos da fundamentação.</p>
</section></body></html>`;

test('TRF3 aceita somente URL individual oficial exata', () => {
  assert.equal(
    isExactTrf3DocumentUrl('https://web.trf3.jus.br/jurisprudencia/Home/ListaColecao/9?np=1'),
    true
  );
  assert.equal(
    isExactTrf3DocumentUrl('https://web.trf3.jus.br.evil.example/jurisprudencia/Home/ListaColecao/9?np=1'),
    false
  );
  assert.equal(
    isExactTrf3DocumentUrl('https://web.trf3.jus.br/jurisprudencia/Home/ListaColecao/8?np=1'),
    false
  );
});

function trf3FetchMock(): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/jurisprudencia/')) {
      return new Response('<html>TRF3 Jurisprudência</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html', 'Set-Cookie': 'TRF3SESSION=test-session; Path=/' },
      });
    }
    if (url.includes('/Home/ResultadoTotais')) {
      const html = '<a href="/jurisprudencia/Home/ListaColecao/9?np=1">'
        + '1/1) 5003867-82.2023.4.03.6112 benefício previdenciário</a>';
      return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
    }
    return new Response(trf3DetailHtml, { status: 200, headers: { 'Content-Type': 'text/html' } });
  }) as typeof fetch;
}

test('TRF3 verifica acórdão somente após documento individual oficial', async () => {
  const result = await new Trf3JurisprudenciaAdapter(trf3FetchMock())
    .searchOfficialJurisprudence('beneficio previdenciario', 1);

  assert.equal(result.decisions.length, 1);
  assert.equal(result.diagnostic.lifecycleState, 'SEARCH_SUCCESS');
  assert.equal(result.decisions[0]?.verificationStatus, 'VERIFIED_OFFICIAL');
  assert.equal(result.decisions[0]?.normalizedCnjNumber, '5003867-82.2023.4.03.6112');
  assert.equal(result.decisions[0]?.courtCode, 'TRF3');
  assert.equal(result.decisions[0]?.courtOrgan, '8ª Turma');
  assert.match(result.decisions[0]?.contentSha256 || '', /^[a-f0-9]{64}$/);
});

test('alteração do documento individual TRF3 muda o SHA-256', () => {
  const adapter = new Trf3JurisprudenciaAdapter(trf3FetchMock());
  const evidence = {
    documentUrl: 'https://web.trf3.jus.br/jurisprudencia/Home/ListaColecao/9?np=1',
    documentStatus: 200,
    fetchedAt: '2026-09-20T18:00:00.000Z',
    queryId: 'trf3-query-test',
    querySha256: 'a'.repeat(64),
    queryEndpoint: 'https://web.trf3.jus.br/jurisprudencia/Home/ResultadoTotais',
    responseRecordSha256: 'b'.repeat(64),
  };
  const first = adapter.normalizeDecision(trf3DetailHtml, evidence);
  const second = adapter.normalizeDecision(trf3DetailHtml.replace('OMISSÃO.', 'OMISSÃO SANADA.'), evidence);
  assert.notEqual(first?.contentSha256, second?.contentSha256);
});


test('busca explícita no TRF3 admite acórdão oficial verificado no ranking', async () => {
  const adapter = new Trf3JurisprudenciaAdapter(trf3FetchMock());
  const decision = adapter.normalizeDecision(trf3DetailHtml, {
    documentUrl: 'https://web.trf3.jus.br/jurisprudencia/Home/ListaColecao/9?np=1',
    documentStatus: 200,
    fetchedAt: '2026-09-20T18:00:00.000Z',
    queryId: 'trf3-query-service-test',
    querySha256: 'c'.repeat(64),
    queryEndpoint: 'https://web.trf3.jus.br/jurisprudencia/Home/ResultadoTotais',
    responseRecordSha256: 'd'.repeat(64),
  });
  assert.equal(decision?.verificationStatus, 'VERIFIED_OFFICIAL');

  const service = new JudicialSearchService();
  (service as any).trf3Adapter = {
    searchOfficialJurisprudence: async () => ({
      decisions: [decision],
      totalRecords: 1,
      diagnostic: {
        adapter: 'trf3-jurisprudencia',
        courtCode: 'TRF3',
        officialUrl: 'https://web.trf3.jus.br/jurisprudencia/Home/ResultadoTotais',
        timestamp: new Date().toISOString(),
        httpStatus: 200,
        latencyMs: 1,
        lifecycleState: 'SEARCH_SUCCESS',
        documentsReceived: 1,
        documentsNormalized: 1,
        documentsRejected: 0,
        rejectionReasons: [],
        connectorStatus: 'HEALTHY',
      },
    }),
  };

  const result = await service.searchJurisprudence({
    query: 'beneficio previdenciario',
    courtCodes: ['TRF3'],
    onlyVerified: true,
  });

  assert.equal(result.results.some((item) => item.courtCode === 'TRF3'), true);
  assert.equal(result.diagnostic?.lifecycleState, 'SEARCH_SUCCESS');
  assert.ok(result.sourcesConsulted.includes('trf3-jurisprudencia'));
});


test('transporte STF mantém verificação TLS habilitada e usa intermediária oficial', () => {
  const transport = fs.readFileSync(new URL('../stfSecureFetch.ts', import.meta.url), 'utf8');
  assert.match(transport, /rejectUnauthorized:\s*true/);
  assert.doesNotMatch(transport, /rejectUnauthorized:\s*false/);
  assert.doesNotMatch(transport, /NODE_TLS_REJECT_UNAUTHORIZED/);
  assert.match(transport, /GlobalSign GCC R6 AlphaSSL CA 2025/);
});


const tstNormativeText = `
SUM-331 CONTRATO DE PRESTAÇÃO DE SERVIÇOS. LEGALIDADE
(item I cancelado por perda de eficácia a partir de 11.11.2017, pela Lei 13.467/2017) – Res. 225/2025.
I - A contratação de trabalhadores por empresa interposta é ilegal.
II - A contratação irregular não gera vínculo com a Administração Pública.
VI - A responsabilidade subsidiária abrange as verbas decorrentes da condenação.
SUM-332 HONORÁRIOS ADVOCATÍCIOS. Texto seguinte para delimitar a Súmula anterior.
OJ-SDI1-383 TERCEIRIZAÇÃO. EMPREGADOS DA EMPRESA PRESTADORA DE SERVIÇOS E DA TOMADORA.
(cancelada por perda de eficácia a partir de 11.11.2017, pela Lei 13.467/2017) - Res. 225/2025.
A contratação irregular não afasta, pelo princípio da isonomia, direitos dos terceirizados.
OJ-SDI1-384 TRABALHADOR AVULSO. PRESCRIÇÃO BIENAL. Texto seguinte para delimitação.
PN-47 DISPENSA DE EMPREGADO (positivo)
O empregado despedido será informado, por escrito, dos motivos da dispensa.
PN-48 ASSISTÊNCIA MÉDICA. Texto seguinte para delimitação.
${'conteúdo oficial consolidado da coleção normativa do TST. '.repeat(2600)}
`;

function tstNormativeFetchMock(): typeof fetch {
  const pdf = Buffer.concat([Buffer.from('%PDF-1.5\n'), Buffer.alloc(110_000, 65)]);
  return (async () => new Response(pdf, {
    status: 200,
    headers: { 'Content-Type': 'application/pdf' },
  })) as typeof fetch;
}

function tstNormativeAdapterMocked(): TstNormativeCollectionAdapter {
  return new TstNormativeCollectionAdapter(
    tstNormativeFetchMock(),
    30_000,
    60_000,
    async () => tstNormativeText
  );
}

test('TST coleção normativa aceita somente o PDF oficial exato', () => {
  assert.equal(
    isExactTstNormativeCollectionUrl('https://www.tst.jus.br/documents/d/guest/livrointernet-12-pdf'),
    true
  );
  assert.equal(
    isExactTstNormativeCollectionUrl('https://www.tst.jus.br.evil.example/documents/d/guest/livrointernet-12-pdf'),
    false
  );
});

test('Súmula TST parcialmente alterada permanece vigente como verbete', async () => {
  const result = await tstNormativeAdapterMocked().searchNormative('SUMULA', 331);
  assert.equal(result.decisions.length, 1);
  assert.equal(result.decisions[0]?.verificationStatus, 'VERIFIED_OFFICIAL');
  assert.equal(result.decisions[0]?.precedentSituation, 'VIGENTE');
  assert.equal(result.decisions[0]?.rawCaseNumber, 'Súmula 331/TST');
  assert.match(result.decisions[0]?.verificationBadge || '', /NORMATIVO VERIFICADO/);
});

test('OJ integralmente cancelada preserva status CANCELLED', async () => {
  const result = await tstNormativeAdapterMocked().searchNormative('OJ', 383);
  assert.equal(result.decisions.length, 1);
  assert.equal(result.decisions[0]?.precedentSituation, 'CANCELADO');
  assert.equal(result.decisions[0]?.verificationStatus, 'CANCELLED');
  assert.match(result.decisions[0]?.verificationBadge || '', /CANCELADO/);
});

test('Precedente Normativo TST é reconhecido por identificador exato', async () => {
  const classified = LegalCompetenceClassifier.classify('PN 47 TST');
  assert.equal(classified.extractedThemeOrSumula?.type, 'PN');
  assert.equal(classified.extractedThemeOrSumula?.number, 47);

  const result = await tstNormativeAdapterMocked().searchNormative('PN', 47);
  assert.equal(result.decisions.length, 1);
  assert.equal(result.decisions[0]?.verificationStatus, 'VERIFIED_OFFICIAL');
  assert.equal(result.decisions[0]?.documentType, 'PRECEDENTE_NORMATIVO');
});


function djenFetchMock(options?: { certificateStatus?: number; searchStatus?: number }): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('/certidao')) {
      const status = options?.certificateStatus ?? 200;
      const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(2048, 65)]);
      return new Response(status === 200 ? pdf : Buffer.from('erro'), {
        status,
        headers: { 'Content-Type': status === 200 ? 'application/pdf' : 'text/plain' },
      });
    }

    const status = options?.searchStatus ?? 200;
    if (status === 429) {
      return new Response(JSON.stringify({ status: 'error', message: 'rate limit' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'x-ratelimit-limit': '20', 'x-ratelimit-remaining': '0' },
      });
    }

    return new Response(JSON.stringify({
      status: 'success',
      message: 'ok',
      count: 1,
      items: [{
        id: 648668729,
        data_disponibilizacao: '2026-09-18',
        siglaTribunal: 'TJMG',
        tipoComunicacao: 'Intimação',
        nomeOrgao: 'TJMG - 6ª CÂMARA CÍVEL',
        texto: 'Comunicação processual oficial com conteúdo suficiente para validação do registro.',
        numero_processo: '50144805720218130701',
        meio: 'D',
        link: 'https://www4.tjmg.jus.br/processo/50144805720218130701',
        tipoDocumento: 'Apelação',
        nomeClasse: 'APELAÇÃO CÍVEL',
        codigoClasse: '198',
        numeroComunicacao: 1,
        ativo: true,
        hash: 'vKAPnkeQmZdAIPhlTj8exzYd5o94bD',
        datadisponibilizacao: '18/09/2026',
        meiocompleto: 'Diário de Justiça Eletrônico Nacional',
        numeroprocessocommascara: '5014480-57.2021.8.13.0701',
        destinatarios: [{ nome: 'PARTE TESTE', polo: 'P' }],
        destinatarioadvogados: [{
          advogado: { nome: 'ADVOGADO TESTE', numero_oab: '123456', uf_oab: 'MG' },
        }],
      }],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'x-ratelimit-limit': '20', 'x-ratelimit-remaining': '19' },
    });
  }) as typeof fetch;
}

test('DJEN aceita somente URLs públicas oficiais exatas', () => {
  const searchUrl = DjenPublicationsAdapter.buildSearchUrl({
    numeroProcesso: '5014480-57.2021.8.13.0701',
    pagina: 1,
    itensPorPagina: 5,
  });
  assert.equal(isExactDjenSearchUrl(searchUrl), true);
  assert.equal(isExactDjenSearchUrl('https://comunicaapi.pje.jus.br.evil.example/api/v1/comunicacao?itensPorPagina=5'), false);
  assert.equal(
    isExactDjenCertificateUrl(
      'https://comunicaapi.pje.jus.br/api/v1/comunicacao/vKAPnkeQmZdAIPhlTj8exzYd5o94bD/certidao',
      'vKAPnkeQmZdAIPhlTj8exzYd5o94bD'
    ),
    true
  );
});

test('DJEN confirma comunicação por certidão PDF individual e SHA-256', async () => {
  const result = await new DjenPublicationsAdapter(djenFetchMock()).searchPublications({
    numeroProcesso: '5014480-57.2021.8.13.0701',
  });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.evidenceState, 'VERIFIED_OFFICIAL');
  assert.match(result.items[0]?.certificateSha256 || '', /^[a-f0-9]{64}$/);
  assert.equal(result.items[0]?.courtCode, 'TJMG');
  assert.equal(result.items[0]?.lawyers[0]?.numeroOab, '123456');
  assert.equal(result.diagnostic.recordsVerified, 1);
  assert.equal(result.rateLimit?.remaining, 19);
});

test('DJEN mantém resultado pendente quando a certidão individual falha', async () => {
  const result = await new DjenPublicationsAdapter(djenFetchMock({ certificateStatus: 503 }))
    .searchPublications({ siglaTribunal: 'TJMG' });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.evidenceState, 'FOUND_PENDING_REVIEW');
  assert.equal(result.items[0]?.certificateSha256, undefined);
  assert.equal(result.diagnostic.recordsVerified, 0);
});

test('DJEN trata HTTP 429 como rate limit sem fabricar resultados', async () => {
  const result = await new DjenPublicationsAdapter(djenFetchMock({ searchStatus: 429 }))
    .searchPublications({ siglaTribunal: 'TJMG' });
  assert.equal(result.items.length, 0);
  assert.equal(result.diagnostic.lifecycleState, 'RATE_LIMITED');
  assert.equal(result.diagnostic.httpStatus, 429);
  assert.equal(result.rateLimit?.remaining, 0);
});


test('ponte local de certificado escuta apenas em loopback e não desativa isolamento', () => {
  const bridge = fs.readFileSync(new URL('../../../tools/certificate-bridge/server.mjs', import.meta.url), 'utf8');
  assert.match(bridge, /const HOST = '127\.0\.0\.1'/);
  assert.doesNotMatch(bridge, /listen\([^)]*0\.0\.0\.0/);
  assert.match(bridge, /JURISFLOW_ALLOWED_ORIGINS/);
  assert.match(bridge, /sessions = new Map/);
});

test('ponte A1 envia senha ao OpenSSL por stdin e não por argumento pass:', () => {
  const bridge = fs.readFileSync(new URL('../../../tools/certificate-bridge/server.mjs', import.meta.url), 'utf8');
  assert.match(bridge, /'-passin', 'stdin'/);
  assert.match(bridge, /child\.stdin\.end/);
  assert.doesNotMatch(bridge, /'-passin',\s*['"]pass:/);
  assert.match(bridge, /mode: 0o600/);
  assert.match(bridge, /fs\.rm\(tempDir/);
});

test('frontend do certificado conversa diretamente com localhost e não envia PFX ao backend', () => {
  const client = fs.readFileSync(new URL('../../../src/services/certificateBridge.ts', import.meta.url), 'utf8');
  const modal = fs.readFileSync(new URL('../../../src/components/legal-search/DigitalCertificateModal.tsx', import.meta.url), 'utf8');
  assert.match(client, /http:\/\/127\.0\.0\.1:43119/);
  assert.match(client, /\/v1\/certificates\/a1\/inspect/);
  assert.doesNotMatch(modal, /api\.inspectDigitalCertificate/);
  assert.match(modal, /inspectA1CertificateLocally/);
});


test('registro de famílias aceita somente hosts oficiais configurados', () => {
  const trf4 = getCourtFamilyConfig('TRF4');
  const tjpr = getCourtFamilyConfig('TJPR');
  assert.equal(trf4?.family, 'EPROC');
  assert.equal(tjpr?.family, 'PROJUDI');
  assert.equal(isAllowedCourtFamilyUrl(trf4!, 'https://eproc.trf4.jus.br/eproc2trf4/'), true);
  assert.equal(isAllowedCourtFamilyUrl(trf4!, 'https://eproc-sso.trf4.jus.br/realms/eproc/'), true);
  assert.equal(isAllowedCourtFamilyUrl(trf4!, 'https://eproc.trf4.jus.br.evil.example/eproc2trf4/'), false);
  assert.equal(isAllowedCourtFamilyUrl(tjpr!, 'https://consulta.tjpr.jus.br/projudi_consulta/paginaPrincipal.jsp'), true);
});

test('probe e-SAJ identifica desafio interativo sem tentar contorno', async () => {
  const mock = (async () => new Response(
    '<html><title>Consulta de Jurisprudência</title><script>grecaptcha.execute("key",{action:"consulta"})</script></html>',
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )) as typeof fetch;
  const result = await new CourtFamilyProbeAdapter(mock).probe('TJSP');
  assert.equal(result.family, 'ESAJ');
  assert.equal(result.capabilityState, 'INTERACTIVE_REQUIRED');
  assert.equal(result.interactiveChallengeDetected, true);
});

test('probe eproc preserva autenticação e consulta pública como capacidades distintas', async () => {
  const mock = (async () => new Response(
    '<html><title>Sign in to eproc</title><a>Consulta Pública</a><a>Consulta Processo por Chave</a><form>login senha</form></html>',
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )) as typeof fetch;
  const result = await new CourtFamilyProbeAdapter(mock).probe('TRF4');
  assert.equal(result.family, 'EPROC');
  assert.equal(result.capabilityState, 'AUTH_REQUIRED');
  assert.equal(result.authenticationDetected, true);
  assert.equal(result.publicConsultationDetected, true);
});

test('probe Projudi reconhece portal de consulta pública sem declarar automação pronta', async () => {
  const mock = (async () => new Response(
    '<html><title>Projudi</title><a id="consultaPublica">Consulta Pública</a><a>Consulta Precedentes</a></html>',
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )) as typeof fetch;
  const result = await new CourtFamilyProbeAdapter(mock).probe('TJPR');
  assert.equal(result.family, 'PROJUDI');
  assert.equal(result.capabilityState, 'PUBLIC_PORTAL');
  assert.equal(result.publicConsultationDetected, true);
});

const trf4ResultHtml =
  '<html><body>' +
  '<a href="javascript:void(0)" class="text-dark inteiroTeor" ' +
  'data-link="externo_controlador.php?acao=jurisprudencia@jurisprudencia/download_inteiro_teor&id_jurisprudencia=41789749459516495890278691697&termosPesquisados=YmVuZWZpY2lv"></a>' +
  '<div class="card-body">' +
  '<div class="resValueTipoJurisprudencia">Acórdão</div>' +
  '<a class="numero-processo">5000871-13.2026.4.04.7201/TRF4</a><span>AC - Apelação Cível</span>' +
  '<div class="resLabel">ÓRGÃO JULGADOR</div><div class="resValue">1ª Turma</div>' +
  '<div class="resLabel">DATA DO JULGAMENTO</div><div class="resValue">18/09/2026</div>' +
  '<div class="resLabel">DATA DA PUBLICAÇÃO</div><div class="resValue">18/09/2026</div>' +
  '<div class="resLabel">RELATOR</div><div class="resValue completo">MARCELO DE NARDI</div>' +
  '<div class="resLabel">DECISÃO</div><div class="resValue completo">Negado provimento à apelação por unanimidade.</div>' +
  '<div class="resLabel">EMENTA</div><div class="resValue completo">PREVIDENCIÁRIO. BENEFÍCIO PREVIDENCIÁRIO. REQUISITOS PREENCHIDOS. MANUTENÇÃO DA SENTENÇA.</div>' +
  '</div></body></html>';

const trf4DocumentHtml = '<html><body><h1>Documento oficial TRF4</h1><p>'
  + 'Inteiro teor oficial do acórdão previdenciário. '.repeat(80)
  + '</p></body></html>';

function latin1Response(body: string, init: ResponseInit = {}): Response {
  return new Response(Buffer.from(body, 'latin1'), {
    status: init.status || 200,
    headers: {
      'Content-Type': 'text/html; charset=ISO-8859-1',
      ...(init.headers || {}),
    },
  });
}

function trf4FetchMock(): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('acao=jurisprudencia@jurisprudencia/pesquisar')) {
      return latin1Response('<html>TRF4 Jurisprudência</html>', { headers: { 'Set-Cookie': 'PHPSESSID=test-session; Path=/' } });
    }
    if (url.includes('acao=jurisprudencia@jurisprudencia/listar_resultados')) return latin1Response(trf4ResultHtml);
    if (url.includes('id_jurisprudencia=')) return latin1Response(trf4DocumentHtml);
    return latin1Response('<html>not found</html>', { status: 404 });
  }) as typeof fetch;
}

test('TRF4 aceita somente endpoints oficiais exatos do eproc', () => {
  assert.equal(isExactTrf4SearchUrl('https://jurisprudencia.trf4.jus.br/eproc2trf4/externo_controlador.php?acao=jurisprudencia@jurisprudencia/listar_resultados'), true);
  assert.equal(isExactTrf4DocumentUrl('https://jurisprudencia.trf4.jus.br/eproc2trf4/externo_controlador.php?acao=jurisprudencia@jurisprudencia/download_inteiro_teor&id_jurisprudencia=41789749459516495890278691697'), true);
  assert.equal(isExactTrf4DocumentUrl('https://jurisprudencia.trf4.jus.br.evil.example/eproc2trf4/externo_controlador.php?acao=jurisprudencia@jurisprudencia/download_inteiro_teor&id_jurisprudencia=41789749459516495890278691697'), false);
});

test('TRF4 verifica acórdão somente após inteiro teor individual oficial', async () => {
  const result = await new Trf4JurisprudenciaAdapter(trf4FetchMock()).searchOfficialJurisprudence('beneficio previdenciario', 1);
  assert.equal(result.decisions.length, 1);
  assert.equal(result.diagnostic.lifecycleState, 'SEARCH_SUCCESS');
  assert.equal(result.decisions[0]?.verificationStatus, 'VERIFIED_OFFICIAL');
  assert.equal(result.decisions[0]?.normalizedCnjNumber, '5000871-13.2026.4.04.7201');
  assert.equal(result.decisions[0]?.courtCode, 'TRF4');
  assert.equal(result.decisions[0]?.courtOrgan, '1ª Turma');
  assert.equal(result.decisions[0]?.verificationBadge, '[OFICIAL TRF4 - VERIFICADO]');
  assert.equal(result.decisions[0]?.officialUrl.includes('termosPesquisados'), false);
  assert.match(result.decisions[0]?.contentSha256 || '', /^[a-f0-9]{64}$/);
});

test('busca explícita no TRF4 admite acórdão verificado no ranking', async () => {
  const adapter = new Trf4JurisprudenciaAdapter(trf4FetchMock());
  const official = await adapter.searchOfficialJurisprudence('beneficio previdenciario', 1);
  assert.equal(official.decisions[0]?.verificationStatus, 'VERIFIED_OFFICIAL');
  const service = new JudicialSearchService();
  (service as any).trf4Adapter = { searchOfficialJurisprudence: async () => official };
  const result = await service.searchJurisprudence({ query: 'beneficio previdenciario', courtCodes: ['TRF4'], onlyVerified: true });
  assert.equal(result.results.some((item) => item.courtCode === 'TRF4'), true);
  assert.equal(result.diagnostic?.lifecycleState, 'SEARCH_SUCCESS');
  assert.ok(result.sourcesConsulted.includes('trf4-jurisprudencia'));
});

const trt15IrdHtml =
  '<html><body><table id="tabelaTemas"><tbody id="tabelaTemas:tb">' +
  '<tr><td>06 - Incidente de Resolução de Demandas Repetitivas (IRDR)</td>' +
  '<td><a>0027</a><br/>Controvérsia acerca da aplicação do artigo 58, § 2º, da CLT aos trabalhadores rurais.</td>' +
  '<td><a>0</a></td><td></td></tr>' +
  '</tbody></table></body></html>';

test('TRT15 aceita somente a listagem pública exata de IRDR/IAC', () => {
  assert.equal(isExactTrt15PrecedentsListUrl('https://pje.trt15.jus.br/precedentesWeb/pages/public/TemaLista.seam?tipo=IRDR', 'IRDR'), true);
  assert.equal(isExactTrt15PrecedentsListUrl('https://pje.trt15.jus.br/precedentesWeb/pages/public/TemaLista.seam?tipo=IAC', 'IAC'), true);
  assert.equal(isExactTrt15PrecedentsListUrl('https://pje.trt15.jus.br.evil.example/precedentesWeb/pages/public/TemaLista.seam?tipo=IRDR', 'IRDR'), false);
});

test('TRT15 indexa tema público sem promover para VERIFIED_OFFICIAL', async () => {
  const mock = (async () => new Response(Buffer.from(trt15IrdHtml, 'latin1'), {
    status: 200, headers: { 'Content-Type': 'text/html;charset=ISO-8859-1' }
  })) as typeof fetch;
  const result = await new Trt15PrecedentsAdapter(mock).list('IRDR');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.themeNumber, 27);
  assert.equal(result.items[0]?.verificationStatus, 'FOUND_UNVERIFIED');
  assert.match(result.items[0]?.pageSha256 || '', /^[a-f0-9]{64}$/);
  assert.match(result.items[0]?.recordSha256 || '', /^[a-f0-9]{64}$/);
  assert.equal((result.items[0] as any)?.verificationBadge, undefined);
});


const falcaoRecord = {
  numeroProcesso: '0011087-14.2015.5.03.0035',
  siglaClasseProcesso: 'ROT',
  classeProcesso: 'Recurso Ordinário Trabalhista',
  relator: 'JULIANA VIGNOLI CORDEIRO',
  tribunal: 'TRT3',
  turma: '11ª Turma',
  textoAcordao: '<p>Inteiro teor oficial do acórdão trabalhista.</p>',
  ementa: '<p>PREVIDENCIÁRIO TRABALHISTA. BENEFÍCIO. RECURSO ORDINÁRIO. FUNDAMENTAÇÃO OFICIAL SUFICIENTE PARA TESTE.</p>',
  possuiEmenta: 'S',
  idDocumentoAcordao: '10712368',
  referenciaLegislativa: ['art_476_clt'],
  dataJulgamento: '06/12/2016',
  dataJuntada: '08/12/2016',
};

function falcaoFetchMock(mode: 'ok' | 'rate-limit' | 'mismatch' = 'ok'): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (mode === 'rate-limit') {
      return new Response(JSON.stringify({ userMessage: 'Too Many Requests' }), {
        status: 429, headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('/acordaos/')) {
      const individual = mode === 'mismatch'
        ? { ...falcaoRecord, idDocumentoAcordao: '99999999' }
        : falcaoRecord;
      return new Response(JSON.stringify({ documentos: [individual] }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({
      documentos: [falcaoRecord],
      temasTopFive: [],
      quantidadeTotal: 1,
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

test('Falcão aceita somente busca e documento individual oficiais exatos', () => {
  const search = 'https://jurisprudencia.jt.jus.br/jurisprudencia-nacional-backend/api/no-auth/pesquisa?sessionId=_abc1234&latitude=&longitude=&texto=teste&tribunais=TRT3&colecao=acordaos&page=0&size=5';
  const doc = 'https://jurisprudencia.jt.jus.br/jurisprudencia-nacional-backend/api/no-auth/pesquisa/acordaos/TRT3/10712368?sessionId=_abc1234&latitude=&longitude=';
  assert.equal(isExactFalcaoSearchUrl(search, 'TRT3'), true);
  assert.equal(isExactFalcaoDocumentUrl(doc, 'TRT3', '10712368'), true);
  assert.equal(isExactFalcaoDocumentUrl(doc.replace('jurisprudencia.jt.jus.br', 'jurisprudencia.jt.jus.br.evil.example'), 'TRT3'), false);
});

test('Falcão verifica acórdão somente após confirmação individual oficial', async () => {
  const result = await new FalcaoJurisprudenciaAdapter(falcaoFetchMock())
    .searchOfficialJurisprudence('beneficio previdenciario', 'TRT3', 1);

  assert.equal(result.decisions.length, 1);
  assert.equal(result.decisions[0]?.verificationStatus, 'VERIFIED_OFFICIAL');
  assert.equal(result.decisions[0]?.courtCode, 'TRT3');
  assert.equal(result.decisions[0]?.normalizedCnjNumber, '0011087-14.2015.5.03.0035');
  assert.equal(result.decisions[0]?.alternativeNumber, '10712368');
  assert.equal(result.decisions[0]?.verificationBadge, '[OFICIAL FALCÃO/TRT3 - VERIFICADO]');
  assert.match(result.decisions[0]?.contentSha256 || '', /^[a-f0-9]{64}$/);
});

test('Falcão rejeita documento individual divergente', async () => {
  const result = await new FalcaoJurisprudenciaAdapter(falcaoFetchMock('mismatch'))
    .searchOfficialJurisprudence('beneficio previdenciario', 'TRT3', 1);
  assert.equal(result.decisions.length, 0);
  assert.ok(result.diagnostic.rejectionReasons.some((reason) => reason.includes('divergente')));
});

test('Falcão trata HTTP 429 em fail-closed sem reutilizar decisões', async () => {
  const result = await new FalcaoJurisprudenciaAdapter(falcaoFetchMock('rate-limit'))
    .searchOfficialJurisprudence('beneficio previdenciario', 'TRT3', 1);
  assert.equal(result.decisions.length, 0);
  assert.equal(result.diagnostic.httpStatus, 429);
  assert.equal(result.diagnostic.connectorStatus, 'DEGRADED');
});


test('busca explícita em TRT regional usa Falcão sem ser substituída pelo TST', async () => {
  const official = await new FalcaoJurisprudenciaAdapter(falcaoFetchMock())
    .searchOfficialJurisprudence('beneficio previdenciario', 'TRT3', 1);
  assert.equal(official.decisions[0]?.verificationStatus, 'VERIFIED_OFFICIAL');

  const service = new JudicialSearchService();
  (service as any).falcaoAdapter = {
    searchOfficialJurisprudence: async () => official,
  };

  const result = await service.searchJurisprudence({
    query: 'beneficio previdenciario',
    courtCodes: ['TRT3'],
    onlyVerified: true,
  });

  assert.equal(result.results.some((item) => item.courtCode === 'TRT3'), true);
  assert.ok(result.sourcesConsulted.includes('falcao-jurisprudencia'));
  assert.equal(result.sourcesConsulted.includes('tst-jurisprudencia'), false);
  assert.equal(result.diagnostic?.adapter, 'falcao-jurisprudencia');
});


const tjrsMockDoc = {
  tipo_documento: 'Acordao',
  ementa_completa: ['DIREITO CIVIL. APELACAO. BENEFICIO PREVIDENCIARIO. EMENTA OFICIAL SUFICIENTE PARA O TESTE DE INTEGRACAO.'],
  tipo_processo: 'Apelacao Civel',
  documento_text: Buffer.from('<html><body>Inteiro teor oficial do acordao TJRS com fundamentacao suficiente para teste.</body></html>', 'latin1').toString('base64'),
  data_publicacao: '2026-09-16T03:00:00Z',
  data_julgamento: '2026-09-15T03:00:00Z',
  nome_tribunal: 'Tribunal de Justica do RS',
  numero_processo: '50025824020228210038',
  cod_ementa: '12177372',
  orgao_julgador: 'Decima Segunda Camara Civel',
  ind_segredo_justica: 'N',
  nome_classe_cnj: 'Apelacao',
  nome_assunto_cnj: 'Beneficio previdenciario',
  nome_relator: 'Relator Oficial',
  relator_redator: ['Relator Oficial'],
};

function tjrsFetchMock(payloadOverride?: any): typeof fetch {
  return (async () => {
    const payload = payloadOverride ?? {
      response: { numFound: 1, docs: [tjrsMockDoc] },
      highlighting: {},
    };
    return new Response(Buffer.from(JSON.stringify(payload), 'latin1'), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=iso-8859-1' },
    });
  }) as typeof fetch;
}

test('TJRS aceita somente o endpoint AJAX oficial exato', () => {
  assert.equal(isExactTjrsAjaxUrl('https://www.tjrs.jus.br/buscas/jurisprudencia/ajax.php'), true);
  assert.equal(isExactTjrsAjaxUrl('https://www.tjrs.jus.br.evil.example/buscas/jurisprudencia/ajax.php'), false);
  assert.equal(isExactTjrsAjaxUrl('http://www.tjrs.jus.br/buscas/jurisprudencia/ajax.php'), false);
});

test('TJRS normaliza busca oficial mas preserva FOUND_UNVERIFIED sem documento individual', async () => {
  const result = await new TjrsJurisprudenciaAdapter(tjrsFetchMock())
    .searchOfficialJurisprudence('beneficio previdenciario', 1);

  assert.equal(result.decisions.length, 1);
  const decision = result.decisions[0]!;
  assert.equal(decision.courtCode, 'TJRS');
  assert.equal(decision.normalizedCnjNumber, '5002582-40.2022.8.21.0038');
  assert.equal(decision.alternativeNumber, '12177372');
  assert.equal(decision.verificationStatus, 'FOUND_UNVERIFIED');
  assert.equal(decision.verificationBadge, undefined);
  assert.match(decision.contentSha256, /^[a-f0-9]{64}$/);
  assert.ok((decision.fullText || '').includes('Inteiro teor oficial'));
});

test('TJRS exclui segredo de justiça da normalização', async () => {
  const secret = { ...tjrsMockDoc, ind_segredo_justica: 'S' };
  const result = await new TjrsJurisprudenciaAdapter(tjrsFetchMock({
    response: { numFound: 1, docs: [secret] },
  })).searchOfficialJurisprudence('beneficio previdenciario', 1);

  assert.equal(result.decisions.length, 0);
});

test('busca TJRS respeita onlyVerified e nunca promove resultado parcial', async () => {
  const partial = await new TjrsJurisprudenciaAdapter(tjrsFetchMock())
    .searchOfficialJurisprudence('beneficio previdenciario', 1);

  const openService = new JudicialSearchService();
  (openService as any).tjrsAdapter = { searchOfficialJurisprudence: async () => partial };
  const openResult = await openService.searchJurisprudence({
    query: 'beneficio previdenciario',
    courtCodes: ['TJRS'],
    onlyVerified: false,
  });
  assert.equal(openResult.results.some((item) => item.courtCode === 'TJRS'), true);

  const verifiedService = new JudicialSearchService();
  (verifiedService as any).tjrsAdapter = { searchOfficialJurisprudence: async () => partial };
  const verifiedResult = await verifiedService.searchJurisprudence({
    query: 'beneficio previdenciario',
    courtCodes: ['TJRS'],
    onlyVerified: true,
  });
  assert.equal(verifiedResult.results.some((item) => item.courtCode === 'TJRS'), false);
  assert.equal(verifiedResult.diagnostic?.adapter, 'tjrs-jurisprudencia');
});


const tjdftRecord = {
  sequencial: 1,
  base: 'acordaos',
  subbase: 'acordaos',
  uuid: '519feb95-b08f-456e-a5e3-07e4132b9a3a',
  identificador: '2171324',
  dataJulgamento: '2026-09-10T03:00:00.000Z',
  dataPublicacao: '2026-09-21T02:47:16.000Z',
  decisao: 'CONHECER E NEGAR PROVIMENTO. UNANIME.',
  ementa: 'DIREITO CIVIL. RESPONSABILIDADE CIVIL. DANO MORAL. ACORDAO OFICIAL COM EMENTA SUFICIENTE PARA VALIDACAO DETERMINISTICA.',
  processo: '0706024-88.2024.8.07.0002',
  nomeRelator: 'LUCIMEIRE MARIA DA SILVA',
  segredoJustica: false,
  descricaoOrgaoJulgador: '5ª TURMA CÍVEL',
  versao: '01',
  possuiInteiroTeor: true,
};

function tjdftFetchMock(mode: 'ok' | 'duplicate' | 'mismatch' = 'ok'): typeof fetch {
  return (async (_input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || '{}'));
    const uuidFilter = body?.termosAcessorios?.find((item: any) => item.campo === 'uuid');
    if (uuidFilter) {
      const record = mode === 'mismatch'
        ? { ...tjdftRecord, uuid: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }
        : tjdftRecord;
      const records = mode === 'duplicate' ? [record, record] : [record];
      const hits = mode === 'duplicate' ? 2 : 1;
      return new Response(JSON.stringify({
        hits: { value: hits },
        registros: records,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({
      hits: { value: 1 },
      registros: [tjdftRecord],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

test('TJDFT aceita somente o endpoint oficial exato da API pública', () => {
  assert.equal(isExactTjdftSearchUrl('https://jurisdf.tjdft.jus.br/api/v1/pesquisa'), true);
  assert.equal(isExactTjdftSearchUrl('https://jurisdf.tjdft.jus.br.evil.example/api/v1/pesquisa'), false);
  assert.equal(isExactTjdftSearchUrl('http://jurisdf.tjdft.jus.br/api/v1/pesquisa'), false);
});

test('TJDFT verifica decisão somente após confirmação individual única por UUID', async () => {
  const result = await new TjdftJurisprudenciaAdapter(tjdftFetchMock())
    .searchOfficialJurisprudence('dano moral', 1);

  assert.equal(result.decisions.length, 1);
  const decision = result.decisions[0]!;
  assert.equal(decision.courtCode, 'TJDFT');
  assert.equal(decision.normalizedCnjNumber, '0706024-88.2024.8.07.0002');
  assert.equal(decision.verificationStatus, 'VERIFIED_OFFICIAL');
  assert.equal(decision.verificationBadge, '[OFICIAL TJDFT - VERIFICADO]');
  assert.match(decision.contentSha256, /^[a-f0-9]{64}$/);
  assert.equal(decision.rawPayloadPreserved?.verificationEvidence?.individualRequest?.hits, 1);
});

test('TJDFT rejeita confirmação UUID não única ou divergente', async () => {
  const duplicate = await new TjdftJurisprudenciaAdapter(tjdftFetchMock('duplicate'))
    .searchOfficialJurisprudence('dano moral', 1);
  assert.equal(duplicate.decisions.length, 0);
  assert.ok(duplicate.diagnostic.rejectionReasons.some((reason) => reason.includes('divergente')));

  const mismatch = await new TjdftJurisprudenciaAdapter(tjdftFetchMock('mismatch'))
    .searchOfficialJurisprudence('dano moral', 1);
  assert.equal(mismatch.decisions.length, 0);
});

test('busca explícita no TJDFT admite somente decisão oficial verificada no ranking', async () => {
  const official = await new TjdftJurisprudenciaAdapter(tjdftFetchMock())
    .searchOfficialJurisprudence('dano moral', 1);
  assert.equal(official.decisions[0]?.verificationStatus, 'VERIFIED_OFFICIAL');

  const service = new JudicialSearchService();
  (service as any).tjdftAdapter = {
    searchOfficialJurisprudence: async () => official,
  };

  const result = await service.searchJurisprudence({
    query: 'dano moral',
    courtCodes: ['TJDFT'],
    onlyVerified: true,
  });

  assert.equal(result.results.some((item) => item.courtCode === 'TJDFT'), true);
  assert.ok(result.sourcesConsulted.includes('tjdft-jurisprudencia'));
  assert.equal(result.diagnostic?.adapter, 'tjdft-jurisprudencia');
});

const tjscResultHtml =
  '<html><body>' +
  '<a href="javascript:void(0)" class="text-dark inteiroTeor" ' +
  'data-link="externo_controlador.php?acao=jurisprudencia@jurisprudencia/download_inteiro_teor&id_jurisprudencia=321789736688770221598299935477&termosPesquisados=ZGFub3xtb3JhbA=="></a>' +
  '<div class="card-body">' +
  '<div class="resValueTipoJurisprudencia">Acórdão</div>' +
  '<a class="numero-processo">5052506-02.2023.8.24.0038</a><span>AC - Apelação Cível</span>' +
  '<div class="resLabel">ÓRGÃO JULGADOR</div><div class="resValue">1ª Câmara de Direito Civil</div>' +
  '<div class="resLabel">DATA DO JULGAMENTO</div><div class="resValue">18/09/2026</div>' +
  '<div class="resLabel">DATA DA PUBLICAÇÃO</div><div class="resValue">18/09/2026</div>' +
  '<div class="resLabel">RELATOR</div><div class="resValue completo">VITORALDO BRIDI</div>' +
  '<div class="resLabel">DECISÃO</div><div class="resValue completo">Embargos rejeitados por unanimidade.</div>' +
  '<div class="resLabel">EMENTA</div><div class="resValue completo">DIREITO CIVIL. DANO MORAL. APELAÇÃO. EMENTA OFICIAL SUFICIENTE PARA VALIDAÇÃO DETERMINÍSTICA.</div>' +
  '</div></body></html>';

const tjscDocumentHtml = '<html><body><h1>Documento oficial TJSC</h1><p>'
  + 'Inteiro teor oficial do acórdão do TJSC. '.repeat(80)
  + '</p></body></html>';

function tjscFetchMock(): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('www.tjsc.jus.br/web/jurisprudencia')) return latin1Response('<html>Portal TJSC</html>');
    if (url.includes('listar_resultados')) return latin1Response(tjscResultHtml);
    if (url.includes('id_jurisprudencia=')) return latin1Response(tjscDocumentHtml);
    return latin1Response('<html>not found</html>', { status: 404 });
  }) as typeof fetch;
}

test('TJSC aceita somente endpoints oficiais exatos do eproc', () => {
  assert.equal(isExactTjscSearchUrl('https://eprocwebcon.tjsc.jus.br/consulta1g/externo_controlador.php?acao=jurisprudencia@jurisprudencia/listar_resultados'), true);
  assert.equal(isExactTjscDocumentUrl('https://eprocwebcon.tjsc.jus.br/consulta1g/externo_controlador.php?acao=jurisprudencia@jurisprudencia/download_inteiro_teor&id_jurisprudencia=321789736688770221598299935477'), true);
  assert.equal(isExactTjscDocumentUrl('https://eprocwebcon.tjsc.jus.br.evil.example/consulta1g/externo_controlador.php?acao=jurisprudencia@jurisprudencia/download_inteiro_teor&id_jurisprudencia=321789736688770221598299935477'), false);
});

test('TJSC verifica acórdão somente após inteiro teor individual oficial', async () => {
  const result = await new TjscJurisprudenciaAdapter(tjscFetchMock()).searchOfficialJurisprudence('dano moral', 1);
  assert.equal(result.decisions.length, 1);
  const decision = result.decisions[0]!;
  assert.equal(decision.courtCode, 'TJSC');
  assert.equal(decision.normalizedCnjNumber, '5052506-02.2023.8.24.0038');
  assert.equal(decision.verificationStatus, 'VERIFIED_OFFICIAL');
  assert.equal(decision.verificationBadge, '[OFICIAL TJSC - VERIFICADO]');
  assert.equal(decision.officialUrl.includes('termosPesquisados'), false);
  assert.match(decision.contentSha256, /^[a-f0-9]{64}$/);
});

test('busca explícita no TJSC admite acórdão verificado no ranking', async () => {
  const official = await new TjscJurisprudenciaAdapter(tjscFetchMock()).searchOfficialJurisprudence('dano moral', 1);
  const service = new JudicialSearchService();
  (service as any).tjscAdapter = { searchOfficialJurisprudence: async () => official };
  const result = await service.searchJurisprudence({ query: 'dano moral', courtCodes: ['TJSC'], onlyVerified: true });
  assert.equal(result.results.some((item) => item.courtCode === 'TJSC'), true);
  assert.ok(result.sourcesConsulted.includes('tjsc-jurisprudencia'));
  assert.equal(result.diagnostic?.adapter, 'tjsc-jurisprudencia');
});

const tjbaRecord = {
  dataPublicacao: '2026-09-02T03:00:00Z',
  relator: { id: '17', nome: 'RELATOR OFICIAL TJBA' },
  orgaoJulgador: { id: '6', nome: 'PRIMEIRA CAMARA CÍVEL' },
  classe: { id: '198', descricao: 'Apelação' },
  conteudo: '<p>Conteúdo oficial do acórdão TJBA.</p>',
  tipoDecisao: 'ACORDAO',
  ementa: 'DIREITO CIVIL. DANO MORAL. APELAÇÃO. EMENTA OFICIAL SUFICIENTE PARA TESTE DETERMINÍSTICO.',
  hash: '77bf1556-ae37-3070-a6a9-f339f81a0480',
  numeroProcesso: '0575531-27.2017.8.05.0001',
};

function tjbaFetchMock(mode: 'ok' | 'bad-doc' = 'ok'): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/graphql')) {
      return new Response(JSON.stringify({
        data: { filter: { decisoes: [tjbaRecord], pageCount: 1, itemCount: 1 } },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/inteiroTeor/')) {
      if (mode === 'bad-doc') {
        return new Response('<html>bloqueio</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      }
      return new Response('<html><body>' + 'Inteiro teor oficial TJBA. '.repeat(100) + '</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
}

test('TJBA aceita somente GraphQL e inteiro teor oficiais exatos', () => {
  const doc = 'https://jurisprudenciaws.tjba.jus.br/inteiroTeor/77bf1556-ae37-3070-a6a9-f339f81a0480';
  assert.equal(isExactTjbaGraphqlUrl('https://jurisprudenciaws.tjba.jus.br/graphql'), true);
  assert.equal(isExactTjbaDocumentUrl(doc, tjbaRecord.hash), true);
  assert.equal(isExactTjbaDocumentUrl(doc.replace('tjba.jus.br', 'tjba.jus.br.evil.example')), false);
});
test('TJBA verifica acórdão somente após inteiro teor individual por hash', async () => {
  const result = await new TjbaJurisprudenciaAdapter(tjbaFetchMock())
    .searchOfficialJurisprudence('dano moral', 1);

  assert.equal(result.decisions.length, 1);
  const decision = result.decisions[0]!;
  assert.equal(decision.courtCode, 'TJBA');
  assert.equal(decision.normalizedCnjNumber, '0575531-27.2017.8.05.0001');
  assert.equal(decision.verificationStatus, 'VERIFIED_OFFICIAL');
  assert.equal(decision.verificationBadge, '[OFICIAL TJBA - VERIFICADO]');
  assert.equal(decision.alternativeNumber, tjbaRecord.hash);
  assert.match(decision.contentSha256, /^[a-f0-9]{64}$/);
});

test('TJBA rejeita inteiro teor insuficiente mesmo com HTTP 200', async () => {
  const result = await new TjbaJurisprudenciaAdapter(tjbaFetchMock('bad-doc'))
    .searchOfficialJurisprudence('dano moral', 1);

  assert.equal(result.decisions.length, 0);
  assert.ok(result.diagnostic.rejectionReasons.some((reason) => reason.includes('Inteiro teor TJBA inválido')));
});
test('busca explícita no TJBA admite acórdão verificado no ranking', async () => {
  const official = await new TjbaJurisprudenciaAdapter(tjbaFetchMock())
    .searchOfficialJurisprudence('dano moral', 1);

  const service = new JudicialSearchService();
  (service as any).tjbaAdapter = {
    searchOfficialJurisprudence: async () => official,
  };

  const result = await service.searchJurisprudence({
    query: 'dano moral',
    courtCodes: ['TJBA'],
    onlyVerified: true,
  });

  assert.equal(result.results.some((item) => item.courtCode === 'TJBA'), true);
  assert.ok(result.sourcesConsulted.includes('tjba-jurisprudencia'));
  assert.equal(result.diagnostic?.adapter, 'tjba-jurisprudencia');
});

const tjceRecord = {
  id: '30006187120258060066_33703967',
  idDocumento: 33703967,
  nomeDocumento: 'ACÓRDÃO',
  numeroProcesso: '30006187120258060066',
  classe: 'APELAÇÃO CÍVEL',
  orgaoJulgador: '6ª Câmara de Direito Privado',
  magistrado: 'JOSE TARCILIO SOUZA DA SILVA',
  dataJulgamento: [2026, 2, 11],
  ementa: 'DIREITO CIVIL. DANO MORAL. APELAÇÃO. EMENTA OFICIAL SUFICIENTE PARA VALIDAÇÃO DETERMINÍSTICA.',
  conteudo: 'Conteúdo integral oficial suficiente para validação do precedente.',
  origem: 'PJE',
};

const tjcePdf = Buffer.concat([
  Buffer.from('%PDF-1.7\n'),
  Buffer.alloc(1800, 65),
]).toString('base64');

function tjceFetchMock(mode: 'ok' | 'bad-pdf' | 'mismatch' = 'ok'): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('?page=')) {
      return new Response(JSON.stringify({
        pagina: { content: [tjceRecord], totalElements: 1 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    const detail = mode === 'mismatch'
      ? { ...tjceRecord, idDocumento: 99999999, pdfAutenticadoBase64: tjcePdf }
      : {
          ...tjceRecord,
          pdfAutenticadoBase64: mode === 'bad-pdf'
            ? Buffer.from('not-a-pdf').toString('base64')
            : tjcePdf,
        };
    return new Response(JSON.stringify(detail), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

test('TJCE aceita somente endpoints oficiais exatos do SJURIS', () => {
  const search = 'https://gateway.tjce.jus.br/sjuris/api/v1/jurisprudencia/?page=0&size=1';
  const doc = 'https://gateway.tjce.jus.br/sjuris/api/v1/jurisprudencia/30006187120258060066_33703967/AC%C3%93RD%C3%83O/2%C2%BA%20GRAU';
  assert.equal(isExactTjceSearchUrl(search), true);
  assert.equal(isExactTjceDocumentUrl(doc, tjceRecord.id), true);
  assert.equal(isExactTjceDocumentUrl(doc.replace('tjce.jus.br', 'tjce.jus.br.evil.example')), false);
});

test('TJCE verifica acórdão somente após PDF autenticado individual', async () => {
  const result = await new TjceJurisprudenciaAdapter(tjceFetchMock())
    .searchOfficialJurisprudence('dano moral', 1);
  assert.equal(result.decisions.length, 1);
  const decision = result.decisions[0]!;
  assert.equal(decision.courtCode, 'TJCE');
  assert.equal(decision.normalizedCnjNumber, '3000618-71.2025.8.06.0066');
  assert.equal(decision.verificationStatus, 'VERIFIED_OFFICIAL');
  assert.equal(decision.verificationBadge, '[OFICIAL TJCE - VERIFICADO]');
  assert.match(decision.contentSha256, /^[a-f0-9]{64}$/);
});

test('TJCE rejeita PDF inválido ou identidade individual divergente', async () => {
  const badPdf = await new TjceJurisprudenciaAdapter(tjceFetchMock('bad-pdf'))
    .searchOfficialJurisprudence('dano moral', 1);
  assert.equal(badPdf.decisions.length, 0);
  assert.ok(badPdf.diagnostic.rejectionReasons.some((reason) => reason.includes('PDF autenticado')));

  const mismatch = await new TjceJurisprudenciaAdapter(tjceFetchMock('mismatch'))
    .searchOfficialJurisprudence('dano moral', 1);
  assert.equal(mismatch.decisions.length, 0);
  assert.ok(mismatch.diagnostic.rejectionReasons.some((reason) => reason.includes('divergente')));
});

test('busca explícita no TJCE admite somente acórdão verificado no ranking', async () => {
  const official = await new TjceJurisprudenciaAdapter(tjceFetchMock())
    .searchOfficialJurisprudence('dano moral', 1);

  const service = new JudicialSearchService();
  (service as any).tjceAdapter = {
    searchOfficialJurisprudence: async () => official,
  };

  const result = await service.searchJurisprudence({
    query: 'dano moral',
    courtCodes: ['TJCE'],
    onlyVerified: true,
  });

  assert.equal(result.results.some((item) => item.courtCode === 'TJCE'), true);
  assert.ok(result.sourcesConsulted.includes('tjce-jurisprudencia'));
  assert.equal(result.diagnostic?.adapter, 'tjce-jurisprudencia');
});

const tjpeRecord = {
  chave: '2604463',
  codigoProcesso: '604463',
  npu: '0000244-51.2022.8.17.8232',
  npuSemFormatacao: '00002445120228178232',
  relator: 'ABELARDO TADEU DA SILVA SANTOS',
  nomeOrgaoJulgador: '1º Gabinete da 1ª Turma Recursal do I Colégio Recursal da Capital',
  descrClasseCNJ: 'Recurso Inominado Cível',
  dataJulgamento: '2026-09-12T17:42:19.323-03:00',
  dataPublicacao: '2026-09-12T17:42:18.968-03:00',
  textoEmenta: null,
  textoAcordao: 'EMENTA: DIREITO DO CONSUMIDOR. DANO MORAL. RECURSO INOMINADO. '
    + 'Texto oficial suficiente para normalização determinística.\nACÓRDÃO\n'
    + 'Vistos e discutidos os autos, acordam os julgadores em manter a decisão. '.repeat(10),
  textoDecisao: null,
  tipoSentenca: 'A',
  origem: 'ELETRONICO',
  assuntoCNJ: '10437',
  descrAssuntoCNJ: 'Direito de Imagem',
};

function tjpeFetchMock(): typeof fetch {
  return (async () => new Response(JSON.stringify([tjpeRecord]), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Total-Count': '1',
    },
  })) as typeof fetch;
}

test('transporte TJPE mantém TLS verificado e usa intermediária Amazon oficial', () => {
  const transport = fs.readFileSync(new URL('../tjpeSecureFetch.ts', import.meta.url), 'utf8');
  assert.match(transport, /rejectUnauthorized:\s*true/);
  assert.doesNotMatch(transport, /rejectUnauthorized:\s*false/);
  assert.doesNotMatch(transport, /NODE_TLS_REJECT_UNAUTHORIZED/);
  assert.match(transport, /Amazon RSA 2048 M01/);
});

test('TJPE aceita somente busca e candidato de PDF oficiais exatos', () => {
  const search = 'https://consultajurisprudencia.app.tjpe.jus.br/api/v1/jurisprudencias?page=0&size=5&pesquisaLivre.contains=dano+moral&tipoSentenca.in=A';
  const pdf = 'https://consultajurisprudencia.app.tjpe.jus.br/api/v1/processo/604463/inteiro-teor';
  assert.equal(isExactTjpeSearchUrl(search), true);
  assert.equal(isExactTjpeCandidatePdfUrl(pdf, '604463'), true);
  assert.equal(isExactTjpeCandidatePdfUrl(pdf.replace('tjpe.jus.br', 'tjpe.jus.br.evil.example')), false);
});

test('TJPE normaliza busca oficial sem promover resultado para VERIFIED_OFFICIAL', async () => {
  const result = await new TjpeJurisprudenciaAdapter(tjpeFetchMock())
    .searchOfficialJurisprudence('dano moral', 1);
  assert.equal(result.decisions.length, 1);
  const decision = result.decisions[0]!;
  assert.equal(decision.courtCode, 'TJPE');
  assert.equal(decision.normalizedCnjNumber, '0000244-51.2022.8.17.8232');
  assert.equal(decision.verificationStatus, 'FOUND_UNVERIFIED');
  assert.equal(decision.verificationBadge, undefined);
  assert.ok(decision.rejectionReasons?.some((reason) => reason.includes('INTEIRO_TEOR_DIVERGENTE')));
});

test('busca TJPE respeita onlyVerified e nunca promove fonte parcial', async () => {
  const official = await new TjpeJurisprudenciaAdapter(tjpeFetchMock())
    .searchOfficialJurisprudence('dano moral', 1);

  const service = new JudicialSearchService();
  (service as any).tjpeAdapter = {
    searchOfficialJurisprudence: async () => official,
  };

  const open = await service.searchJurisprudence({
    query: 'dano moral',
    courtCodes: ['TJPE'],
    onlyVerified: false,
  });
  assert.equal(open.results.some((item) => item.courtCode === 'TJPE'), true);
  assert.ok(open.sourcesConsulted.includes('tjpe-jurisprudencia'));

  const verified = await service.searchJurisprudence({
    query: 'dano moral verificado',
    courtCodes: ['TJPE'],
    onlyVerified: true,
  });
  assert.equal(verified.results.some((item) => item.courtCode === 'TJPE'), false);
});

test('TJGO permanece Projudi interativo e fail-closed', () => {
  const config = getCourtFamilyConfig('TJGO');
  assert.ok(config);
  assert.equal(config?.family, 'PROJUDI');
  assert.equal(config?.capabilityHint, 'INTERACTIVE_REQUIRED');
  assert.equal(config?.publicConsultationKnown, true);
  assert.equal(
    isAllowedCourtFamilyUrl(config!, 'https://projudi.tjgo.jus.br/ConsultaJurisprudencia'),
    true
  );
  assert.equal(
    isAllowedCourtFamilyUrl(config!, 'https://projudi.tjgo.jus.br.evil.example/ConsultaJurisprudencia'),
    false
  );
  assert.match(config?.notes || '', /Turnstile|Cloudflare/i);
});

const esajSearchHtml = [
  '<html><body>',
  '<a class="downloadEmenta" cdAcordao="123456" cdForo="0">0800556-95.2024.8.12.0008</a>',
  '<strong>Classe/Assunto:</strong> Agravo Interno Cível / Dano Moral',
  '<strong>Relator(a):</strong> Vice-Presidente',
  '<strong>Órgão julgador:</strong> Vice-Presidência',
  '<strong>Data do julgamento:</strong> 18/09/2026',
  '<strong>Data de registro:</strong> 19/09/2026',
  '<div id="textAreaDados_123456" class="mensagemSemFormatacao">',
  'DIREITO CIVIL. DANO MORAL. AGRAVO INTERNO. ',
  'EMENTA OFICIAL SUFICIENTE PARA VALIDAÇÃO DETERMINÍSTICA. '.repeat(8),
  '</div>',
  'Acórdãos(1)',
  '</body></html>',
].join('');

const esajInitialHtml =
  '<html><body><form action="/cjsg/resultadoCompleta.do">'
  + '<input type="hidden" name="dummy" value="1">'
  + '</form></body></html>';

function esajFetchMock(withPdf: boolean): typeof fetch {
  let call = 0;
  return (async () => {
    call += 1;
    if (call === 1) {
      return new Response(esajInitialHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html', 'Set-Cookie': 'JSESSIONID=abc; Path=/' },
      });
    }
    if (call === 2) {
      return new Response(esajSearchHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    if (withPdf) {
      const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(1800, 66)]);
      return new Response(pdf, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      });
    }
    return new Response('<html>recaptcha</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }) as typeof fetch;
}

test('e-SAJ aceita somente hosts e rotas oficiais parametrizadas', () => {
  assert.equal(
    isExactEsajSearchUrl('https://esaj.tjms.jus.br/cjsg/resultadoCompleta.do', 'TJMS'),
    true
  );
  assert.equal(
    isExactEsajDocumentUrl('https://esaj.tjms.jus.br/cjsg/getArquivo.do?cdAcordao=123456&cdForo=0', 'TJMS'),
    true
  );
  assert.equal(
    isExactEsajDocumentUrl('https://esaj.tjms.jus.br.evil.example/cjsg/getArquivo.do?cdAcordao=123456&cdForo=0', 'TJMS'),
    false
  );
});

test('TJMS e-SAJ verifica apenas com PDF individual oficial', async () => {
  const result = await new EsajJurisprudenciaAdapter('TJMS', esajFetchMock(true))
    .searchOfficialJurisprudence('dano moral', 1);
  assert.equal(result.decisions.length, 1);
  const decision = result.decisions[0]!;
  assert.equal(decision.courtCode, 'TJMS');
  assert.equal(decision.verificationStatus, 'VERIFIED_OFFICIAL');
  assert.equal(decision.verificationBadge, '[OFICIAL TJMS - VERIFICADO]');
  assert.match(decision.contentSha256, /^[a-f0-9]{64}$/);
});

test('TJAC e-SAJ permanece parcial sem inteiro teor individual', async () => {
  const result = await new EsajJurisprudenciaAdapter('TJAC', esajFetchMock(false))
    .searchOfficialJurisprudence('dano moral', 1);
  assert.equal(result.decisions.length, 1);
  const decision = result.decisions[0]!;
  assert.equal(decision.courtCode, 'TJAC');
  assert.equal(decision.verificationStatus, 'FOUND_UNVERIFIED');
  assert.equal(decision.verificationBadge, undefined);
  assert.ok(decision.rejectionReasons?.some((reason) => reason.includes('INTEIRO_TEOR_INTERATIVO')));
});

test('busca e-SAJ parcial respeita onlyVerified', async () => {
  const partial = await new EsajJurisprudenciaAdapter('TJAC', esajFetchMock(false))
    .searchOfficialJurisprudence('dano moral', 1);

  const service = new JudicialSearchService();
  (service as any).esajAdapters.TJAC = {
    searchOfficialJurisprudence: async () => partial,
  };

  const open = await service.searchJurisprudence({
    query: 'dano moral',
    courtCodes: ['TJAC'],
    onlyVerified: false,
  });
  assert.equal(open.results.some((item) => item.courtCode === 'TJAC'), true);

  const verified = await service.searchJurisprudence({
    query: 'dano moral verificado',
    courtCodes: ['TJAC'],
    onlyVerified: true,
  });
  assert.equal(verified.results.some((item) => item.courtCode === 'TJAC'), false);
});

const tjpiSearchHtml =
  '<html><body>Exibindo 1 - 1 de um total de 1 jurisprudência(s)'
  + '<a href="/jurisprudences/36378193/public">Empréstimo consignado 0800669-70.2025.8.18.0065 Acórdão de 2º Grau</a>'
  + '</body></html>';

const tjpiDetailHtml =
  '<html><body>'
  + '<h4>Ementa</h4><div>DIREITO PROCESSUAL CIVIL. DANO MORAL. EMENTA OFICIAL SUFICIENTE PARA VALIDAÇÃO.</div>'
  + '<h4>Acórdão</h4><div>' + 'Inteiro teor oficial do acórdão TJPI. '.repeat(80) + '</div>'
  + '<strong>Processo</strong><p class="text-muted">0800669-70.2025.8.18.0065</p>'
  + '<strong>Órgão Julgador Colegiado</strong><p class="text-muted">3ª Câmara Especializada Cível</p>'
  + '<strong>Relator(a)</strong><p class="text-muted">LUCICLEIDE PEREIRA BELO</p>'
  + '<strong>Classe Judicial</strong><p class="text-muted">AGRAVO INTERNO CÍVEL</p>'
  + '<strong>Publicação</strong><p class="text-muted">14/09/2026</p>'
  + '</body></html>';

function tjpiFetchMock(detail = tjpiDetailHtml): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    return url.includes('/search?')
      ? new Response(tjpiSearchHtml, { status: 200, headers: { 'Content-Type': 'text/html' } })
      : new Response(detail, { status: 200, headers: { 'Content-Type': 'text/html' } });
  }) as typeof fetch;
}

test('TJPI aceita somente busca e detalhe individuais oficiais exatos', () => {
  assert.equal(
    isExactTjpiSearchUrl('https://jurisprudencia.tjpi.jus.br/jurisprudences/search?q=dano+moral&tipo=Ac%C3%B3rd%C3%A3o'),
    true
  );
  assert.equal(
    isExactTjpiDetailUrl('https://jurisprudencia.tjpi.jus.br/jurisprudences/36378193/public', '36378193'),
    true
  );
  assert.equal(
    isExactTjpiDetailUrl('https://jurisprudencia.tjpi.jus.br.evil.example/jurisprudences/36378193/public'),
    false
  );
});

test('TJPI verifica somente página individual com o mesmo CNJ da busca', async () => {
  const result = await new TjpiJurisprudenciaAdapter(tjpiFetchMock())
    .searchOfficialJurisprudence('dano moral', 1);
  assert.equal(result.decisions.length, 1);
  const decision = result.decisions[0]!;
  assert.equal(decision.courtCode, 'TJPI');
  assert.equal(decision.normalizedCnjNumber, '0800669-70.2025.8.18.0065');
  assert.equal(decision.verificationStatus, 'VERIFIED_OFFICIAL');
  assert.equal(decision.verificationBadge, '[OFICIAL TJPI - VERIFICADO]');
  assert.match(decision.contentSha256, /^[a-f0-9]{64}$/);
});

test('TJPI rejeita página individual divergente da busca', async () => {
  const divergent = tjpiDetailHtml.replace(
    /0800669-70\.2025\.8\.18\.0065/g,
    '0800000-00.2025.8.18.0001'
  );
  const result = await new TjpiJurisprudenciaAdapter(tjpiFetchMock(divergent))
    .searchOfficialJurisprudence('dano moral', 1);
  assert.equal(result.decisions.length, 0);
  assert.ok(result.diagnostic.rejectionReasons.some((reason) => reason.includes('divergente')));
});

test('busca explícita no TJPI admite apenas decisão verificada', async () => {
  const official = await new TjpiJurisprudenciaAdapter(tjpiFetchMock())
    .searchOfficialJurisprudence('dano moral', 1);
  const service = new JudicialSearchService();
  (service as any).tjpiAdapter = { searchOfficialJurisprudence: async () => official };
  const result = await service.searchJurisprudence({
    query: 'dano moral',
    courtCodes: ['TJPI'],
    onlyVerified: true,
  });
  assert.equal(result.results.some((item) => item.courtCode === 'TJPI'), true);
  assert.ok(result.sourcesConsulted.includes('tjpi-jurisprudencia'));
  assert.equal(result.diagnostic?.adapter, 'tjpi-jurisprudencia');
});

const tjpaRecord = {
  id: 36027620,
  numeroprocesso: '0800462-53.2022.8.14.0044',
  tipo: 'Acórdão',
  origem: 'Tribunal de Justiça do Estado do Pará',
  datapublicacao: '2026-05-07',
  datajulgamento: '2026-04-23',
  datadocumento: '2026-05-06',
  pessoas: ['ROSILEIDE MARIA DA COSTA CUNHA'],
  orgaojulgadorcolegiado: { nome: '3ª Turma de Direito Público' },
  classe: { nome: 'APELAÇÃO CÍVEL', codigo: '198' },
  textoementa: '<p>EMENTA OFICIAL TJPA SOBRE DANO MORAL COM CONTEÚDO SUFICIENTE PARA VALIDAÇÃO.</p>',
  textooriginal: '<p>Inteiro teor oficial do acórdão TJPA.</p>'.repeat(80),
  textopuro: 'Inteiro teor oficial do acórdão TJPA. '.repeat(80),
};

function tjpaFetchMock(mode: 'ok' | 'mismatch' = 'ok'): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/bff/api/decisoes/buscar')) {
      return new Response(JSON.stringify({
        message: 'Sucesso',
        data: { content: [tjpaRecord], totalElements: 1, totalAcordaos: 1, totalDecisoesMonocraticas: 0 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.endsWith('/bff/api/decisoes/buscar-por-numero-documento')) {
      const detail = mode === 'mismatch'
        ? { ...tjpaRecord, numeroprocesso: '0000000-00.2026.8.14.0000' }
        : tjpaRecord;
      return new Response(JSON.stringify({
        message: 'Sucesso',
        data: { content: [detail], totalElements: 1 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
}

test('TJPA aceita somente endpoints e página pública oficiais exatos', () => {
  assert.equal(isExactTjpaSearchUrl('https://jurisprudencia.tjpa.jus.br/bff/api/decisoes/buscar'), true);
  assert.equal(isExactTjpaDetailUrl('https://jurisprudencia.tjpa.jus.br/bff/api/decisoes/buscar-por-numero-documento'), true);
  assert.equal(isExactTjpaPublicDocumentUrl('https://jurisprudencia.tjpa.jus.br/documento/36027620', '36027620'), true);
  assert.equal(isExactTjpaPublicDocumentUrl('https://jurisprudencia.tjpa.jus.br.evil.example/documento/36027620'), false);
});

test('TJPA verifica somente confirmação individual única pelo mesmo id e CNJ', async () => {
  const result = await new TjpaJurisprudenciaAdapter(tjpaFetchMock())
    .searchOfficialJurisprudence('dano moral', 1);
  assert.equal(result.decisions.length, 1);
  const decision = result.decisions[0]!;
  assert.equal(decision.courtCode, 'TJPA');
  assert.equal(decision.normalizedCnjNumber, '0800462-53.2022.8.14.0044');
  assert.equal(decision.verificationStatus, 'VERIFIED_OFFICIAL');
  assert.equal(decision.verificationBadge, '[OFICIAL TJPA - VERIFICADO]');
  assert.match(decision.contentSha256, /^[a-f0-9]{64}$/);
});

test('TJPA rejeita detalhe individual divergente da busca', async () => {
  const result = await new TjpaJurisprudenciaAdapter(tjpaFetchMock('mismatch'))
    .searchOfficialJurisprudence('dano moral', 1);
  assert.equal(result.decisions.length, 0);
  assert.ok(result.diagnostic.rejectionReasons.some((reason) => reason.includes('divergente')));
});

test('busca explícita no TJPA admite apenas decisão oficial verificada', async () => {
  const official = await new TjpaJurisprudenciaAdapter(tjpaFetchMock())
    .searchOfficialJurisprudence('dano moral', 1);
  const service = new JudicialSearchService();
  (service as any).tjpaAdapter = { searchOfficialJurisprudence: async () => official };
  const result = await service.searchJurisprudence({
    query: 'dano moral',
    courtCodes: ['TJPA'],
    onlyVerified: true,
  });
  assert.equal(result.results.some((item) => item.courtCode === 'TJPA'), true);
  assert.ok(result.sourcesConsulted.includes('tjpa-jurisprudencia'));
  assert.equal(result.diagnostic?.adapter, 'tjpa-jurisprudencia');
});
