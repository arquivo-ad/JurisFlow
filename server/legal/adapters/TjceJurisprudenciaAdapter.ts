import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactTjceDocumentUrl, isExactTjceSearchUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TJCE_API = 'https://gateway.tjce.jus.br/sjuris/api/v1/jurisprudencia';
type FetchLike = typeof fetch;

interface TjceRecord {
  id?: string;
  idDocumento?: number;
  nomeDocumento?: string;
  numeroProcesso?: string;
  classe?: string;
  orgaoJulgador?: string;
  magistrado?: string;
  dataJulgamento?: number[];
  dataPublicacao?: string;
  ementa?: string;
  conteudo?: string;
  pdfAutenticadoBase64?: string;
  origem?: string;
}
interface TjceSearchPayload {
  pagina?: {
    content?: TjceRecord[];
    totalElements?: number;
  };
  id?: string;
}

export interface TjceSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  totalRecords: number;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function textOnly(value?: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
function dateFromArray(value?: number[]): string | undefined {
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const [year, month, day] = value;
  if (!year || !month || !day) return undefined;
  return [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
}

function decodePdf(value?: string): Buffer | null {
  try {
    const clean = String(value || '').replace(/\s+/g, '');
    if (!clean) return null;
    const pdf = Buffer.from(clean, 'base64');
    return pdf.subarray(0, 5).toString('ascii') === '%PDF-' ? pdf : null;
  } catch {
    return null;
  }
}

function normalizeCnj(raw?: string): string | undefined {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length !== 20) return undefined;
  const formatted = digits.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6');
  return DataJudAdapter.normalizeCnjNumber(formatted) || undefined;
}
function buildDetailUrl(record: TjceRecord): string {
  const id = String(record.id || '').trim();
  const documentType = String(record.nomeDocumento || '').trim();
  return TJCE_API + '/'
    + encodeURIComponent(id) + '/'
    + encodeURIComponent(documentType) + '/'
    + encodeURIComponent('2º GRAU');
}

export class TjceJurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 35_000
  ) {}

  public async searchOfficialJurisprudence(query: string, limit = 5): Promise<TjceSearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const safeQuery = String(query || '').trim().slice(0, 500);
    const safeLimit = Math.max(1, Math.min(limit, 10));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      if (!safeQuery) throw new Error('Consulta TJCE vazia.');
      const searchUrl = TJCE_API + '/?page=0&size=' + safeLimit;
      if (!isExactTjceSearchUrl(searchUrl)) throw new Error('Endpoint TJCE fora da allowlist exata.');

      const bodyObject = {
        busca: safeQuery,
        nomeDocumento: ['ACÓRDÃO'],
        baseDocumento: ['2º GRAU'],
      };
      const requestBody = JSON.stringify(bodyObject);
      const querySha256 = sha256(requestBody);

      const response = await this.fetchImpl(searchUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          Referer: 'https://sjuris.tjce.jus.br/',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
        },
        body: requestBody,
        signal: controller.signal,
      });
      const searchBytes = Buffer.from(await response.arrayBuffer());
      if (!response.ok) {
        return this.failure(timestamp, startedAt, response.status, 'SOURCE_UNAVAILABLE',
          'HTTP ' + response.status + ' na API SJURIS/TJCE.');
      }

      let payload: TjceSearchPayload;
      try {
        payload = JSON.parse(searchBytes.toString('utf8'));
      } catch {
        return this.failure(timestamp, startedAt, 502, 'PARSER_ERROR',
          'API SJURIS/TJCE retornou JSON inválido.');
      }

      const records = (payload.pagina?.content || []).slice(0, safeLimit);
      const decisions: CanonicalLegalDecision[] = [];
      const rejectionReasons: string[] = [];

      for (const record of records) {
        const normalizedCnjNumber = normalizeCnj(record.numeroProcesso);
        const id = String(record.id || '').trim();
        if (!normalizedCnjNumber || !/^\d{20}_\d+$/.test(id)) {
          rejectionReasons.push('Registro TJCE sem identidade processual válida.');
          continue;
        }
        const detailUrl = buildDetailUrl(record);
        if (!isExactTjceDocumentUrl(detailUrl, id)) {
          rejectionReasons.push('URL individual TJCE rejeitada pela allowlist.');
          continue;
        }

        const detailResponse = await this.fetchImpl(detailUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Referer: 'https://sjuris.tjce.jus.br/',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
          },
          signal: controller.signal,
        });
        const detailBytes = Buffer.from(await detailResponse.arrayBuffer());
        if (!detailResponse.ok) {
          rejectionReasons.push('Documento TJCE ' + id + ' retornou HTTP ' + detailResponse.status + '.');
          continue;
        }

        let detail: TjceRecord;
        try {
          detail = JSON.parse(detailBytes.toString('utf8'));
        } catch {
          rejectionReasons.push('Documento TJCE ' + id + ' retornou JSON inválido.');
          continue;
        }
        if (
          detail.id !== record.id
          || detail.idDocumento !== record.idDocumento
          || detail.numeroProcesso !== record.numeroProcesso
          || detail.nomeDocumento !== 'ACÓRDÃO'
        ) {
          rejectionReasons.push('Documento individual TJCE divergente do resultado de busca.');
          continue;
        }

        const pdf = decodePdf(detail.pdfAutenticadoBase64);
        if (!pdf || pdf.length < 1000) {
          rejectionReasons.push('PDF autenticado TJCE ausente ou inválido.');
          continue;
        }

        const decision = this.normalizeDecision(
          detail, detailUrl, detailBytes, pdf,
          searchUrl, querySha256, sha256(JSON.stringify(record)), timestamp
        );
        if (decision.verificationStatus === 'VERIFIED_OFFICIAL') decisions.push(decision);
        else rejectionReasons.push(...(decision.rejectionReasons || ['Registro TJCE rejeitado.']));
      }

      return {
        decisions,
        totalRecords: Number(payload.pagina?.totalElements || records.length),
        diagnostic: {
          adapter: 'tjce-jurisprudencia',
          sourceName: 'TJCE - SJURIS/PJe',
          courtCode: 'TJCE',
          officialUrl: searchUrl,
          timestamp,
          httpStatus: response.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length > 0 ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length > 0
            ? 'Pesquisa SJURIS/TJCE concluída com PDF autenticado individual confirmado.'
            : 'TJCE respondeu, mas nenhum registro reuniu evidência suficiente para verificação.',
          bytesTransferred: searchBytes.length,
          contentSha256: sha256(searchBytes),
          documentsReceived: records.length,
          documentsNormalized: decisions.length,
          documentsRejected: records.length - decisions.length,
          recordsRead: records.length,
          recordsAccepted: decisions.length,
          recordsRejected: records.length - decisions.length,
          parsingErrors: [],
          rejectionReasons,
          normalizedQueryNumber: safeQuery,
          connectorStatus: 'HEALTHY',
        },
      };
    } catch (error: any) {
      const isTimeout = error?.name === 'AbortError';
      return this.failure(
        timestamp, startedAt, isTimeout ? 408 : 503, 'SOURCE_UNAVAILABLE',
        isTimeout ? 'Tempo limite ao consultar SJURIS/TJCE.' : String(error?.message || error)
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeDecision(
    record: TjceRecord,
    detailUrl: string,
    detailBytes: Buffer,
    pdf: Buffer,
    searchUrl: string,
    querySha256: string,
    responseRecordSha256: string,
    timestamp: string
  ): CanonicalLegalDecision {
    const digits = String(record.numeroProcesso || '').replace(/\D/g, '');
    const normalizedCnjNumber = normalizeCnj(digits);
    const contentSha256 = sha256(pdf);
    const rawCaseNumber = normalizedCnjNumber || digits;

    const decision: CanonicalLegalDecision = {
      id: 'tjce-' + contentSha256.slice(0, 20),
      sourceId: 'tjce-jurisprudencia',
      officialUrl: detailUrl,
      fullTextUrl: detailUrl,
      court: 'Tribunal de Justiça do Estado do Ceará',
      courtCode: 'TJCE',
      judicialBranch: 'ESTADUAL',
      jurisdiction: 'CE',
      courtOrgan: textOnly(record.orgaoJulgador),
      processClass: textOnly(record.classe),
      rawCaseNumber,
      normalizedCnjNumber,
      alternativeNumber: String(record.idDocumento || ''),
      rapporteur: textOnly(record.magistrado),
      judgmentDate: dateFromArray(record.dataJulgamento),
      officialHeadnote: textOnly(record.ementa),
      fullText: textOnly(record.conteudo),
      documentType: 'ACORDAO',
      precedentSituation: 'JULGADO',
      precedentStrength: 'PERSUASIVO_REGIONAL',
      language: 'pt-BR',
      contentSha256,
      collectedAt: timestamp,
      lastVerifiedAt: timestamp,
      verificationStatus: 'FOUND_UNVERIFIED',
      parserVersion: 'tjce-sjuris-api-2026.1',
      documentVersion: 1,
      rawPayloadPreserved: {
        id: record.id,
        idDocumento: record.idDocumento,
        origem: record.origem,
        carrierResponseSha256: sha256(detailBytes),
        verificationEvidence: {
          individualDocument: {
            confirmed: true,
            url: detailUrl,
            httpStatus: 200,
            contentSha256,
            bytes: pdf.length,
            fetchedAt: timestamp,
          },
          originatingQuery: {
            id: 'tjce-query-' + querySha256.slice(0, 24),
            endpoint: searchUrl,
            querySha256,
            responseRecordSha256,
            executedAt: timestamp,
          },
        },
      },
    };

    const verification = PrecedentVerifier.verifyDecision(decision);
    decision.verificationStatus = verification.status;
    decision.lastVerifiedAt = verification.verificationTimestamp;
    decision.verificationBadge = verification.isPassed ? '[OFICIAL TJCE - VERIFICADO]' : undefined;
    decision.rejectionReasons = verification.isPassed ? undefined : verification.issues;
    return decision;
  }

  private failure(
    timestamp: string,
    startedAt: number,
    httpStatus: number,
    lifecycleState: 'SOURCE_UNAVAILABLE' | 'PARSER_ERROR',
    message: string
  ): TjceSearchResult {
    return {
      decisions: [],
      totalRecords: 0,
      diagnostic: {
        adapter: 'tjce-jurisprudencia',
        sourceName: 'TJCE - SJURIS/PJe',
        courtCode: 'TJCE',
        officialUrl: TJCE_API,
        timestamp,
        httpStatus,
        latencyMs: Date.now() - startedAt,
        lifecycleState,
        stateDescription: message,
        bytesTransferred: 0,
        documentsReceived: 0,
        documentsNormalized: 0,
        documentsRejected: 0,
        recordsRead: 0,
        recordsAccepted: 0,
        recordsRejected: 0,
        parsingErrors: lifecycleState === 'PARSER_ERROR' ? [message] : [],
        rejectionReasons: [message],
        normalizedQueryNumber: '',
        connectorStatus: httpStatus === 408 ? 'DEGRADED' : 'FAILED',
      },
    };
  }
}
