import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { isExactDjenCertificateUrl, isExactDjenSearchUrl } from '../officialSources.ts';
import type {
  DjenPublicationLawyer,
  DjenPublicationResult,
  DjenPublicationSearchParams,
  DjenPublicationSearchResponse,
} from '../../../src/types/index.ts';

const DJEN_BASE = 'https://comunicaapi.pje.jus.br';
const DJEN_SEARCH = `${DJEN_BASE}/api/v1/comunicacao`;

type FetchLike = typeof fetch;

type RawDjenItem = {
  id?: number;
  data_disponibilizacao?: string;
  siglaTribunal?: string;
  tipoComunicacao?: string;
  nomeOrgao?: string;
  idOrgao?: number;
  texto?: string;
  numero_processo?: string;
  meio?: string;
  link?: string | null;
  tipoDocumento?: string;
  nomeClasse?: string;
  codigoClasse?: string;
  numeroComunicacao?: number;
  ativo?: boolean;
  hash?: string;
  status?: string;
  motivo_cancelamento?: string | null;
  data_cancelamento?: string | null;
  datadisponibilizacao?: string;
  meiocompleto?: string;
  numeroprocessocommascara?: string;
  destinatarios?: Array<{ nome?: string; polo?: string }>;
  destinatarioadvogados?: Array<{
    advogado?: { nome?: string; numero_oab?: string; uf_oab?: string };
  }>;
};

type RawDjenEnvelope = {
  status?: string;
  message?: string;
  count?: number;
  items?: RawDjenItem[];
};

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function cleanString(value: unknown): string {
  return String(value ?? '').trim();
}

function numericHeader(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
function normalizeLawyers(raw: RawDjenItem['destinatarioadvogados']): DjenPublicationLawyer[] {
  const seen = new Set<string>();
  const lawyers: DjenPublicationLawyer[] = [];
  for (const wrapper of raw || []) {
    const lawyer = wrapper?.advogado;
    const nome = cleanString(lawyer?.nome);
    const numeroOab = cleanString(lawyer?.numero_oab);
    const ufOab = cleanString(lawyer?.uf_oab).toUpperCase();
    if (!nome || !numeroOab || !ufOab) continue;
    const key = `${ufOab}:${numeroOab}:${nome}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lawyers.push({ nome, numeroOab, ufOab });
  }
  return lawyers;
}

function formatDate(value: unknown): string | undefined {
  const raw = cleanString(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : undefined;
}

export class DjenPublicationsAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 30_000
  ) {}

  public static buildSearchUrl(params: DjenPublicationSearchParams): string {
    const url = new URL(DJEN_SEARCH);
    const append = (key: string, value: unknown) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    };

    append('numeroOab', params.numeroOab?.replace(/\D/g, ''));
    append('ufOab', params.ufOab?.trim().toUpperCase());
    append('nomeAdvogado', params.nomeAdvogado?.trim());
    append('nomeParte', params.nomeParte?.trim());
    append('numeroProcesso', params.numeroProcesso?.replace(/\D/g, ''));
    append('dataDisponibilizacaoInicio', params.dataDisponibilizacaoInicio);
    append('dataDisponibilizacaoFim', params.dataDisponibilizacaoFim);
    append('siglaTribunal', params.siglaTribunal?.trim().toUpperCase());
    append('numeroComunicacao', params.numeroComunicacao);
    append('orgaoId', params.orgaoId);
    append('meio', params.meio || 'D');
    append('pagina', Math.max(1, Math.trunc(params.pagina || 1)));
    append('itensPorPagina', 5);
    return url.toString();
  }
  public async searchPublications(params: DjenPublicationSearchParams): Promise<DjenPublicationSearchResponse> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const normalizedParams: DjenPublicationSearchParams = {
      ...params,
      pagina: Math.max(1, Math.trunc(params.pagina || 1)),
      itensPorPagina: 5,
      meio: params.meio || 'D',
    };
    const url = DjenPublicationsAdapter.buildSearchUrl(normalizedParams);
    const fallback = (
      httpStatus: number,
      lifecycleState: DjenPublicationSearchResponse['diagnostic']['lifecycleState'],
      stateDescription: string,
      connectorStatus: DjenPublicationSearchResponse['diagnostic']['connectorStatus'],
      rejectionReasons: string[] = []
    ): DjenPublicationSearchResponse => ({
      query: normalizedParams,
      count: 0,
      items: [],
      source: 'CNJ_DJEN_PUBLIC_API',
      sourceUrl: url,
      executionTimeMs: Date.now() - startedAt,
      timestamp,
      diagnostic: {
        lifecycleState,
        connectorStatus,
        httpStatus,
        stateDescription,
        recordsReceived: 0,
        recordsVerified: 0,
        recordsRejected: 0,
        rejectionReasons,
      },
    });

    if (!isExactDjenSearchUrl(url)) {
      return fallback(400, 'PARSER_ERROR', 'URL pública DJEN fora da allowlist exata.', 'FAILED', ['INVALID_SEARCH_URL']);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'JurisFlow/1.4 LegalResearchConnector',
        },
        signal: controller.signal,
      });
      const responseText = await response.text();
      const rateLimit = {
        limit: numericHeader(response.headers.get('x-ratelimit-limit')),
        remaining: numericHeader(response.headers.get('x-ratelimit-remaining')),
      };

      if (response.status === 429) {
        return { ...fallback(429, 'RATE_LIMITED', 'Rate limit público do DJEN atingido; a consulta deve ser retomada posteriormente.', 'DEGRADED', ['RATE_LIMITED']), rateLimit };
      }
      if (!response.ok) {
        return { ...fallback(response.status, 'SOURCE_UNAVAILABLE', `HTTP ${response.status} na API pública do DJEN.`, 'FAILED', [`HTTP_${response.status}`]), rateLimit };
      }

      let envelope: RawDjenEnvelope;
      try {
        envelope = JSON.parse(responseText) as RawDjenEnvelope;
      } catch {
        return { ...fallback(502, 'PARSER_ERROR', 'Resposta pública DJEN não contém JSON válido.', 'FAILED', ['INVALID_JSON']), rateLimit };
      }
      const rawItems = Array.isArray(envelope.items) ? envelope.items : [];
      const querySha256 = sha256(url);
      const items: DjenPublicationResult[] = [];
      const rejectionReasons: string[] = [];

      for (const raw of rawItems) {
        const normalized = await this.normalizeAndVerify(raw, url, querySha256, controller.signal);
        if (normalized) items.push(normalized);
        else rejectionReasons.push(`Registro DJEN inválido ou sem identificadores mínimos: ${raw?.id ?? 'sem-id'}`);
      }

      const verified = items.filter((item) => item.evidenceState === 'VERIFIED_OFFICIAL').length;
      const rejected = rawItems.length - items.length;
      return {
        query: normalizedParams,
        count: Number(envelope.count || 0),
        items,
        source: 'CNJ_DJEN_PUBLIC_API',
        sourceUrl: url,
        executionTimeMs: Date.now() - startedAt,
        timestamp,
        rateLimit,
        diagnostic: {
          lifecycleState: items.length > 0 ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          connectorStatus: items.length === 0 && rawItems.length > 0 ? 'DEGRADED' : 'HEALTHY',
          httpStatus: response.status,
          stateDescription: items.length > 0
            ? `Consulta pública DJEN concluída: ${verified}/${items.length} comunicação(ões) confirmada(s) por certidão oficial individual.`
            : 'API pública DJEN respondeu sem comunicações válidas para os filtros informados.',
          recordsReceived: rawItems.length,
          recordsVerified: verified,
          recordsRejected: rejected,
          rejectionReasons,
        },
      };
    } catch (error: any) {
      const timeoutError = error?.name === 'AbortError';
      return fallback(
        timeoutError ? 408 : 503,
        'SOURCE_UNAVAILABLE',
        timeoutError ? 'Tempo limite ao consultar a API pública do DJEN.' : String(error?.message || error),
        'FAILED',
        [timeoutError ? 'TIMEOUT' : String(error?.message || error)]
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  private async normalizeAndVerify(
    raw: RawDjenItem,
    officialQueryUrl: string,
    querySha256: string,
    signal: AbortSignal
  ): Promise<DjenPublicationResult | null> {
    const id = Number(raw.id);
    const hash = cleanString(raw.hash);
    const courtCode = cleanString(raw.siglaTribunal).toUpperCase();
    const courtOrgan = cleanString(raw.nomeOrgao);
    const communicationType = cleanString(raw.tipoComunicacao);
    const processNumber = cleanString(raw.numeroprocessocommascara || raw.numero_processo);
    const availabilityDate = formatDate(raw.data_disponibilizacao || raw.datadisponibilizacao);
    const text = cleanString(raw.texto);

    if (!Number.isFinite(id) || id <= 0 || !hash || !courtCode || !courtOrgan || !communicationType || !processNumber || !availabilityDate || text.length < 5) {
      return null;
    }

    const certificateUrl = `${DJEN_BASE}/api/v1/comunicacao/${encodeURIComponent(hash)}/certidao`;
    if (!isExactDjenCertificateUrl(certificateUrl, hash)) return null;

    const recordCanonical = JSON.stringify({
      id,
      hash,
      courtCode,
      courtOrgan,
      communicationType,
      processNumber,
      availabilityDate,
      text,
      active: raw.ativo !== false,
    });
    const recordSha256 = sha256(recordCanonical);
    let certificateSha256: string | undefined;
    let certificateBytes: number | undefined;
    let verifiedAt: string | undefined;

    try {
      const certificateResponse = await this.fetchImpl(certificateUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/pdf',
          'User-Agent': 'JurisFlow/1.4 LegalResearchConnector',
        },
        signal,
      });
      const certificate = Buffer.from(await certificateResponse.arrayBuffer());
      const contentType = certificateResponse.headers.get('content-type') || '';
      const validPdf = certificateResponse.ok
        && contentType.toLowerCase().includes('application/pdf')
        && certificate.length >= 1024
        && certificate.subarray(0, 5).toString('ascii') === '%PDF-';
      if (validPdf) {
        certificateSha256 = sha256(certificate);
        certificateBytes = certificate.length;
        verifiedAt = new Date().toISOString();
      }
    } catch {
      // A consulta oficial ainda é preservada; a ausência da certidão impede apenas o selo VERIFIED_OFFICIAL.
    }

    const normalizedCnjNumber = DataJudAdapter.normalizeCnjNumber(processNumber) || undefined;
    const recipients = (raw.destinatarios || [])
      .map((recipient) => ({ nome: cleanString(recipient.nome), polo: cleanString(recipient.polo) || undefined }))
      .filter((recipient) => Boolean(recipient.nome));
    const evidenceState = certificateSha256 ? 'VERIFIED_OFFICIAL' as const : 'FOUND_PENDING_REVIEW' as const;
    return {
      id,
      numeroComunicacao: raw.numeroComunicacao,
      hash,
      courtCode,
      courtOrgan,
      communicationType,
      documentType: cleanString(raw.tipoDocumento) || undefined,
      processClass: cleanString(raw.nomeClasse) || undefined,
      classCode: cleanString(raw.codigoClasse) || undefined,
      processNumber,
      normalizedCnjNumber,
      availabilityDate,
      publicationMedium: cleanString(raw.meio),
      publicationMediumLabel: cleanString(raw.meiocompleto) || undefined,
      text,
      fullTextUrl: cleanString(raw.link) || undefined,
      recipients,
      lawyers: normalizeLawyers(raw.destinatarioadvogados),
      active: raw.ativo !== false,
      cancellationReason: cleanString(raw.motivo_cancelamento) || undefined,
      cancellationDate: formatDate(raw.data_cancelamento),
      officialQueryUrl,
      officialCertificateUrl: certificateUrl,
      querySha256,
      recordSha256,
      certificateSha256,
      certificateBytes,
      verifiedAt,
      evidenceState,
      evidenceId: certificateSha256 ? `DJEN:${hash}:${certificateSha256.slice(0, 20)}` : undefined,
    };
  }
}
