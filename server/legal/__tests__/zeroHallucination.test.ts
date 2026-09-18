import assert from 'node:assert/strict';
import test from 'node:test';
import { DataJudAdapter } from '../adapters/DataJudAdapter.ts';
import { BnpAdapter } from '../adapters/BnpAdapter.ts';
import { DataJudSearchProvider, JudicialSearchService } from '../judicialSearchProvider.ts';
import { LegalSearchEngine } from '../searchEngine.ts';
import { LegalKnowledgeStorage } from '../storage.ts';

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
