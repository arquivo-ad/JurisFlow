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
import { DjenPublicationsAdapter } from '../adapters/DjenPublicationsAdapter.ts';
import { isExactTrt2OptionsUrl, isExactTjspSearchUrl, isExactTrf3DocumentUrl, isExactTstNormativeCollectionUrl, isExactDjenSearchUrl, isExactDjenCertificateUrl } from '../officialSources.ts';
import { DataJudSearchProvider, JudicialSearchService } from '../judicialSearchProvider.ts';
import { LegalCompetenceClassifier } from '../classifier.ts';

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
