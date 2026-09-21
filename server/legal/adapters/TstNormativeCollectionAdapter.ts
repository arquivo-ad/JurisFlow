import crypto from 'node:crypto';
import { PDFParse } from 'pdf-parse';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactTstNormativeCollectionUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic, PrecedentSituation } from '../types.ts';

const TST_NORMATIVE_PDF = 'https://www.tst.jus.br/documents/d/guest/livrointernet-12-pdf';
const TST_NORMATIVE_PAGE = 'https://www.tst.jus.br/livro-de-sumulas-ojs-e-pns';
const COLLECTION_AVAILABILITY_DATE = '2025-07-02';

type FetchLike = typeof fetch;
export type TstNormativeType = 'SUMULA' | 'OJ' | 'PN';

interface CollectionSnapshot {
  text: string;
  pdfSha256: string;
  bytes: number;
  fetchedAt: string;
}

export interface TstNormativeSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fold(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function cleanSection(value: string): string {
  return value
    .replace(/\f/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sourceLabel(type: TstNormativeType, anchor: string, number: number): string {
  if (type === 'SUMULA') return `Súmula ${number}/TST`;
  if (type === 'PN') return `PN ${number}/TST`;
  return `${anchor}/TST`;
}

function documentType(type: TstNormativeType): CanonicalLegalDecision['documentType'] {
  if (type === 'SUMULA') return 'SUMULA';
  if (type === 'PN') return 'PRECEDENTE_NORMATIVO';
  return 'ORIENTACAO_JURISPRUDENCIAL';
}

function processClass(type: TstNormativeType): string {
  if (type === 'SUMULA') return 'SÚMULA';
  if (type === 'PN') return 'PRECEDENTE NORMATIVO';
  return 'ORIENTAÇÃO JURISPRUDENCIAL';
}

function courtOrganForAnchor(type: TstNormativeType, anchor: string): string {
  if (type === 'SUMULA') return 'Tribunal Pleno';
  if (type === 'PN') return 'Seção Especializada em Dissídios Coletivos';
  const upper = anchor.toUpperCase();
  if (upper.includes('SDI1')) return 'SBDI-I';
  if (upper.includes('SDI2')) return 'SBDI-II';
  if (upper.includes('SDC')) return 'SDC';
  if (upper.includes('TP')) return 'Tribunal Pleno';
  return 'Tribunal Superior do Trabalho';
}
function isEntirelyCancelled(section: string): boolean {
  const heading = fold(section.slice(0, 900));
  const parentheticals = [...heading.matchAll(/\(([^)]*cancelad[oa][^)]*)\)/g)].map((match) => match[1].trim());
  return parentheticals.some((text) => !/^item\s+[ivxlcdm]+\b/.test(text) && !/^itens?\s+[ivxlcdm]+\b/.test(text));
}

function anchorPattern(type: TstNormativeType, number: number): RegExp {
  if (type === 'SUMULA') return new RegExp(`^\\s*(SUM-${number})\\s+`, 'gmi');
  if (type === 'PN') return new RegExp(`^\\s*(PN-${number})\\s+`, 'gmi');
  return new RegExp(`^\\s*(OJ-[A-Z0-9-]+-${number})\\s+`, 'gmi');
}

function nextPattern(type: TstNormativeType): RegExp {
  if (type === 'SUMULA') return /^\s*SUM-\d+\s+/gmi;
  if (type === 'PN') return /^\s*PN-\d+\s+/gmi;
  return /^\s*OJ-[A-Z0-9-]+-\d+\s+/gmi;
}

function extractSections(text: string, type: TstNormativeType, number: number): Array<{ anchor: string; section: string }> {
  const pattern = anchorPattern(type, number);
  const matches = [...text.matchAll(pattern)];
  const result: Array<{ anchor: string; section: string }> = [];

  for (const match of matches) {
    const start = match.index ?? 0;
    const searchFrom = start + match[0].length;
    const remainder = text.slice(searchFrom);
    const boundary = nextPattern(type);
    const next = boundary.exec(remainder);
    const end = next ? searchFrom + (next.index ?? remainder.length) : text.length;
    const section = cleanSection(text.slice(start, Math.min(end, start + 20_000)));
    if (section.length >= 25) result.push({ anchor: match[1].toUpperCase(), section });
  }
  return result;
}

function sectionScore(type: TstNormativeType, section: string): number {
  const head = section.slice(0, 1600);
  let score = Math.min(section.length / 200, 40);
  if (/\bRes\.\s*\d+/i.test(head)) score += 80;
  if (/\bDEJT?\b|\bDJ\s+\d/i.test(head)) score += 70;
  if (type === 'PN' && /\((?:positivo|negativo)\)/i.test(head)) score += 120;
  if (/^\s*(?:SUM-\d+|OJ-[A-Z0-9-]+-\d+|PN-\d+)\s+[^\n]{20,}/i.test(head)) score += 30;
  if (/^\s*OJ-[A-Z0-9-]+-\d+\s+\(cancelada\)\s*$/im.test(head.slice(0, 160))) score -= 80;
  return score;
}

function selectCanonicalEntries(
  type: TstNormativeType,
  entries: Array<{ anchor: string; section: string }>
): Array<{ anchor: string; section: string }> {
  const best = new Map<string, { anchor: string; section: string; score: number }>();
  for (const entry of entries) {
    const score = sectionScore(type, entry.section);
    const current = best.get(entry.anchor);
    if (!current || score > current.score) best.set(entry.anchor, { ...entry, score });
  }
  return [...best.values()].map(({ anchor, section }) => ({ anchor, section }));
}

export class TstNormativeCollectionAdapter {
  private cache?: { expiresAt: number; snapshot: CollectionSnapshot };

  private static async extractOfficialPdfText(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    try {
      return (await parser.getText()).text || '';
    } finally {
      await parser.destroy();
    }
  }

  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 45_000,
    private readonly cacheTtlMs = 60 * 60 * 1000,
    private readonly extractPdfText: (buffer: Buffer) => Promise<string> = TstNormativeCollectionAdapter.extractOfficialPdfText
  ) {}

  private async fetchCollection(): Promise<CollectionSnapshot> {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.snapshot;
    if (!isExactTstNormativeCollectionUrl(TST_NORMATIVE_PDF)) {
      throw new Error('URL da coleção normativa TST fora da allowlist exata.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(TST_NORMATIVE_PDF, {
        method: 'GET',
        headers: { Accept: 'application/pdf', 'User-Agent': 'JurisFlow/1.4 LegalResearchConnector' },
        redirect: 'follow',
        signal: controller.signal,
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || '';
      const isPdf = buffer.subarray(0, 5).toString('ascii') === '%PDF-';
      if (!response.ok || !isPdf || buffer.length < 100_000) {
        throw new Error(`Coleção normativa TST inválida: HTTP ${response.status}, Content-Type ${contentType || 'ausente'}, ${buffer.length} bytes.`);
      }

      const text = await this.extractPdfText(buffer);
      if (text.length < 100_000 || !/SUM-\d+/i.test(text) || !/OJ-[A-Z0-9-]+-\d+/i.test(text) || !/PN-\d+/i.test(text)) {
        throw new Error('PDF TST recebido, mas a coleção normativa não pôde ser reconhecida.');
      }
      const snapshot: CollectionSnapshot = {
        text,
        pdfSha256: sha256(buffer),
        bytes: buffer.length,
        fetchedAt: new Date().toISOString(),
      };
      this.cache = { expiresAt: Date.now() + this.cacheTtlMs, snapshot };
      return snapshot;
    } finally {
      clearTimeout(timeout);
    }
  }

  public async searchNormative(type: TstNormativeType, number: number): Promise<TstNormativeSearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const safeNumber = Math.trunc(number);

    try {
      if (!Number.isInteger(safeNumber) || safeNumber <= 0 || safeNumber > 5000) {
        throw new Error('Número de verbete TST inválido.');
      }
      const snapshot = await this.fetchCollection();
      const entries = selectCanonicalEntries(type, extractSections(snapshot.text, type, safeNumber));
      const queryPayload = JSON.stringify({ type, number: safeNumber });
      const querySha256 = sha256(queryPayload);
      const decisions = entries.map(({ anchor, section }) =>
        this.normalizeEntry(type, safeNumber, anchor, section, snapshot, querySha256)
      ).filter((decision): decision is CanonicalLegalDecision => Boolean(decision));

      return {
        decisions,
        diagnostic: {
          adapter: 'tst-normativos',
          sourceName: 'TST - Livro de Súmulas, OJs e Precedentes Normativos',
          courtCode: 'TST',
          officialUrl: TST_NORMATIVE_PDF,
          timestamp: snapshot.fetchedAt,
          httpStatus: 200,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length > 0 ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length > 0
            ? `Verbete TST localizado e validado na coleção normativa oficial (${decisions.length} ocorrência(s)).`
            : 'Coleção oficial consultada; verbete solicitado não localizado.',
          bytesTransferred: snapshot.bytes,
          contentSha256: snapshot.pdfSha256,
          documentsReceived: entries.length,
          documentsNormalized: decisions.length,
          documentsRejected: entries.length - decisions.length,
          recordsRead: entries.length,
          recordsAccepted: decisions.length,
          recordsRejected: entries.length - decisions.length,
          parsingErrors: [],
          rejectionReasons: [],
          normalizedQueryNumber: `${type} ${safeNumber}/TST`,
          connectorStatus: 'HEALTHY',
        },
      };
    } catch (error: any) {
      const isTimeout = error?.name === 'AbortError';
      return {
        decisions: [],
        diagnostic: {
          adapter: 'tst-normativos',
          sourceName: 'TST - Livro de Súmulas, OJs e Precedentes Normativos',
          courtCode: 'TST',
          officialUrl: TST_NORMATIVE_PDF,
          timestamp,
          httpStatus: isTimeout ? 408 : 503,
          latencyMs: Date.now() - startedAt,
          lifecycleState: 'SOURCE_UNAVAILABLE',
          stateDescription: isTimeout ? 'Tempo limite ao baixar coleção normativa TST.' : String(error?.message || error),
          bytesTransferred: 0,
          documentsReceived: 0,
          documentsNormalized: 0,
          documentsRejected: 0,
          recordsRead: 0,
          recordsAccepted: 0,
          recordsRejected: 0,
          parsingErrors: [error?.message || String(error)],
          rejectionReasons: [error?.message || String(error)],
          normalizedQueryNumber: `${type} ${safeNumber}/TST`,
          connectorStatus: isTimeout ? 'DEGRADED' : 'FAILED',
        },
      };
    }
  }
  private normalizeEntry(
    type: TstNormativeType,
    number: number,
    anchor: string,
    section: string,
    snapshot: CollectionSnapshot,
    querySha256: string
  ): CanonicalLegalDecision | null {
    const label = sourceLabel(type, anchor, number);
    const cancelled = isEntirelyCancelled(section);
    const precedentSituation: PrecedentSituation = cancelled ? 'CANCELADO' : 'VIGENTE';
    const sectionSha256 = sha256(section);

    const decision: CanonicalLegalDecision = {
      id: `tst-norm-${type.toLowerCase()}-${anchor.toLowerCase()}-${snapshot.pdfSha256.slice(0, 16)}`,
      sourceId: 'tst-normativos',
      officialUrl: TST_NORMATIVE_PDF,
      fullTextUrl: TST_NORMATIVE_PDF,
      court: 'Tribunal Superior do Trabalho',
      courtCode: 'TST',
      judicialBranch: 'TRABALHO',
      jurisdiction: 'BRASIL',
      courtOrgan: courtOrganForAnchor(type, anchor),
      processClass: processClass(type),
      rawCaseNumber: label,
      rapporteur: '',
      availabilityDate: COLLECTION_AVAILABILITY_DATE,
      officialHeadnote: section,
      rulingThesis: section,
      documentType: documentType(type),
      precedentSituation,
      precedentStrength: 'QUALIFICADO',
      themeNumber: number,
      language: 'pt-BR',
      contentSha256: snapshot.pdfSha256,
      collectedAt: snapshot.fetchedAt,
      lastVerifiedAt: snapshot.fetchedAt,
      verificationStatus: 'FOUND_UNVERIFIED',
      parserVersion: 'tst-normative-pdf-2026.1',
      documentVersion: 1,
      rawPayloadPreserved: {
        collectionPage: TST_NORMATIVE_PAGE,
        collectionAvailabilityDate: COLLECTION_AVAILABILITY_DATE,
        anchor,
        sectionSha256,
        section,
        verificationEvidence: {
          individualDocument: {
            confirmed: true,
            url: TST_NORMATIVE_PDF,
            httpStatus: 200,
            contentSha256: snapshot.pdfSha256,
            bytes: snapshot.bytes,
            fetchedAt: snapshot.fetchedAt,
            contentType: 'application/pdf',
          },
          originatingQuery: {
            id: `tst-norm-query-${querySha256.slice(0, 24)}`,
            endpoint: TST_NORMATIVE_PDF,
            querySha256,
            responseRecordSha256: sectionSha256,
            executedAt: snapshot.fetchedAt,
          },
        },
      },
    };
    const verification = PrecedentVerifier.verifyDecision(decision);
    decision.verificationStatus = verification.status;
    decision.lastVerifiedAt = verification.verificationTimestamp;
    if (verification.isPassed) decision.verificationBadge = '[OFICIAL TST - NORMATIVO VERIFICADO]';
    else if (verification.status === 'CANCELLED') decision.verificationBadge = '[OFICIAL TST - CANCELADO]';
    decision.rejectionReasons = verification.issues.length > 0 ? verification.issues : undefined;
    return decision;
  }
}
