import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ORIGIN = 'http://localhost:5173';
const BASE = 'http://127.0.0.1:43119';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    const stderr = [];
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(Buffer.concat(stderr).toString('utf8') || command + ' failed'));
    });
  });
}

const dir = await mkdtemp(path.join(tmpdir(), 'jurisflow-bridge-smoke-'));
try {
  const key = path.join(dir, 'key.pem');
  const cert = path.join(dir, 'cert.pem');
  const p12 = path.join(dir, 'test.p12');
  const testPass = 'local-smoke-only';

  await run('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key, '-out', cert, '-days', '30',
    '-subj', '/C=BR/O=JurisFlow Test/CN=ADVOGADA TESTE:12345678901',
  ]);
  await run('openssl', [
    'pkcs12', '-export', '-inkey', key, '-in', cert, '-out', p12,
    '-passout', 'pass:' + testPass,
  ]);

  const healthRes = await fetch(BASE + '/v1/health', { headers: { Origin: ORIGIN } });
  const health = await healthRes.json();
  if (!healthRes.ok || !health?.capabilities?.a1?.available) throw new Error('Bridge A1 health failed');

  const pairRes = await fetch(BASE + '/v1/pair', { method: 'POST', headers: { Origin: ORIGIN } });
  const pair = await pairRes.json();
  if (!pairRes.ok || !pair.token) throw new Error('Pairing failed');

  const rawP12 = await readFile(p12);
  const inspectRes = await fetch(BASE + '/v1/certificates/a1/inspect', {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      Authorization: 'Bearer ' + pair.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: 'test.p12',
      pkcs12Base64: rawP12.toString('base64'),
      password: testPass,
    }),
  });
  rawP12.fill(0);

  const inspect = await inspectRes.json();
  if (!inspectRes.ok || !inspect.success || inspect.certificate?.type !== 'A1') {
    throw new Error('A1 inspection failed: ' + JSON.stringify(inspect));
  }

  console.log(JSON.stringify({
    health: {
      service: health.service,
      version: health.version,
      host: health.host,
      port: health.port,
      a1: health.capabilities.a1,
      a3: health.capabilities.a3,
    },
    certificate: {
      type: inspect.certificate.type,
      subjectName: inspect.certificate.subjectName,
      cpf: inspect.certificate.cpf,
      issuer: inspect.certificate.issuer,
      status: inspect.certificate.status,
      thumbprintSha256: inspect.certificate.thumbprintSha256,
      source: inspect.certificate.source,
    },
  }, null, 2));
} finally {
  await rm(dir, { recursive: true, force: true });
}
