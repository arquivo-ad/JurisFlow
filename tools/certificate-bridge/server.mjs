import http from 'node:http';
import { randomBytes, X509Certificate } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const HOST = '127.0.0.1';
const PORT = Number(process.env.JURISFLOW_CERT_BRIDGE_PORT || 43119);
const VERSION = '0.1.0';
const MAX_JSON_BYTES = 12 * 1024 * 1024;
const SESSION_TTL_MS = 10 * 60 * 1000;

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const ALLOWED_ORIGINS = new Set([
  ...DEFAULT_ORIGINS,
  ...(process.env.JURISFLOW_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
]);

const sessions = new Map();

function json(res, status, payload, origin) {
  const body = JSON.stringify(payload);
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers['vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(body);
}

function allowedOrigin(req) {
  const origin = String(req.headers.origin || '');
  return origin && ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function corsPreflight(req, res) {
  const origin = allowedOrigin(req);
  if (!origin) {
    json(res, 403, { error: 'ORIGIN_NOT_ALLOWED' });
    return;
  }
  res.writeHead(204, {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-max-age': '600',
    vary: 'Origin',
  });
  res.end();
}
function commandExists(command) {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-lc', `command -v ${command} >/dev/null 2>&1`], {
      stdio: 'ignore',
    });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

async function getCapabilities() {
  const [openssl, p11Kit, pkcs11Tool, openscTool, pcscScan] = await Promise.all([
    commandExists('openssl'),
    commandExists('p11-kit'),
    commandExists('pkcs11-tool'),
    commandExists('opensc-tool'),
    commandExists('pcsc_scan'),
  ]);
  return {
    a1: {
      available: openssl,
      provider: openssl ? 'openssl-local' : null,
    },
    a3: {
      available: pkcs11Tool && openscTool,
      provider: pkcs11Tool && openscTool ? 'opensc-pkcs11' : null,
      pkcs11Tool,
      openscTool,
      pcscScan,
    },
    p11Kit,
  };
}

function cleanupSessions() {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
}

function authorize(req, origin) {
  cleanupSessions();
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const session = token ? sessions.get(token) : null;
  if (!session || session.origin !== origin || session.expiresAt <= Date.now()) return false;
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return true;
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) throw new Error('PAYLOAD_TOO_LARGE');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}
function runOpenSslPkcs12(filePath, password, legacy = false) {
  return new Promise((resolve) => {
    const args = ['pkcs12', '-in', filePath, '-clcerts', '-nokeys', '-passin', 'stdin'];
    if (legacy) args.push('-legacy');

    const child = spawn('openssl', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.on('error', (error) => resolve({ code: -1, stdout: '', stderr: error.message }));
    child.on('close', (code) => resolve({
      code: Number(code ?? -1),
      stdout: Buffer.concat(stdout).toString('utf8'),
      stderr: Buffer.concat(stderr).toString('utf8'),
    }));
    child.stdin.end(String(password || '') + '\n');
  });
}

function firstPemCertificate(text) {
  const match = text.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
  return match?.[0] || null;
}

function parseCommonName(subject) {
  const match = String(subject || '').match(/(?:^|\n|,\s*)CN\s*=\s*([^,\n]+)/i);
  return match?.[1]?.trim() || String(subject || '').trim();
}

function extractCpf(subjectName, subject) {
  const combined = `${subjectName} ${subject}`;
  const candidates = combined.match(/\b\d{11}\b/g) || [];
  return candidates[0];
}

function certificateStatus(validFrom, validTo) {
  const now = Date.now();
  const start = new Date(validFrom).getTime();
  const end = new Date(validTo).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || now < start || now > end) return 'EXPIRED';
  if (end - now <= 30 * 24 * 60 * 60 * 1000) return 'EXPIRING_SOON';
  return 'VALID';
}

async function inspectA1(payload) {
  const fileName = String(payload.fileName || '');
  const base64 = String(payload.pkcs12Base64 || '');
  const password = String(payload.password || '');

  if (!/\.(p12|pfx)$/i.test(fileName)) throw new Error('INVALID_FILE_TYPE');
  if (!base64 || base64.length > MAX_JSON_BYTES * 1.4) throw new Error('INVALID_PKCS12_PAYLOAD');

  let buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    throw new Error('INVALID_BASE64');
  }
  if (buffer.length < 64 || buffer.length > 8 * 1024 * 1024) throw new Error('INVALID_PKCS12_SIZE');

  const tempDir = await fs.mkdtemp(path.join(tmpdir(), 'jurisflow-cert-'));
  const tempPath = path.join(tempDir, 'certificate.p12');
  try {
    await fs.writeFile(tempPath, buffer, { mode: 0o600 });
    let result = await runOpenSslPkcs12(tempPath, password, false);
    if (result.code !== 0 && /legacy|unsupported|RC2|algorithm/i.test(result.stderr)) {
      result = await runOpenSslPkcs12(tempPath, password, true);
    }
    if (result.code !== 0) {
      const wrongPassword = /mac verify error|invalid password|mac verify failure/i.test(result.stderr);
      throw new Error(wrongPassword ? 'INVALID_PASSWORD_OR_PKCS12' : 'PKCS12_READ_FAILED');
    }

    const pem = firstPemCertificate(result.stdout);
    if (!pem) throw new Error('CERTIFICATE_NOT_FOUND');
    const cert = new X509Certificate(pem);
    const subjectName = parseCommonName(cert.subject);
    const validFrom = new Date(cert.validFrom).toISOString();
    const validTo = new Date(cert.validTo).toISOString();
    const fingerprint = cert.fingerprint256.replace(/:/g, '').toLowerCase();

    return {
      id: `cert-${fingerprint.slice(0, 24)}`,
      type: 'A1',
      subjectName,
      cpf: extractCpf(subjectName, cert.subject),
      issuer: cert.issuer,
      validFrom,
      validTo,
      serialNumber: cert.serialNumber,
      algorithm: cert.publicKey?.asymmetricKeyType || 'unknown',
      thumbprintSha256: fingerprint,
      status: certificateStatus(validFrom, validTo),
      isHardwareToken: false,
      compatibleCourts: [],
      uploadedAt: new Date().toISOString(),
      source: 'LOCAL_CERTIFICATE_BRIDGE',
      bridgeVersion: VERSION,
    };
  } finally {
    buffer.fill(0);
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
async function handle(req, res) {
  const origin = allowedOrigin(req);

  if (req.method === 'OPTIONS') {
    corsPreflight(req, res);
    return;
  }

  if (req.url === '/v1/health' && req.method === 'GET') {
    json(res, 200, {
      service: 'jurisflow-certificate-bridge',
      version: VERSION,
      host: HOST,
      port: PORT,
      capabilities: await getCapabilities(),
    }, origin);
    return;
  }

  if (!origin) {
    json(res, 403, { error: 'ORIGIN_NOT_ALLOWED' });
    return;
  }

  if (req.url === '/v1/pair' && req.method === 'POST') {
    cleanupSessions();
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, { origin, expiresAt: Date.now() + SESSION_TTL_MS });
    json(res, 200, { token, expiresInSeconds: SESSION_TTL_MS / 1000 }, origin);
    return;
  }

  if (!authorize(req, origin)) {
    json(res, 401, { error: 'BRIDGE_SESSION_REQUIRED' }, origin);
    return;
  }

  if (req.url === '/v1/certificates/a1/inspect' && req.method === 'POST') {
    try {
      const payload = await readJsonBody(req);
      const certificate = await inspectA1(payload);
      json(res, 200, { success: true, certificate }, origin);
    } catch (error) {
      const code = String(error?.message || error);
      const status = code === 'PAYLOAD_TOO_LARGE' ? 413
        : code === 'INVALID_PASSWORD_OR_PKCS12' ? 422
          : 400;
      json(res, status, { success: false, code, error: 'Não foi possível inspecionar o certificado A1 localmente.' }, origin);
    }
    return;
  }

  if (req.url === '/v1/certificates/a3' && req.method === 'GET') {
    const capabilities = await getCapabilities();
    if (!capabilities.a3.available) {
      json(res, 501, {
        success: false,
        code: 'A3_OPENSC_NOT_AVAILABLE',
        error: 'OpenSC/PKCS#11 não está disponível neste computador.',
        capabilities,
      }, origin);
      return;
    }
    json(res, 501, {
      success: false,
      code: 'A3_ENUMERATION_NOT_IMPLEMENTED',
      error: 'Middleware detectado, mas enumeração A3 ainda não foi habilitada nesta versão.',
      capabilities,
    }, origin);
    return;
  }

  json(res, 404, { error: 'NOT_FOUND' }, origin);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    json(res, 500, { error: 'BRIDGE_INTERNAL_ERROR', details: String(error?.message || error) }, allowedOrigin(req));
  });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`JurisFlow Certificate Bridge ${VERSION} listening on http://${HOST}:${PORT}\n`);
  process.stdout.write(`Allowed origins: ${[...ALLOWED_ORIGINS].join(', ')}\n`);
});
