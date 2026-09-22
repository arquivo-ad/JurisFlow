import crypto from 'node:crypto';
import { DataJudAdapter } from './DataJudAdapter.ts';
import { PrecedentVerifier } from '../verifier.ts';
import { isExactTjdftSearchUrl } from '../officialSources.ts';
import type { CanonicalLegalDecision, OfficialSourceDiagnostic } from '../types.ts';

const TJDFT_API = 'https://jurisdf.tjdft.jus.br/api/v1/pesquisa';
type FetchLike = typeof fetch;

interface TjdftRecord {
  base?: string;
  subbase?: string;
  uuid?: string;
  identificador?: string;
  dataJulgamento?: string;
  dataPublicacao?: string;
  decisao?: string;
  ementa?: string;
  inteiroTeor?: string;
  processo?: string;
  nomeRelator?: string;
  nomeRelatorDesignado?: string;
  descricaoOrgaoJulgador?: string;
  descricaoOrgao?: string;
  segredoJustica?: boolean;
  versao?: string;
  possuiInteiroTeor?: boolean;
}
interface TjdftPayload {
  hits?: number | { value?: number };
  registros?: TjdftRecord[];
}

export interface TjdftSearchResult {
  decisions: CanonicalLegalDecision[];
  diagnostic: OfficialSourceDiagnostic;
  totalRecords: number;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function totalHits(value: TjdftPayload['hits']): number {
  if (typeof value === 'number') return value;
  return Number(value?.value || 0);
}

function isoDate(value?: string): string | undefined {
  const text = String(value || '').trim();
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function safeText(value?: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
export class TjdftJurisprudenciaAdapter {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 35_000
  ) {}

  public async searchOfficialJurisprudence(query: string, limit = 5): Promise<TjdftSearchResult> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const safeQuery = String(query || '').trim().slice(0, 500);
    const safeLimit = Math.max(1, Math.min(limit, 10));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (!safeQuery) throw new Error('Consulta TJDFT vazia.');
      if (!isExactTjdftSearchUrl(TJDFT_API)) {
        throw new Error('Endpoint TJDFT fora da allowlist exata.');
      }

      const searchBody = {
        query: safeQuery,
        pagina: 0,
        tamanho: safeLimit,
      };
      const searchBodyRaw = JSON.stringify(searchBody);
      const searchResponse = await this.fetchImpl(TJDFT_API, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
        },
        body: searchBodyRaw,
        redirect: 'follow',
        signal: controller.signal,
      });
      const searchBytes = Buffer.from(await searchResponse.arrayBuffer());
      if (!searchResponse.ok) {
        return this.failure(
          timestamp, startedAt, searchResponse.status,
          'SOURCE_UNAVAILABLE', 'HTTP ' + searchResponse.status + ' na API TJDFT.'
        );
      }

      let payload: TjdftPayload;
      try {
        payload = JSON.parse(searchBytes.toString('utf8'));
      } catch {
        return this.failure(timestamp, startedAt, 502, 'PARSER_ERROR', 'API TJDFT retornou JSON inválido.');
      }

      const records = (payload.registros || []).slice(0, safeLimit);
      const querySha256 = sha256(searchBodyRaw);
      const decisions: CanonicalLegalDecision[] = [];
      const rejectionReasons: string[] = [];

      for (const record of records) {
        const uuid = String(record.uuid || '').trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
          rejectionReasons.push('Registro TJDFT sem UUID válido.');
          continue;
        }

        const confirmBody = {
          query: safeQuery,
          termosAcessorios: [{ campo: 'uuid', valor: uuid }],
          pagina: 0,
          tamanho: 10,
        };
        const confirmRaw = JSON.stringify(confirmBody);
        const confirmResponse = await this.fetchImpl(TJDFT_API, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JurisFlow/1.4 LegalResearchConnector',
          },
          body: confirmRaw,
          redirect: 'follow',
          signal: controller.signal,
        });
        const confirmBytes = Buffer.from(await confirmResponse.arrayBuffer());
        if (!confirmResponse.ok) {
          rejectionReasons.push('Confirmação TJDFT ' + uuid + ' retornou HTTP ' + confirmResponse.status + '.');
          continue;
        }

        let confirmPayload: TjdftPayload;
        try {
          confirmPayload = JSON.parse(confirmBytes.toString('utf8'));
        } catch {
          rejectionReasons.push('Confirmação TJDFT ' + uuid + ' retornou JSON inválido.');
          continue;
        }

        const confirmed = confirmPayload.registros?.[0];
        if (
          totalHits(confirmPayload.hits) !== 1
          || confirmPayload.registros?.length !== 1
          || !confirmed
          || confirmed.uuid !== uuid
          || confirmed.identificador !== record.identificador
          || confirmed.processo !== record.processo
        ) {
          rejectionReasons.push('Confirmação individual TJDFT divergente para UUID ' + uuid + '.');
          continue;
        }
        const decision = this.normalizeDecision(
          confirmed,
          confirmBytes,
          searchBodyRaw,
          querySha256,
          sha256(JSON.stringify(record)),
          confirmRaw,
          timestamp
        );
        if (decision.verificationStatus === 'VERIFIED_OFFICIAL') decisions.push(decision);
        else rejectionReasons.push(...(decision.rejectionReasons || ['Registro TJDFT rejeitado pelo verificador.']));
      }

      return {
        decisions,
        totalRecords: totalHits(payload.hits),
        diagnostic: {
          adapter: 'tjdft-jurisprudencia',
          sourceName: 'TJDFT - API Pública de Consulta à Jurisprudência',
          courtCode: 'TJDFT',
          officialUrl: TJDFT_API,
          timestamp,
          httpStatus: searchResponse.status,
          latencyMs: Date.now() - startedAt,
          lifecycleState: decisions.length > 0 ? 'SEARCH_SUCCESS' : 'EMPTY_VALID_DATASET',
          stateDescription: decisions.length > 0
            ? 'Pesquisa TJDFT concluída com confirmação individual por UUID.'
            : 'TJDFT respondeu, mas nenhum registro reuniu evidência suficiente para verificação.',
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
        timestamp,
        startedAt,
        isTimeout ? 408 : 503,
        'SOURCE_UNAVAILABLE',
        isTimeout ? 'Tempo limite ao consultar a API TJDFT.' : String(error?.message || error)
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  private normalizeDecision(
    record: TjdftRecord,
    confirmBytes: Buffer,
    searchBodyRaw: string,
    querySha256: string,
    responseRecordSha256: string,
    confirmRaw: string,
    timestamp: string
  ): CanonicalLegalDecision {
    const rawCaseNumber = String(record.processo || '').trim();
    const normalizedCnjNumber = DataJudAdapter.normalizeCnjNumber(rawCaseNumber);
    const uuid = String(record.uuid || '').trim();
    const identifier = String(record.identificador || '').trim();
    const contentSha256 = sha256(confirmBytes);
    const documentType = record.subbase === 'decisoes-monocraticas'
      ? 'DECISAO_MONOCRATICA'
      : 'ACORDAO';

    const decision: CanonicalLegalDecision = {
      id: 'tjdft-' + contentSha256.slice(0, 20),
      sourceId: 'tjdft-jurisprudencia',
      officialUrl: TJDFT_API,
      court: 'Tribunal de Justiça do Distrito Federal e dos Territórios',
      courtCode: 'TJDFT',
      judicialBranch: 'ESTADUAL',
      jurisdiction: 'DF',
      courtOrgan: safeText(record.descricaoOrgaoJulgador || record.descricaoOrgao),
      processClass: String(record.subbase || record.base || '').trim(),
      rawCaseNumber,
      normalizedCnjNumber: normalizedCnjNumber || undefined,
      alternativeNumber: identifier || uuid,
      rapporteur: safeText(record.nomeRelator),
      designatedRapporteur: safeText(record.nomeRelatorDesignado) || undefined,
      judgmentDate: isoDate(record.dataJulgamento),
      publicationDate: isoDate(record.dataPublicacao),
      officialHeadnote: safeText(record.ementa),
      fullText: safeText(record.inteiroTeor),
      dispositiveSnippet: safeText(record.decisao) || undefined,
      documentType,
      precedentSituation: 'JULGADO',
      precedentStrength: 'PERSUASIVO_REGIONAL',
      language: 'pt-BR',
      contentSha256,
      collectedAt: timestamp,
      lastVerifiedAt: timestamp,
      verificationStatus: 'FOUND_UNVERIFIED',
      parserVersion: 'tjdft-public-api-2026.1',
      documentVersion: Number(record.versao || 1) || 1,
      rawPayloadPreserved: {
        uuid,
        identifier,
        segredoJustica: record.segredoJustica === true,
        possuiInteiroTeor: record.possuiInteiroTeor === true,
        verificationEvidence: {
          individualDocument: {
            confirmed: true,
            url: TJDFT_API,
            httpStatus: 200,
            contentSha256,
            bytes: confirmBytes.length,
            fetchedAt: timestamp,
          },
          individualRequest: {
            uuid,
            hits: 1,
            bodySha256: sha256(confirmRaw),
          },
          originatingQuery: {
            id: 'tjdft-query-' + querySha256.slice(0, 24),
            endpoint: TJDFT_API,
            querySha256,
            responseRecordSha256,
            requestBodySha256: sha256(searchBodyRaw),
            executedAt: timestamp,
          },
        },
      },
    };

    if (record.segredoJustica === true) {
      decision.verificationStatus = 'REJECTED';
      decision.rejectionReasons = ['SEGREDO_JUSTICA: registro não pode ser promovido pelo conector público.'];
      return decision;
    }

    const verification = PrecedentVerifier.verifyDecision(decision);
    decision.verificationStatus = verification.status;
    decision.lastVerifiedAt = verification.verificationTimestamp;
    decision.verificationBadge = verification.isPassed ? '[OFICIAL TJDFT - VERIFICADO]' : undefined;
    decision.rejectionReasons = verification.isPassed ? undefined : verification.issues;
    return decision;
  }

  private failure(
    timestamp: string,
    startedAt: number,
    httpStatus: number,
    lifecycleState: 'SOURCE_UNAVAILABLE' | 'PARSER_ERROR',
    message: string
  ): TjdftSearchResult {
    return {
      decisions: [],
      totalRecords: 0,
      diagnostic: {
        adapter: 'tjdft-jurisprudencia',
        sourceName: 'TJDFT - API Pública de Consulta à Jurisprudência',
        courtCode: 'TJDFT',
        officialUrl: TJDFT_API,
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
