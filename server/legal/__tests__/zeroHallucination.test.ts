import assert from 'node:assert/strict';
import test from 'node:test';
import { DataJudAdapter } from '../adapters/DataJudAdapter.ts';
import { BnpAdapter } from '../adapters/BnpAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import { DataJudSearchProvider, JudicialSearchService } from '../judicialSearchProvider.ts';
import { LegalSearchEngine } from '../searchEngine.ts';
import { LegalKnowledgeStorage } from '../storage.ts';
import { CitationGuard } from '../citationGuard.ts';
import { TstJurisprudenciaAdapter } from '../adapters/TstJurisprudenciaAdapter.ts';
import { GeminiLegalService } from '../geminiLegalService.ts';
import type { CanonicalLegalDecision } from '../types.ts';

test('valida formato e dígitos verificadores do número CNJ', () => {
  assert.equal(DataJudAdapter.normalizeCnjNumber('0000832-35.2018.4.01.3202'), '0000832-35.2018.4.01.3202');
  assert.equal(DataJudAdapter.normalizeCnjNumber('0000000-00.0000.0.00.0000'), null);
  assert.equal(DataJudAdapter.normalizeCnjNumber('1002458-12.2024.8.26.0100'), null);
});

test('consulta DataJud sem chave falha fechada antes de tentar rede', async () => {
  const adapter = new DataJudAdapter('', 'https://invalid.example');
  const result = await adapter.queryProcessByCnj('0000832-35.2018.4.01.3202');
  assert.equal(result.success, false);
  assert.equal(result.statusCode, 503);
  assert.match(result.error || '', /não configurado/i);
});

test('provedor não fabrica processo quando a fonte oficial falha', async () => {
  const adapter = {
    isConfigured: () => true,
    queryProcessByCnj: async () => ({ success: false, statusCode: 503, error: 'fonte indisponível' }),
  } as unknown as DataJudAdapter;
  const provider = new DataJudSearchProvider(adapter);
  await assert.rejects(
    provider.getProcessDetails('0000832-35.2018.4.01.3202'),
    /OFFICIAL_SOURCE_UNAVAILABLE/
  );
});

test('termo impossível não recebe precedente por autoridade ou fallback', () => {
  const engine = new LegalSearchEngine(new LegalKnowledgeStorage());
  const result = engine.search({ query: 'zxqvjurisflowtermoimpossivel987654321', onlyVerified: true });
  assert.equal(result.total, 0);
  assert.deepEqual(result.results, []);
  assert.deepEqual(result.sourcesConsulted, []);
});

test('certificado digital não é simulado', () => {
  const service = new JudicialSearchService();
  assert.throws(() => service.inspectDigitalCertificate(), /CERTIFICATE_BRIDGE_NOT_IMPLEMENTED/);
});

test('BNP sem API pública integrada não declara sincronização concluída', async () => {
  const result = await new BnpAdapter().syncIncremental();
  assert.equal(result.success, false);
  assert.equal(result.fetchedCount, 0);
  assert.match(result.errorMessage || '', /SOURCE_NOT_IMPLEMENTED/);
});

test('sementes BNP legadas não recebem selo de precedente verificado', () => {
  const engine = new LegalSearchEngine(new LegalKnowledgeStorage());
  const result = engine.search({ query: 'Súmula Vinculante 10 STF', onlyVerified: true });
  assert.equal(result.results.some((item) => item.sourceId === 'cnj-bnp-pangea'), false);
});

test('página de catálogo do STJ não pode ser verificada como acórdão', () => {
  const result = PrecedentVerifier.verifyDecision({
    rawCaseNumber: 'Espelhos de acórdãos - Corte Especial',
    officialUrl: 'https://dadosabertos.web.stj.jus.br/dataset/espelhos-de-acordaos-corte-especial',
    court: 'Superior Tribunal de Justiça',
    courtCode: 'STJ',
    documentType: 'ACORDAO',
    judgmentDate: '2026-09-18',
    officialHeadnote: 'Descrição institucional extensa de um catálogo de dados abertos.',
    precedentSituation: 'VIGENTE',
  });
  assert.equal(result.isPassed, false);
  assert.ok(result.issues.includes('IDENTIFICADOR_NAO_JUDICIAL: página de catálogo, dataset ou descrição institucional não é precedente judicial.'));
  assert.ok(result.issues.includes('URL_DE_CATALOGO: URL aponta para catálogo de dados, não para o acórdão ou precedente individualizado.'));
});

test('consulta exata a tema não aceita coincidência textual genérica de catálogo', () => {
  const engine = new LegalSearchEngine(new LegalKnowledgeStorage());
  const result = engine.search({ query: 'Qual é a tese do Tema 27 do STJ?', onlyVerified: true });
  assert.equal(result.total, 0);
  assert.deepEqual(result.results, []);
});

test('CitationGuard reconhece Tema 27 do STJ somente no conjunto verificado da consulta', () => {
  const decision = {
    id: 'stj-tema-27',
    sourceId: 'stj-dados-abertos',
    officialUrl: 'https://processo.stj.jus.br/processo/pesquisa/?termo=REsp%201061530%2FRS&aplicacao=processos.ea',
    court: 'Superior Tribunal de Justiça',
    courtCode: 'STJ',
    judicialBranch: 'SUPERIOR',
    jurisdiction: 'BRASIL',
    processClass: 'REsp',
    rawCaseNumber: 'REsp 1061530/RS',
    rapporteur: 'ARI PARGENDLER',
    judgmentDate: '2008-10-22',
    publicationDate: '2009-03-10',
    officialHeadnote: 'Questão submetida e tese firmada preservadas da linha oficial do tema.',
    rulingThesis: 'Tese oficial preservada da fonte.',
    documentType: 'TEMA_REPETITIVO',
    precedentSituation: 'TRANSITADO',
    precedentStrength: 'VINCULANTE',
    themeNumber: 27,
    language: 'pt-BR',
    contentSha256: 'a'.repeat(64),
    collectedAt: '2026-09-19T00:00:00.000Z',
    lastVerifiedAt: '2026-09-19T00:00:00.000Z',
    verificationStatus: 'VERIFIED_OFFICIAL',
    parserVersion: 'test',
    documentVersion: 1,
  } satisfies CanonicalLegalDecision;

  const report = new CitationGuard().validateAndSanitize(
    'O Tema 27 do STJ foi recuperado nesta consulta.',
    [decision]
  );

  assert.equal(report.isPassed, true);
  assert.equal(report.blockedCitationsCount, 0);
  assert.equal(report.verifiedBadgesApplied, 1);
  assert.equal(report.citationsFound[0]?.isVerified, true);
});

const tstOfficialRecord = {
  id: 'acordao-11281',
  tipo: 'ACORDAO',
  numFormatado: 'AIRR-AIRR - 112-81.2021.5.08.0002',
  anoProcInt: 2021,
  numProcInt: 11281,
  numInterno: 11281,
  numProcDocumento: 987654,
  orgao: 'TST',
  orgaoJudicante: { descricao: '8ª Turma' },
  nomRelator: 'Sergio Pinto Martins',
  dtaJulgamento: '2026-09-02T00:00:00-03:00',
  dtaPublicacao: '2026-09-09T07:00:00-03:00',
  ementa: 'COMPETÊNCIA MATERIAL DA JUSTIÇA DO TRABALHO. FUNDAÇÃO PÚBLICA DE DIREITO PRIVADO. CARGO EM COMISSÃO. REGIME CELETISTA. VERBAS RESCISÓRIAS.',
  dispositivo: 'Recurso examinado pela Oitava Turma.',
  numeracaoUnica: { numero: 112, digito: 81, ano: 2021, orgao: 5, tribunal: 8, vara: 2 },
};

test('conector TST normaliza e verifica acórdão somente com evidência oficial completa', async () => {
  const fetchMock = async () => new Response(JSON.stringify({
    totalRegistros: 1,
    registros: [{ registro: tstOfficialRecord }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const adapter = new TstJurisprudenciaAdapter(fetchMock as typeof fetch);

  const result = await adapter.searchOfficialJurisprudence('verbas rescisórias fundação pública cargo de confiança');

  assert.equal(result.diagnostic.httpStatus, 200);
  assert.equal(result.diagnostic.lifecycleState, 'SEARCH_SUCCESS');
  assert.equal(result.decisions.length, 1);
  assert.equal(result.decisions[0]?.verificationStatus, 'VERIFIED_OFFICIAL');
  assert.equal(result.decisions[0]?.normalizedCnjNumber, '0000112-81.2021.5.08.0002');
  assert.match(result.decisions[0]?.officialUrl || '', /^https:\/\/jurisprudencia-backend\.tst\.jus\.br\/rest\/documentos\//);
  assert.match((result.decisions[0]?.rawPayloadPreserved as any)?.officialResponseSha256 || '', /^[a-f0-9]{64}$/);
});

test('conector TST rejeita registro sem relator em vez de completar metadado', async () => {
  const fetchMock = async () => new Response(JSON.stringify({
    totalRegistros: 1,
    registros: [{ registro: { ...tstOfficialRecord, nomRelator: '' } }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const adapter = new TstJurisprudenciaAdapter(fetchMock as typeof fetch);

  const result = await adapter.searchOfficialJurisprudence('fundação pública regime celetista');

  assert.equal(result.decisions.length, 0);
  assert.equal(result.diagnostic.documentsRejected, 1);
  assert.equal(result.diagnostic.lifecycleState, 'EMPTY_VALID_DATASET');
});

test('motor admite evidência auditável da API oficial do TST e exibe o estado verificado', async () => {
  const fetchMock = async () => new Response(JSON.stringify({
    totalRegistros: 1,
    registros: [{ registro: tstOfficialRecord }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const adapter = new TstJurisprudenciaAdapter(fetchMock as typeof fetch);
  const official = await adapter.searchOfficialJurisprudence('verbas rescisórias fundação pública cargo de confiança');
  const storage = {
    getDecisions: () => official.decisions,
  } as unknown as LegalKnowledgeStorage;

  const result = new LegalSearchEngine(storage).search({
    query: 'verbas rescisórias fundação pública cargo de confiança',
    courtCodes: ['TST'],
    onlyVerified: true,
  });

  assert.equal(result.results[0]?.evidenceState, 'VERIFIED_OFFICIAL');
  assert.equal(result.results[0]?.sourceId, 'tst-jurisprudencia');
  assert.equal(result.results[0]?.verificationBadge, '[OFICIAL TST - VERIFICADO]');
});

test('CitationGuard reconhece a classe composta AIRR-AIRR apenas no conjunto da consulta', async () => {
  const fetchMock = async () => new Response(JSON.stringify({
    totalRegistros: 1,
    registros: [{ registro: tstOfficialRecord }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const decision = (await new TstJurisprudenciaAdapter(fetchMock as typeof fetch)
    .searchOfficialJurisprudence('cargo em comissão fundação pública')).decisions[0];

  const report = new CitationGuard().validateAndSanitize(
    'Aplica-se o AIRR-AIRR - 112-81.2021.5.08.0002, conforme a fonte oficial.',
    [decision]
  );

  assert.equal(report.isPassed, true);
  assert.equal(report.blockedCitationsCount, 0);
  assert.equal(report.verifiedBadgesApplied, 1);
});

test('Chat Forense não reutiliza precedente TST antigo quando a consulta oficial atual falha', async () => {
  const service = new GeminiLegalService();
  (service as any).tstAdapter = {
    searchOfficialJurisprudence: async () => ({
      decisions: [],
      totalRecords: 0,
      diagnostic: {
        adapter: 'tst-jurisprudencia',
        officialUrl: 'https://jurisprudencia-backend.tst.jus.br/rest/pesquisa-textual/1/12',
        timestamp: new Date().toISOString(),
        httpStatus: 503,
        latencyMs: 1,
        lifecycleState: 'SOURCE_UNAVAILABLE',
        documentsReceived: 0,
        documentsNormalized: 0,
        documentsRejected: 0,
        rejectionReasons: ['fonte indisponível'],
        connectorStatus: 'FAILED',
      },
    }),
  };

  const result = await service.researchAndSynthesize('CLT fundação pública cargo de confiança verbas rescisórias');

  assert.equal(result.status, 'FAIL_CLOSED');
  assert.equal(result.failureCode, 'SOURCE_UNAVAILABLE');
  assert.deepEqual(result.searchResults, []);
});
