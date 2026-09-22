import crypto from 'node:crypto';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactCarfBrowseUrl, isExactCarfPdfUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const CARF_ROOT = 'https://acordaos.economia.gov.br/solr/acordaos2/browse/';
const CARF_PDF_BASE = 'https://acordaos.economia.gov.br/acordaos2/pdfs/processados/';
type FetchLike = typeof fetch;

interface CarfDoc {
  id?: string;
  numero_processo_s?: string;
  numero_decisao_s?: string;
  nome_relator_s?: string;
  turma_s?: string;
  camara_s?: string;
  secao_s?: string;
  dt_sessao_tdt?: string;
  dt_publicacao_tdt?: string;
  ementa_s?: string;
  decisao_txt?: string[];
  conteudo_txt?: string;
  conteudo_id_s?: string;
  nome_arquivo_pdf_s?: string;
}

interface SolrEnvelope {
  response?: {
    numFound?: number;
    docs?: CarfDoc[];
  };
}

export interface CarfSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  totalRecords: number;
}

function sha256(value: Buffer | string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function isoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function normalizeText(value?: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function unwrapCarfPdf(raw: Buffer): Buffer | null {
  if (raw.subarray(0, 5).equals(Buffer.from('%PDF-'))) return raw;

  const signature = Buffer.from('PGCOPY\n\xff\r\n\0', 'binary');
  if (raw.length < 27 || !raw.subarray(0, 11).equals(signature)) return null;

  const flags = raw.readUInt32BE(11);
  const extensionLength = raw.readUInt32BE(15);
  if (flags !== 0 || extensionLength !== 0) return null;

  let offset = 19 + extensionLength;
  if (offset + 6 > raw.length) return null;
  const fieldCount = raw.readInt16BE(offset);
  offset += 2;
  if (fieldCount !== 1) return null;

  const fieldLength = raw.readInt32BE(offset);
  offset += 4;
  if (fieldLength <= 0 || offset + fieldLength + 2 !== raw.length) return null;

  const pdf = raw.subarray(offset, offset + fieldLength);
  const trailer = raw.readInt16BE(offset + fieldLength);
  if (trailer !== -1) return null;
  if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) return null;
  const eof = pdf.lastIndexOf(Buffer.from('%%EOF'));
  if (eof < 0 || eof < pdf.length - 64) return null;
  return Buffer.from(pdf);
}

function recordHash(doc: CarfDoc): string {
  return sha256(JSON.stringify({
    id: doc.id,
    numeroProcesso: doc.numero_processo_s,
    numeroDecisao: doc.numero_decisao_s,
    relator: doc.nome_relator_s,
    conteudoId: doc.conteudo_id_s,
    arquivo: doc.nome_arquivo_pdf_s,
  }));
}
export class CarfJurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 35_000,
  ) {}

  async searchOfficialJurisprudence(query: string, limit = 5): Promise<CarfSearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const safeQuery = String(query || '').trim().slice(0, 500);
    const safeLimit = Math.max(1, Math.min(limit, 10));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (!safeQuery) throw new Error('Consulta CARF vazia.');

      const landing = await this.fetchImpl(CARF_ROOT, {
        headers: { 'User-Agent': 'Mozilla/5.0 JurisFlow/1.4' },
        signal: controller.signal,
      });
      const landingHtml = await landing.text();
      if (!landing.ok) throw new Error('HTTP ' + landing.status + ' ao descobrir shard CARF.');

      const action = /<form[^>]+id=["']query-form["'][^>]+action=["']([^"']+)/i.exec(landingHtml)?.[1];
      if (!action) throw new Error('Formulário oficial CARF sem endpoint de busca.');
      const searchUrl = new URL(action, CARF_ROOT).toString();
      if (!isExactCarfBrowseUrl(searchUrl)) throw new Error('Endpoint Solr CARF fora da allowlist exata.');

      const queryUrl = new URL(searchUrl);
      queryUrl.searchParams.set('q', safeQuery);
      queryUrl.searchParams.set('wt', 'json');

      const searchResponse = await this.fetchImpl(queryUrl, {
        headers: { Accept: 'application/json,text/plain,*/*', 'User-Agent': 'Mozilla/5.0 JurisFlow/1.4' },
        signal: controller.signal,
      });
      const searchBytes = Buffer.from(await searchResponse.arrayBuffer());
      if (!searchResponse.ok) throw new Error('HTTP ' + searchResponse.status + ' na busca CARF.');

      let payload: SolrEnvelope;
      try {
        payload = JSON.parse(searchBytes.toString('utf8'));
      } catch {
        return this.failure(timestamp, startedAt, 502, 'PARSER_ERROR', 'Solr CARF retornou JSON inválido.');
      }

      const records = (payload.response?.docs || []).slice(0, safeLimit);
      const decisions: CanonicalLegalDecision[] = [];
      const rejectionReasons: string[] = [];
      const querySha = sha256(queryUrl.toString());
      for (const record of records) {
        const id = String(record.id || '').trim();
        const processNumber = String(record.numero_processo_s || '').trim();
        const decisionNumber = String(record.numero_decisao_s || '').trim();
        const fileName = String(record.nome_arquivo_pdf_s || '').trim();
        const contentId = String(record.conteudo_id_s || '').trim();

        if (!/^\d+$/.test(id) || !processNumber || !decisionNumber || !/^\d+_\d+\.pdf$/i.test(fileName) || !/^\d+$/.test(contentId)) {
          rejectionReasons.push('Registro CARF sem identidade documental suficiente.');
          continue;
        }

        const detailUrl = new URL(searchUrl);
        detailUrl.searchParams.set('q', 'id:' + id);
        detailUrl.searchParams.set('wt', 'json');

        const detailResponse = await this.fetchImpl(detailUrl, {
          headers: { Accept: 'application/json,text/plain,*/*', 'User-Agent': 'Mozilla/5.0 JurisFlow/1.4' },
          signal: controller.signal,
        });
        const detailBytes = Buffer.from(await detailResponse.arrayBuffer());
        if (!detailResponse.ok) {
          rejectionReasons.push('Confirmação individual CARF ' + id + ' retornou HTTP ' + detailResponse.status + '.');
          continue;
        }

        let detailPayload: SolrEnvelope;
        try {
          detailPayload = JSON.parse(detailBytes.toString('utf8'));
        } catch {
          rejectionReasons.push('Confirmação individual CARF ' + id + ' retornou JSON inválido.');
          continue;
        }

        const matches = detailPayload.response?.docs || [];
        if ((detailPayload.response?.numFound || 0) !== 1 || matches.length !== 1) {
          rejectionReasons.push('Confirmação individual CARF não retornou correspondência única.');
          continue;
        }

        const detail = matches[0]!;
        if (
          detail.id !== record.id
          || detail.numero_processo_s !== record.numero_processo_s
          || detail.numero_decisao_s !== record.numero_decisao_s
          || detail.conteudo_id_s !== record.conteudo_id_s
          || detail.nome_arquivo_pdf_s !== record.nome_arquivo_pdf_s
        ) {
          rejectionReasons.push('Confirmação individual CARF divergente da busca original.');
          continue;
        }
        const pdfUrl = CARF_PDF_BASE + encodeURIComponent(fileName);
        if (!isExactCarfPdfUrl(pdfUrl, fileName)) {
          rejectionReasons.push('URL individual CARF fora da allowlist.');
          continue;
        }

        const pdfResponse = await this.fetchImpl(pdfUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 JurisFlow/1.4', Referer: searchUrl },
          signal: controller.signal,
        });
        const rawDocument = Buffer.from(await pdfResponse.arrayBuffer());
        if (!pdfResponse.ok) {
          rejectionReasons.push('Documento individual CARF retornou HTTP ' + pdfResponse.status + '.');
          continue;
        }

        const pdf = unwrapCarfPdf(rawDocument);
        if (!pdf) {
          rejectionReasons.push('Documento CARF não contém PDF válido nem envelope PGCOPY aceito.');
          continue;
        }

        const contentSha = sha256(pdf);
        const rawSha = sha256(rawDocument);
        const fullText = normalizeText(detail.conteudo_txt);
        const headnote = normalizeText(detail.ementa_s);
        const decisionText = normalizeText((detail.decisao_txt || []).join('\n'));

        const decision: CanonicalLegalDecision = {
          id: 'carf-' + contentSha.slice(0, 20),
          sourceId: 'carf-jurisprudencia',
          officialUrl: pdfUrl,
          fullTextUrl: pdfUrl,
          court: 'Conselho Administrativo de Recursos Fiscais',
          courtCode: 'CARF',
          judicialBranch: 'ADMINISTRATIVO',
          jurisdiction: 'BRASIL',
          courtOrgan: normalizeText(record.turma_s || record.camara_s || record.secao_s),
          processClass: 'ACÓRDÃO CARF',
          rawCaseNumber: processNumber,
          alternativeNumber: decisionNumber,
          rapporteur: normalizeText(record.nome_relator_s),
          judgmentDate: isoDate(record.dt_sessao_tdt),
          publicationDate: isoDate(record.dt_publicacao_tdt),
          officialHeadnote: headnote,
          fullText,
          dispositiveSnippet: decisionText || undefined,
          documentType: 'ACORDAO',
          precedentSituation: 'JULGADO',
          precedentStrength: 'PERSUASIVO_REGIONAL',
          language: 'pt-BR',
          contentSha256: contentSha,
          collectedAt: timestamp,
          lastVerifiedAt: timestamp,
          verificationStatus: 'FOUND_UNVERIFIED',
          parserVersion: 'carf-solr-2026.1',
          documentVersion: 1,
          rawPayloadPreserved: {
            id,
            conteudoId: contentId,
            nomeArquivoPdf: fileName,
            rawResponseSha256: rawSha,
            rawResponseBytes: rawDocument.length,
            extractedPdfSha256: contentSha,
            extractedPdfBytes: pdf.length,
            pgCopyEnvelope: !rawDocument.subarray(0, 5).equals(Buffer.from('%PDF-')),
            verificationEvidence: {
              individualDocument: {
                confirmed: true,
                url: pdfUrl,
                httpStatus: pdfResponse.status,
                contentSha256: contentSha,
                bytes: pdf.length,
                rawContentSha256: rawSha,
                rawBytes: rawDocument.length,
                fetchedAt: timestamp,
              },
              individualRecord: {
                endpoint: detailUrl.toString(),
                id,
                hits: detailPayload.response?.numFound || 0,
                responseSha256: sha256(detailBytes),
              },
              originatingQuery: {
                id: 'carf-query-' + querySha.slice(0, 24),
                endpoint: queryUrl.toString(),
                querySha256: querySha,
                responseRecordSha256: recordHash(record),
                executedAt: timestamp,
              },
            },
          },
        };

        const verification = PrecedentVerifier.verifyDecision(decision);
        decision.verificationStatus = verification.status;
        decision.lastVerifiedAt = verification.verificationTimestamp;
        decision.verificationBadge = verification.isPassed ? '[OFICIAL CARF - VERIFICADO]' : undefined;
        decision.rejectionReasons = verification.isPassed ? undefined : verification.issues;

        if (verification.isPassed) decisions.push(decision);
        else rejectionReasons.push(...verification.issues);
      }

      return {
        decisions,
        totalRecords: Number(payload.response?.numFound || records.length),
        diagnostic: {
          adapter: 'carf-jurisprudencia',
          sourceName: 'Conselho Administrativo de Recursos Fiscais - Acórdãos',
          courtCode: 'CARF',
          officialUrl: queryUrl.toString(),
          timestamp,
          httpStatus: searchResponse.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length
            ? 'Pesquisa CARF concluída com reconfirmação individual no Solr e PDF oficial validado.'
            : 'CARF respondeu, mas nenhum registro reuniu evidência suficiente para verificação.',
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
      const timeoutHit = error?.name === 'AbortError';
      return this.failure(
        timestamp,
        startedAt,
        timeoutHit ? 408 : 503,
        'SOURCE_UNAVAILABLE',
        timeoutHit ? 'Tempo limite ao consultar CARF.' : String(error?.message || error),
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private failure(
    timestamp: string,
    startedAt: number,
    httpStatus: number,
    lifecycleState: 'SOURCE_UNAVAILABLE' | 'PARSER_ERROR',
    message: string,
  ): CarfSearchResult {
    return {
      decisions: [],
      totalRecords: 0,
      diagnostic: {
        adapter: 'carf-jurisprudencia',
        sourceName: 'Conselho Administrativo de Recursos Fiscais - Acórdãos',
        courtCode: 'CARF',
        officialUrl: CARF_ROOT,
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

export { unwrapCarfPdf };
