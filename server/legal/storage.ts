import fs from 'fs';
import path from 'path';
import {
  CanonicalLegalDecision,
  CaseMetadata,
  CourtMovement,
  LegalSourceRegistryItem,
  LegalSyncJob,
  QualifiedPrecedent,
} from './types.ts';
import { INITIAL_LEGAL_SOURCE_REGISTRY } from './sourceRegistry.ts';

/**
 * REPOSITÓRIO PERSISTENTE DE CONHECIMENTO JURÍDICO E PRECEDENTES OFICIAIS
 * 
 * Garante:
 * 1. Idempotência por Hash SHA-256
 * 2. Isolamento estrito Multi-Tenant (Repositório Público vs Acervo Privado do Escritório)
 * 3. Preservação de dados brutos e auditoria
 * 4. Persistência em disco durável
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const LEGAL_DB_PATH = path.join(DATA_DIR, 'juris_legal_knowledge.json');

export interface LegalKnowledgeStorageState {
  sources: LegalSourceRegistryItem[];
  decisions: CanonicalLegalDecision[];
  qualifiedPrecedents: QualifiedPrecedent[];
  caseMetadata: CaseMetadata[];
  courtMovements: CourtMovement[];
  syncJobs: LegalSyncJob[];
}

export class LegalKnowledgeStorage {
  private state: LegalKnowledgeStorageState;

  constructor() {
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): LegalKnowledgeStorageState {
    try {
      if (fs.existsSync(LEGAL_DB_PATH)) {
        const raw = fs.readFileSync(LEGAL_DB_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        const rawDecisions = parsed.decisions || [];
        const decisions: CanonicalLegalDecision[] = rawDecisions.map((d: any) => {
          // Bloqueio de sementes de desenvolvimento não auditadas por HTTP real.
          // Precedentes com VERIFIED_OFFICIAL devidamente auditados são preservados.
          if (d.sourceId === 'stj-dados-abertos' && d.verificationStatus !== 'VERIFIED_OFFICIAL') {
            d.verificationStatus = 'DEMO_UNVERIFIED';
            d.environment = 'development';
          }
          return d;
        });

        return {
          sources: parsed.sources || INITIAL_LEGAL_SOURCE_REGISTRY,
          decisions,
          qualifiedPrecedents: parsed.qualifiedPrecedents || [],
          caseMetadata: parsed.caseMetadata || [],
          courtMovements: parsed.courtMovements || [],
          syncJobs: parsed.syncJobs || [],
        };
      }
    } catch (err) {
      console.warn('Falha ao carregar juris_legal_knowledge.json do disco, inicializando com estado padrão:', err);
    }

    return {
      sources: [...INITIAL_LEGAL_SOURCE_REGISTRY],
      decisions: [],
      qualifiedPrecedents: [],
      caseMetadata: [],
      courtMovements: [],
      syncJobs: [],
    };
  }

  public saveToDisk(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(LEGAL_DB_PATH, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      console.error('Erro crítico ao salvar juris_legal_knowledge.json no disco:', err);
    }
  }

  // --- SOURCES REGISTRY ---
  public getSources(): LegalSourceRegistryItem[] {
    return this.state.sources;
  }

  public getSourceById(sourceId: string): LegalSourceRegistryItem | undefined {
    return this.state.sources.find((s) => s.sourceId === sourceId);
  }

  public updateSource(sourceId: string, patch: Partial<LegalSourceRegistryItem>): void {
    const idx = this.state.sources.findIndex((s) => s.sourceId === sourceId);
    if (idx >= 0) {
      this.state.sources[idx] = { ...this.state.sources[idx], ...patch };
      this.saveToDisk();
    }
  }

  // --- DECISIONS (CANONICAL) ---
  public upsertDecision(decision: CanonicalLegalDecision): {
    action: 'INSERTED' | 'UPDATED' | 'UNCHANGED';
    decision: CanonicalLegalDecision;
  } {
    const existingIdx = this.state.decisions.findIndex(
      (d) => d.id === decision.id || (d.contentSha256 === decision.contentSha256 && d.tenantId === decision.tenantId)
    );

    if (existingIdx >= 0) {
      const existing = this.state.decisions[existingIdx];
      if (existing.contentSha256 === decision.contentSha256 && existing.verificationStatus === decision.verificationStatus) {
        return { action: 'UNCHANGED', decision: existing };
      }
      // Atualização de versão
      const updated: CanonicalLegalDecision = {
        ...existing,
        ...decision,
        documentVersion: existing.documentVersion + 1,
        lastVerifiedAt: new Date().toISOString(),
      };
      this.state.decisions[existingIdx] = updated;
      this.saveToDisk();
      return { action: 'UPDATED', decision: updated };
    }

    this.state.decisions.push(decision);
    this.saveToDisk();
    return { action: 'INSERTED', decision };
  }

  public getDecisions(options?: {
    tenantId?: string;
    courtCodes?: string[];
    onlyVerified?: boolean;
    onlyVigente?: boolean;
    includeDemo?: boolean;
  }): CanonicalLegalDecision[] {
    return this.state.decisions.filter((d) => {
      // Bloqueio rigoroso: dados de demonstração/testes NUNCA aparecem em produção
      if (d.verificationStatus === 'DEMO_UNVERIFIED' || (d as any).environment === 'development') {
        if (!options?.includeDemo) return false;
      }
      // Isolamento multi-tenant: decisões com tenantId nulo são públicas; decisões com tenantId pertencem ao escritório
      if (d.tenantId && options?.tenantId && d.tenantId !== options.tenantId) {
        return false;
      }
      if (options?.courtCodes && options.courtCodes.length > 0) {
        if (!options.courtCodes.includes(d.courtCode)) return false;
      }
      if (options?.onlyVerified && d.verificationStatus !== 'VERIFIED_OFFICIAL') {
        return false;
      }
      if (options?.onlyVigente && (d.precedentSituation === 'CANCELADO' || d.precedentSituation === 'SUPERADO')) {
        return false;
      }
      return true;
    });
  }

  public getDecisionById(id: string, tenantId?: string): CanonicalLegalDecision | undefined {
    return this.state.decisions.find(
      (d) => d.id === id && (!d.tenantId || !tenantId || d.tenantId === tenantId)
    );
  }

  // --- QUALIFIED PRECEDENTS ---
  public upsertQualifiedPrecedent(qp: QualifiedPrecedent): void {
    const idx = this.state.qualifiedPrecedents.findIndex((p) => p.id === qp.id);
    if (idx >= 0) {
      this.state.qualifiedPrecedents[idx] = qp;
    } else {
      this.state.qualifiedPrecedents.push(qp);
    }
    this.saveToDisk();
  }

  public getQualifiedPrecedents(courtCode?: string): QualifiedPrecedent[] {
    if (!courtCode) return this.state.qualifiedPrecedents;
    return this.state.qualifiedPrecedents.filter((p) => p.courtCode === courtCode);
  }

  // --- CASE METADATA (DATAJUD) ---
  public saveCaseMetadata(metadata: CaseMetadata): void {
    const idx = this.state.caseMetadata.findIndex(
      (m) => m.normalizedCnjNumber === metadata.normalizedCnjNumber
    );
    if (idx >= 0) {
      this.state.caseMetadata[idx] = metadata;
    } else {
      this.state.caseMetadata.push(metadata);
    }
    this.saveToDisk();
  }

  public getCaseMetadata(normalizedCnjNumber: string): CaseMetadata | undefined {
    return this.state.caseMetadata.find((m) => m.normalizedCnjNumber === normalizedCnjNumber);
  }

  // --- COURT MOVEMENTS ---
  public saveCourtMovements(movements: CourtMovement[]): void {
    for (const mov of movements) {
      if (!this.state.courtMovements.some((m) => m.id === mov.id)) {
        this.state.courtMovements.push(mov);
      }
    }
    this.saveToDisk();
  }

  public getCourtMovements(normalizedCnjNumber: string): CourtMovement[] {
    return this.state.courtMovements.filter((m) => m.normalizedCnjNumber === normalizedCnjNumber);
  }

  // --- SYNC JOBS ---
  public createSyncJob(job: LegalSyncJob): void {
    this.state.syncJobs.unshift(job);
    if (this.state.syncJobs.length > 100) {
      this.state.syncJobs = this.state.syncJobs.slice(0, 100);
    }
    this.saveToDisk();
  }

  public updateSyncJob(jobId: string, patch: Partial<LegalSyncJob>): void {
    const job = this.state.syncJobs.find((j) => j.jobId === jobId);
    if (job) {
      Object.assign(job, patch);
      this.saveToDisk();
    }
  }

  public getSyncJobs(limit: number = 20): LegalSyncJob[] {
    return this.state.syncJobs.slice(0, limit);
  }
}

export const legalStorage = new LegalKnowledgeStorage();
