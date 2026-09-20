import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { TstJurisprudenciaAdapter } from '../adapters/TstJurisprudenciaAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';

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

test('produção não contém assinatura nem processo DJEN fabricados', () => {
  const server = fs.readFileSync(new URL('../../../server.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(server, /Autoridade Certificadora JurisFlow ICP-Brasil/);
  assert.doesNotMatch(server, /payload\.numeroProcesso \|\| '\d{7}-\d{2}/);
  assert.match(server, /DIGITAL_SIGNATURE_NOT_IMPLEMENTED/);
});
