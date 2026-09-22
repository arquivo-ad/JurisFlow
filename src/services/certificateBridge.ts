import type { LawyerDigitalCertificateInfo } from '../types';

const BRIDGE_BASE_URL = 'http://127.0.0.1:43119';
let sessionToken: string | null = null;

export interface CertificateBridgeHealth {
  service: string;
  version: string;
  host: string;
  port: number;
  capabilities: {
    a1: { available: boolean; provider: string | null };
    a3: {
      available: boolean;
      provider: string | null;
      pkcs11Tool: boolean;
      openscTool: boolean;
      pcscScan: boolean;
    };
    p11Kit: boolean;
  };
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    window.clearTimeout(timeout);
  }
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

async function pair(): Promise<string> {
  if (sessionToken) return sessionToken;
  const response = await fetchWithTimeout(`${BRIDGE_BASE_URL}/v1/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('CERTIFICATE_BRIDGE_PAIRING_FAILED');
  const payload = await response.json() as { token?: string };
  if (!payload.token) throw new Error('CERTIFICATE_BRIDGE_PAIRING_FAILED');
  sessionToken = payload.token;
  return sessionToken;
}
export async function getCertificateBridgeHealth(): Promise<CertificateBridgeHealth> {
  const response = await fetchWithTimeout(`${BRIDGE_BASE_URL}/v1/health`, { method: 'GET' });
  if (!response.ok) throw new Error(`CERTIFICATE_BRIDGE_HTTP_${response.status}`);
  return response.json() as Promise<CertificateBridgeHealth>;
}

export async function inspectA1CertificateLocally(
  file: File,
  password: string
): Promise<LawyerDigitalCertificateInfo> {
  if (!/\.(p12|pfx)$/i.test(file.name)) throw new Error('INVALID_CERTIFICATE_FILE');
  if (file.size <= 0 || file.size > 8 * 1024 * 1024) throw new Error('INVALID_CERTIFICATE_SIZE');

  const token = await pair();
  const arrayBuffer = await file.arrayBuffer();
  const response = await fetchWithTimeout(
    `${BRIDGE_BASE_URL}/v1/certificates/a1/inspect`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: file.name,
        pkcs12Base64: toBase64(arrayBuffer),
        password,
      }),
    },
    20_000
  );

  const payload = await response.json().catch(() => ({})) as {
    success?: boolean;
    code?: string;
    error?: string;
    certificate?: LawyerDigitalCertificateInfo;
  };
  if (!response.ok || !payload.success || !payload.certificate) {
    if (response.status === 401) sessionToken = null;
    throw new Error(payload.code || payload.error || 'CERTIFICATE_INSPECTION_FAILED');
  }
  return payload.certificate;
}

export async function getA3BridgeStatus() {
  const token = await pair();
  const response = await fetchWithTimeout(`${BRIDGE_BASE_URL}/v1/certificates/a3`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}
