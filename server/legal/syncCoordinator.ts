import { StjDadosAbertosAdapter } from './adapters/StjDadosAbertosAdapter.ts';
import { BnpAdapter } from './adapters/BnpAdapter.ts';
import { DataJudAdapter } from './adapters/DataJudAdapter.ts';
import { PrecedentVerifier } from './verifier.ts';
import { legalStorage } from './storage.ts';
import { LegalSyncJob } from './types.ts';

/**
 * COORDENADOR DE SINCRONIZAÇÃO E INGESTÃO DETERMINÍSTICA
 *
 * Princípios:
 * 1. Nenhuma contagem gerada por Math.random()
 * 2. Idempotência estrita por SHA-256
 * 3. Falha mostrada explicitamente como falha
 * 4. Verificação prévia por PrecedentVerifier antes da inclusão no acervo
 */

export class LegalSyncCoordinator {
  private stjAdapter = new StjDadosAbertosAdapter();
  private bnpAdapter = new BnpAdapter();
  private datajudAdapter = new DataJudAdapter();

  /**
   * Inicializa o banco com sementes oficiais se estiver vazio
   */
  public async ensureBootstrapped(): Promise<void> {
    const existing = legalStorage.getDecisions();
    if (existing.length === 0) {
      console.log('⚡ [LegalTech] Inicializando repositório canônico com decisões oficiais STJ e BNP...');
      await this.syncStjSources();
      await this.syncBnpSources();
    }
  }

  /**
   * Sincroniza dados abertos do Superior Tribunal de Justiça
   */
  public async syncStjSources(): Promise<LegalSyncJob> {
    const jobId = `job-stj-${Date.now()}`;
    const startedAt = new Date().toISOString();

    const job: LegalSyncJob = {
      jobId,
      sourceId: 'stj-dados-abertos',
      startedAt,
      pagesQueried: 1,
      documentsFound: 0,
      documentsNew: 0,
      documentsUpdated: 0,
      documentsUnchanged: 0,
      documentsRejected: 0,
      documentsDuplicates: 0,
      failures: 0,
      retries: 0,
      latencyMs: 0,
      bytesTransferred: 0,
      parserVersion: 'stj-adapter-2026.1',
      status: 'RUNNING',
    };
    legalStorage.createSyncJob(job);
    legalStorage.updateSource('stj-dados-abertos', { connectorStatus: 'SYNCING' });

    try {
      const syncResult = await this.stjAdapter.syncIncremental();
      if (!syncResult.success) {
        job.status = 'FAILED';
        job.failures = 1;
        job.errorMessage = syncResult.errorMessage;
        job.finishedAt = new Date().toISOString();
        legalStorage.updateSyncJob(jobId, job);
        legalStorage.updateSource('stj-dados-abertos', {
          connectorStatus: 'FAILED',
          lastFailureAt: job.finishedAt,
          lastErrorMessage: syncResult.errorMessage,
        });
        return job;
      }

      job.documentsFound = syncResult.decisions.length;
      job.latencyMs = syncResult.latencyMs;

      for (const dec of syncResult.decisions) {
        // Validação estrita independente pelo PrecedentVerifier
        const verification = PrecedentVerifier.verifyDecision(dec);
        dec.verificationStatus = verification.status;
        dec.rejectionReasons = verification.issues;

        if (!verification.isPassed && verification.status !== 'CANCELLED') {
          job.documentsRejected++;
          continue;
        }

        const upsertRes = legalStorage.upsertDecision(dec);
        if (upsertRes.action === 'INSERTED') job.documentsNew++;
        else if (upsertRes.action === 'UPDATED') job.documentsUpdated++;
        else if (upsertRes.action === 'UNCHANGED') job.documentsUnchanged++;
      }

      job.status = 'SUCCESS';
      job.finishedAt = new Date().toISOString();
      legalStorage.updateSyncJob(jobId, job);

      const allDecs = legalStorage.getDecisions({ courtCodes: ['STJ'] });
      legalStorage.updateSource('stj-dados-abertos', {
        connectorStatus: 'HEALTHY',
        lastSuccessfulSyncAt: job.finishedAt,
        documentsDiscovered: job.documentsFound,
        documentsValidated: allDecs.filter((d) => d.verificationStatus === 'VERIFIED_OFFICIAL').length,
        documentsRejected: job.documentsRejected,
        latencyMs: job.latencyMs,
      });

      return job;
    } catch (err: any) {
      job.status = 'FAILED';
      job.failures = 1;
      job.errorMessage = err.message || String(err);
      job.finishedAt = new Date().toISOString();
      legalStorage.updateSyncJob(jobId, job);
      legalStorage.updateSource('stj-dados-abertos', {
        connectorStatus: 'FAILED',
        lastFailureAt: job.finishedAt,
        lastErrorMessage: job.errorMessage,
      });
      return job;
    }
  }

  /**
   * Sincroniza precedentes qualificados do Banco Nacional de Precedentes (BNP)
   */
  public async syncBnpSources(): Promise<LegalSyncJob> {
    const jobId = `job-bnp-${Date.now()}`;
    const startedAt = new Date().toISOString();

    const job: LegalSyncJob = {
      jobId,
      sourceId: 'cnj-bnp-pangea',
      startedAt,
      pagesQueried: 1,
      documentsFound: 0,
      documentsNew: 0,
      documentsUpdated: 0,
      documentsUnchanged: 0,
      documentsRejected: 0,
      documentsDuplicates: 0,
      failures: 0,
      retries: 0,
      latencyMs: 0,
      bytesTransferred: 0,
      parserVersion: 'bnp-adapter-2026.1',
      status: 'RUNNING',
    };
    legalStorage.createSyncJob(job);
    legalStorage.updateSource('cnj-bnp-pangea', { connectorStatus: 'SYNCING' });

    try {
      const syncResult = await this.bnpAdapter.syncIncremental();
      if (!syncResult.success) {
        job.status = 'FAILED';
        job.failures = 1;
        job.errorMessage = syncResult.errorMessage;
        job.finishedAt = new Date().toISOString();
        legalStorage.updateSyncJob(jobId, job);
        legalStorage.updateSource('cnj-bnp-pangea', {
          connectorStatus: 'FAILED',
          lastFailureAt: job.finishedAt,
          lastErrorMessage: syncResult.errorMessage,
        });
        return job;
      }

      job.documentsFound = syncResult.decisions.length;
      job.latencyMs = syncResult.latencyMs;

      for (const qp of syncResult.qualifiedPrecedents) {
        legalStorage.upsertQualifiedPrecedent(qp);
      }

      for (const dec of syncResult.decisions) {
        const verification = PrecedentVerifier.verifyDecision(dec);
        dec.verificationStatus = verification.status;
        dec.rejectionReasons = verification.issues;

        const upsertRes = legalStorage.upsertDecision(dec);
        if (upsertRes.action === 'INSERTED') job.documentsNew++;
        else if (upsertRes.action === 'UPDATED') job.documentsUpdated++;
        else if (upsertRes.action === 'UNCHANGED') job.documentsUnchanged++;
      }

      job.status = 'SUCCESS';
      job.finishedAt = new Date().toISOString();
      legalStorage.updateSyncJob(jobId, job);

      const allDecs = legalStorage.getDecisions({ courtCodes: ['STF', 'TST'] });
      legalStorage.updateSource('cnj-bnp-pangea', {
        connectorStatus: 'HEALTHY',
        lastSuccessfulSyncAt: job.finishedAt,
        documentsDiscovered: job.documentsFound,
        documentsValidated: allDecs.filter((d) => d.verificationStatus === 'VERIFIED_OFFICIAL').length,
        documentsRejected: job.documentsRejected,
        latencyMs: job.latencyMs,
      });

      return job;
    } catch (err: any) {
      job.status = 'FAILED';
      job.failures = 1;
      job.errorMessage = err.message || String(err);
      job.finishedAt = new Date().toISOString();
      legalStorage.updateSyncJob(jobId, job);
      legalStorage.updateSource('cnj-bnp-pangea', {
        connectorStatus: 'FAILED',
        lastFailureAt: job.finishedAt,
        lastErrorMessage: job.errorMessage,
      });
      return job;
    }
  }

  /**
   * Sincronização geral de todas as fontes oficiais automatizadas
   */
  public async syncAllOfficialSources(): Promise<{
    jobs: LegalSyncJob[];
    summary: string;
  }> {
    const job1 = await this.syncStjSources();
    const job2 = await this.syncBnpSources();
    const totalNew = job1.documentsNew + job2.documentsNew;
    const totalUnchanged = job1.documentsUnchanged + job2.documentsUnchanged;
    const allSucceeded = [job1, job2].every((job) => job.status === 'SUCCESS' && job.failures === 0);

    return {
      jobs: [job1, job2],
      summary: allSucceeded
        ? `Sincronização concluída: ${totalNew} novos documentos persistidos, ${totalUnchanged} inalterados (idempotência confirmada via SHA-256).`
        : `Sincronização não concluída: ${[job1, job2].filter((job) => job.status !== 'SUCCESS').map((job) => job.sourceId).join(', ')} falhou ou não possui conector implementado.`,
    };
  }

  public getDataJudAdapter(): DataJudAdapter {
    return this.datajudAdapter;
  }
}

export const syncCoordinator = new LegalSyncCoordinator();
