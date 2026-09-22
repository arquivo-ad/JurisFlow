import https from 'node:https';
import tls from 'node:tls';
import type { IncomingHttpHeaders } from 'node:http';

const TJPE_HOST = 'consultajurisprudencia.app.tjpe.jus.br';

// Official AIA intermediate omitted by the TJPE server chain.
// Subject: Amazon RSA 2048 M01
// Issuer: Amazon Root CA 1
// SHA-256: 53:38:EB:EC:8F:B2:AC:60:99:61:26:D3:E7:6A:A3:4F:D0:F3:31:8A:C7:8E:BB:7A:C8:F6:F1:36:1F:48:4B:33
const AMAZON_RSA_2048_M01 = `-----BEGIN CERTIFICATE-----
MIIEXjCCA0agAwIBAgITB3MSOAudZoijOx7Zv5zNpo4ODzANBgkqhkiG9w0BAQsF
ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6
b24gUm9vdCBDQSAxMB4XDTIyMDgyMzIyMjEyOFoXDTMwMDgyMzIyMjEyOFowPDEL
MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEcMBoGA1UEAxMTQW1hem9uIFJT
QSAyMDQ4IE0wMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAOtxLKnL
H4gokjIwr4pXD3i3NyWVVYesZ1yX0yLI2qIUZ2t88Gfa4gMqs1YSXca1R/lnCKeT
epWSGA+0+fkQNpp/L4C2T7oTTsddUx7g3ZYzByDTlrwS5HRQQqEFE3O1T5tEJP4t
f+28IoXsNiEzl3UGzicYgtzj2cWCB41eJgEmJmcf2T8TzzK6a614ZPyq/w4CPAff
nAV4coz96nW3AyiE2uhuB4zQUIXvgVSycW7sbWLvj5TDXunEpNCRwC4kkZjK7rol
jtT2cbb7W2s4Bkg3R42G3PLqBvt2N32e/0JOTViCk8/iccJ4sXqrS1uUN4iB5Nmv
JK74csVl+0u0UecCAwEAAaOCAVowggFWMBIGA1UdEwEB/wQIMAYBAf8CAQAwDgYD
VR0PAQH/BAQDAgGGMB0GA1UdJQQWMBQGCCsGAQUFBwMBBggrBgEFBQcDAjAdBgNV
HQ4EFgQUgbgOY4qJEhjl+js7UJWf5uWQE4UwHwYDVR0jBBgwFoAUhBjMhTTsvAyU
lC4IWZzHshBOCggwewYIKwYBBQUHAQEEbzBtMC8GCCsGAQUFBzABhiNodHRwOi8v
b2NzcC5yb290Y2ExLmFtYXpvbnRydXN0LmNvbTA6BggrBgEFBQcwAoYuaHR0cDov
L2NydC5yb290Y2ExLmFtYXpvbnRydXN0LmNvbS9yb290Y2ExLmNlcjA/BgNVHR8E
ODA2MDSgMqAwhi5odHRwOi8vY3JsLnJvb3RjYTEuYW1hem9udHJ1c3QuY29tL3Jv
b3RjYTEuY3JsMBMGA1UdIAQMMAowCAYGZ4EMAQIBMA0GCSqGSIb3DQEBCwUAA4IB
AQCtAN4CBSMuBjJitGuxlBbkEUDeK/pZwTXv4KqPK0G50fOHOQAd8j21p0cMBgbG
kfMHVwLU7b0XwZCav0h1ogdPMN1KakK1DT0VwA/+hFvGPJnMV1Kx2G4S1ZaSk0uU
5QfoiYIIano01J5k4T2HapKQmmOhS/iPtuo00wW+IMLeBuKMn3OLn005hcrOGTad
hcmeyfhQP7Z+iKHvyoQGi1C0ClymHETx/chhQGDyYSWqB/THwnN15AwLQo0E5V9E
SJlbe4mBlqeInUsNYugExNf+tOiybcrswBy8OFsd34XOW3rjSUtsuafd9AWySa3h
xRRrwszrzX/WWGm6wyB+f7C4
-----END CERTIFICATE-----`;

function headersToObject(headers?: HeadersInit): Record<string, string> {
  const result: Record<string, string> = {};
  const normalized = new Headers(headers);
  normalized.forEach((value, key) => { result[key] = value; });
  return result;
}

function responseHeaders(raw: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
    else if (value !== undefined) headers.set(key, String(value));
  }
  return headers;
}
export const secureTjpeFetch: typeof fetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {}
) => {
  const url = new URL(
    typeof input === 'string' || input instanceof URL ? input.toString() : input.url
  );
  if (url.hostname !== TJPE_HOST) return fetch(input, init);

  return await new Promise<Response>((resolve, reject) => {
    const request = https.request(url, {
      method: init.method || 'GET',
      headers: headersToObject(init.headers),
      signal: init.signal || undefined,
      rejectUnauthorized: true,
      servername: TJPE_HOST,
      ca: [...tls.rootCertificates, AMAZON_RSA_2048_M01],
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on('end', () => resolve(new Response(Buffer.concat(chunks), {
        status: res.statusCode || 502,
        statusText: res.statusMessage || '',
        headers: responseHeaders(res.headers),
      })));
    });

    request.on('error', reject);
    if (init.body) request.write(init.body as any);
    request.end();
  });
};
