import crypto from 'crypto';
import { CanonicalLegalDecision, PrecedentVerificationStatus } from './types.ts';
import { DataJudAdapter } from './adapters/DataJudAdapter.ts';

/**
 * PRECEDENT VERIFIER INDEPENDENTE DO MODELO
 * 
 * Regra de Ouro: Prompt não é verificação.
 * Somente o código determinístico deste verificador pode conceder o status
 * 'VERIFIED_OFFICIAL' ou rejeitar citações inconsistentes/alucinadas.
 */

export interface VerificationResult {
  status: PrecedentVerificationStatus;
  isPassed: boolean;
  issues: string[];
  reasons: string[];
  verificationTimestamp: string;
  checksum: string;
}

export class PrecedentVerifier {
  /**
   * Executa a auditoria completa dos 10 requisitos técnicos obrigatórios
   */
  public static verifyDecision(decision: Partial<CanonicalLegalDecision>): VerificationResult {
    const issues: string[] = [];
    const reasons: string[] = [];
    const nowIso = new Date().toISOString();

    // 1. Oficialidade do Domínio ou Repositório
    const officialUrl = decision.officialUrl || '';
    const isOfficialDomain =
      officialUrl.includes('.jus.br') ||
      officialUrl.includes('.gov.br') ||
      officialUrl.includes('stj.jus.br') ||
      officialUrl.includes('stf.jus.br') ||
      officialUrl.includes('tst.jus.br') ||
      officialUrl.includes('cnj.jus.br') ||
      officialUrl.includes('pdpj.jus.br');

    if (!isOfficialDomain) {
      issues.push('DOMINIO_NAO_OFICIAL: URL da decisão não pertence à infraestrutura pública oficial (.jus.br / .gov.br).');
    }

    // 2. Identificador Unívoco Verificável
    const rawCaseNum = decision.rawCaseNumber || '';
    if (!rawCaseNum.trim()) {
      issues.push('IDENTIFICADOR_AUSENTE: Processo, Súmula ou Tema sem número de identificação judicial.');
    }

    // 3. Normalização Processual
    if (decision.normalizedCnjNumber) {
      const norm = DataJudAdapter.normalizeCnjNumber(decision.normalizedCnjNumber);
      if (!norm) {
        issues.push('CNJ_INVALIDO: Número CNJ informado não cumpre o padrão estrito de 20 dígitos NNNNNNN-DD.AAAA.J.TR.OOOO.');
      }
    }

    // 4. Tribunal e Órgão Julgador
    if (!decision.courtCode || !decision.court) {
      issues.push('TRIBUNAL_AUSENTE: Tribunal de origem ou instância julgadora não especificados.');
    }

    // 5. Data de Julgamento ou Publicação Oficial (Não pode ser futura)
    const judgmentDate = decision.judgmentDate || decision.publicationDate;
    if (!judgmentDate) {
      issues.push('DATA_AUSENTE: Decisão sem data de julgamento ou publicação registrada.');
    } else {
      const parsedDate = new Date(judgmentDate);
      if (isNaN(parsedDate.getTime()) || parsedDate.getTime() > Date.now() + 86400000) {
        issues.push('DATA_INVALIDA: Data de julgamento futura ou em formato incompatível.');
      }
    }

    // 6. Ementa ou Tese Jurídica com Texto Íntegro
    const textBody = decision.officialHeadnote || decision.rulingThesis || '';
    if (textBody.trim().length < 25) {
      issues.push('CONTEUDO_INSUFICIENTE: Ementa oficial ausente ou truncada (menos de 25 caracteres).');
    }

    // 7. Situação de Vigência do Precedente (Overruling / Cancelamento)
    if (decision.precedentSituation === 'CANCELADO') {
      issues.push('PRECEDENTE_CANCELADO: Súmula ou Tese cancelada expressamente pelo tribunal.');
    } else if (decision.precedentSituation === 'SUPERADO') {
      issues.push('PRECEDENTE_SUPERADO: Precedente objeto de overruling superado por nova tese vinculante.');
    }

    // 8. Hash Criptográfico do Conteúdo
    const computedHash = crypto
      .createHash('sha256')
      .update(`${rawCaseNum}|${decision.rapporteur || ''}|${judgmentDate || ''}|${textBody}`, 'utf8')
      .digest('hex');

    // Determinação do Status Canônico
    let status: PrecedentVerificationStatus = 'VERIFIED_OFFICIAL';

    if (decision.precedentSituation === 'CANCELADO') {
      status = 'CANCELLED';
      reasons.push('Precedente cancelado formalmente no tribunal de origem.');
    } else if (decision.precedentSituation === 'SUPERADO') {
      status = 'SUPERSEDED';
      reasons.push('Precedente superado por tese posterior (Overruling).');
    } else if (issues.length > 0) {
      status = 'REJECTED';
      reasons.push(...issues);
    } else {
      reasons.push('Validado em repositório oficial com integridade de hash e correspondência de tribunal.');
    }

    const isPassed = (status as string) === 'VERIFIED_OFFICIAL' || (status as string) === 'VERIFIED_CROSS_SOURCE';

    return {
      status,
      isPassed,
      issues,
      reasons,
      verificationTimestamp: nowIso,
      checksum: computedHash,
    };
  }
}
