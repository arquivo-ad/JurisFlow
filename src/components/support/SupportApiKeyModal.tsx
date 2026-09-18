import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Clock,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  X,
  Send,
  Trash2,
  Calendar,
  UserCheck,
  Database,
  Eye,
  Info,
} from 'lucide-react';
import { api, setSupportApiKey, getSupportApiKey } from '../../services/api';
import { SupportApiKey, TenantSecurityConfig } from '../../types';

interface SupportApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantName?: string;
}

export const SupportApiKeyModal: React.FC<SupportApiKeyModalProps> = ({ isOpen, onClose, tenantName }) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [securityConfig, setSecurityConfig] = useState<
    (TenantSecurityConfig & { tenantName: string; tablesCount: number; totalTenantRecords: number; rlsEnforced: boolean; superAdminAccessGranted: boolean }) | null
  >(null);

  // Form state para geração
  const [durationHours, setDurationHours] = useState<number>(4);
  const [reason, setReason] = useState('Manutenção técnica emergencial e diagnóstico de banco de dados');
  const [scope, setScope] = useState<'FULL_ADMIN_SUPPORT' | 'READ_ONLY_AUDIT'>('FULL_ADMIN_SUPPORT');

  // Input de validação para a equipe de suporte
  const [inputKeyToAuthenticate, setInputKeyToAuthenticate] = useState(getSupportApiKey());
  const [authSuccess, setAuthSuccess] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await api.getTenantSecurityConfig();
      setSecurityConfig(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar governança de segurança do escritório');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      setInputKeyToAuthenticate(getSupportApiKey());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleProductionLock = async (newLockState: boolean) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.setProductionLock(newLockState);
      setSuccessMsg(res.message);
      await fetchConfig();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao alterar modo de produção');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.generateSupportApiKey({
        durationHours,
        reason,
        scope,
      });
      setSuccessMsg(res.message);
      await fetchConfig();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao emitir chave de suporte');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!window.confirm('Tem certeza de que deseja encerrar e revogar o acesso do suporte imediatamente?')) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.revokeSupportApiKey(keyId);
      setSuccessMsg(res.message);
      if (getSupportApiKey() === keyId) {
        setSupportApiKey('');
      }
      await fetchConfig();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao revogar chave');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAuthenticateSupportSession = async () => {
    if (!inputKeyToAuthenticate.trim()) {
      setErrorMsg('Informe a chave de suporte enviada pelo cliente.');
      return;
    }
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.validateSupportApiKey(inputKeyToAuthenticate.trim());
      setSupportApiKey(inputKeyToAuthenticate.trim());
      setAuthSuccess(true);
      setSuccessMsg('Sessão de suporte autenticada com sucesso! Acesso liberado.');
      await fetchConfig();
      setTimeout(() => {
        setAuthSuccess(false);
        setSuccessMsg('');
      }, 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Chave de suporte inválida ou recusada.');
      setAuthSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSessionKey = () => {
    setSupportApiKey('');
    setInputKeyToAuthenticate('');
    setSuccessMsg('Chave de suporte desconectada desta sessão.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const activeKey = securityConfig?.activeSupportKey;
  const isLocked = securityConfig?.isProductionLocked ?? true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-6">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Central de Suporte & Chave de Acesso</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Isolamento Estrito RLS
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Escritório:{' '}
                <span className="font-semibold text-amber-300">{securityConfig?.tenantName || tenantName || 'Escritório Atual'}</span> •
                Contêiner de dados 100% blindado e apartador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-sm">
          {/* Status Messages */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Atenção na Validação de Segurança</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start space-x-3">
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Operação Concluída</p>
                <p>{successMsg}</p>
              </div>
            </div>
          )}

          {/* Banner de Isolamento e Produção Real */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                isLocked
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center space-x-2.5 mb-2">
                {isLocked ? (
                  <Lock className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Unlock className="w-5 h-5 text-amber-600" />
                )}
                <span className="font-bold text-sm">
                  {isLocked ? 'Ambiente 100% Produção Real' : 'Modo Setup / Implantação'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                {isLocked
                  ? 'O Super Admin da plataforma NÃO possui acesso aos dados do escritório sem que uma Chave de Suporte seja gerada manualmente por você.'
                  : 'Acesso direto do Super Admin liberado para configuração inicial e implantação.'}
              </p>
              <button
                onClick={() => handleToggleProductionLock(!isLocked)}
                disabled={loading}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center justify-center space-x-1.5 ${
                  isLocked
                    ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{isLocked ? 'Alternar para Modo Setup' : 'Travar Acesso (Produção Real)'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-col justify-between">
              <div className="flex items-center space-x-2.5 mb-2 text-slate-900">
                <Database className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-sm">Contêineres Apartados (RLS)</span>
              </div>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Cada tabela possui chave de partição isolada por escritório. Nenhum cliente ou usuário externo tem acesso às informações de terceiros.
              </p>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 text-slate-500">
                <span>Tabelas Isoladas: <strong className="text-slate-800">14</strong></span>
                <span>Registros do Tenant: <strong className="text-slate-800">{securityConfig?.totalTenantRecords ?? '...'}</strong></span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-col justify-between">
              <div className="flex items-center space-x-2.5 mb-2 text-slate-900">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-sm">Acesso Super Admin Atual</span>
              </div>
              <div className="mb-3">
                {activeKey ? (
                  <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>CHAVE DE SUPORTE ATIVA</span>
                  </div>
                ) : isLocked ? (
                  <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-semibold bg-rose-100 text-rose-800">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>ACESSO BLOQUEADO (PROTEGIDO)</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800">
                    <Info className="w-3.5 h-3.5" />
                    <span>ACESSO SETUP LIBERADO</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                {activeKey
                  ? `Expira em: ${new Date(activeKey.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Nenhum técnico pode visualizar seus processos sem autorização.'}
              </p>
            </div>
          </div>

          {/* Painel da Chave Ativa (se houver) */}
          {activeKey && (
            <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-lg border border-indigo-700/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="font-bold text-base text-white">Chave de Suporte Temporária Vigente</h3>
                  </div>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    O suporte técnico tem acesso temporário liberado a este escritório.
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeKey(activeKey.id)}
                  disabled={loading}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold flex items-center space-x-1.5 self-start md:self-auto transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revogar Acesso Imediatamente</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="md:col-span-2">
                  <label className="text-[11px] uppercase tracking-wider text-indigo-300 font-semibold mb-1 block">
                    API Key de Suporte (Envie para o Suporte Técnico):
                  </label>
                  <div className="flex items-center space-x-2 bg-slate-950/70 p-2.5 rounded-lg border border-indigo-500/30">
                    <code className="text-amber-300 font-mono text-sm tracking-wide flex-1 break-all select-all font-semibold">
                      {activeKey.key}
                    </code>
                    <button
                      onClick={() => handleCopyKey(activeKey.key)}
                      className="p-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center space-x-1 text-xs"
                      title="Copiar Chave"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex flex-col justify-center text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-indigo-200">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Expiração:</span>
                    </span>
                    <strong className="text-white">
                      {new Date(activeKey.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-indigo-200">
                    <span>Validade Total:</span>
                    <strong className="text-white">{activeKey.durationHours} horas</strong>
                  </div>
                  <div className="flex items-center justify-between text-indigo-200">
                    <span>Escopo:</span>
                    <strong className="text-amber-300">
                      {activeKey.scope === 'FULL_ADMIN_SUPPORT' ? 'Suporte Total' : 'Somente Leitura'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Gerador de Nova Chave de Acesso (Cliente) */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {activeKey ? 'Gerar Nova / Substituir Chave de Suporte' : 'Gerar Nova Chave de Acesso para Suporte Técnico'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina o tempo limite de acesso que a equipe técnica terá para prestar suporte ao seu escritório.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Prazo de Expiração:</label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>1 Hora (Atendimento Rápido)</option>
                  <option value={2}>2 Horas</option>
                  <option value={4}>4 Horas (Recomendado)</option>
                  <option value={8}>8 Horas (Turno Completo)</option>
                  <option value={24}>24 Horas (Diagnóstico Completo)</option>
                  <option value={48}>48 Horas (Manutenção Programada)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nível de Permissão (Escopo):</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as any)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="FULL_ADMIN_SUPPORT">Suporte Técnico Administrativo (Leitura e Correção)</option>
                  <option value="READ_ONLY_AUDIT">Somente Leitura e Auditoria de Diagnóstico</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Motivo do Suporte / Chamado:</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Suporte a réplica DR ou banco de dados..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500 flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Após o prazo expirar, o acesso é revogado automaticamente pelo sistema.</span>
              </span>
              <button
                onClick={handleGenerateKey}
                disabled={loading}
                className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center space-x-2 shadow-sm"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Gerar Chave e Liberar Acesso</span>
              </button>
            </div>
          </div>

          {/* Autenticação com Chave de Suporte (Área para o Super Admin em Atendimento) */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Área do Técnico / Super Admin: Inserir Chave Fornecida pelo Cliente
                </h4>
              </div>
              {getSupportApiKey() && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Chave Conectada no Navegador
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Se você é o Administrador da Plataforma prestando suporte, insira abaixo a API Key que o cliente gerou e enviou para você:
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={inputKeyToAuthenticate}
                onChange={(e) => setInputKeyToAuthenticate(e.target.value)}
                placeholder="Cole aqui a API Key (ex: SEC-SUP-XXXX...)"
                className="w-full flex-1 text-xs font-mono border border-slate-300 rounded-lg p-2.5 bg-white uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleAuthenticateSupportSession}
                disabled={loading || !inputKeyToAuthenticate.trim()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Validar & Ativar Suporte</span>
              </button>
              {getSupportApiKey() && (
                <button
                  onClick={handleClearSessionKey}
                  className="w-full sm:w-auto px-3 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
                  title="Desconectar chave"
                >
                  Desconectar
                </button>
              )}
            </div>
          </div>

          {/* Histórico de Chaves Emitidas */}
          {securityConfig?.supportKeysHistory && securityConfig.supportKeysHistory.length > 0 && (
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 mb-2 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Histórico de Autorizações de Suporte Técnico</span>
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <tr>
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Chave</th>
                      <th className="p-3">Gerada Por</th>
                      <th className="p-3">Duração</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {securityConfig.supportKeysHistory.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-50/50">
                        <td className="p-3 whitespace-nowrap text-slate-500">
                          {new Date(k.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3 font-mono text-slate-800 font-semibold">{k.key}</td>
                        <td className="p-3">{k.createdByName}</td>
                        <td className="p-3">{k.durationHours}h</td>
                        <td className="p-3">
                          {k.status === 'ACTIVE' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ATIVA
                            </span>
                          ) : k.status === 'REVOKED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              REVOGADA
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              EXPIRADA
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {k.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleRevokeKey(k.id)}
                              className="text-rose-600 hover:text-rose-800 font-semibold text-[11px]"
                            >
                              Revogar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Segurança em Nível de Linha (Row-Level Security) e Criptografia ponta-a-ponta por Escritório.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
