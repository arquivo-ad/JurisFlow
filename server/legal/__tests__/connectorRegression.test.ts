import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { TstJurisprudenciaAdapter } from '../adapters/TstJurisprudenciaAdapter.ts';
import { StjDadosAbertosAdapter } from '../adapters/StjDadosAbertosAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactStjDocumentUrl } from '../officialSources.ts';

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

test('produção não contém assinatura nem processo DJEN fabricados', () => {
  const server = fs.readFileSync(new URL('../../../server.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(server, /Autoridade Certificadora JurisFlow ICP-Brasil/);
  assert.doesNotMatch(server, /payload\.numeroProcesso \|\| '\d{7}-\d{2}/);
  assert.match(server, /DIGITAL_SIGNATURE_NOT_IMPLEMENTED/);
});
