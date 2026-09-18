import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  HardDrive,
  Network,
  Globe,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Save,
  Activity,
  Terminal,
  ShieldCheck,
  Zap,
  Folder,
  Sliders,
  Check,
  Copy,
} from 'lucide-react';
import { LocalDrConfig, LocalDrTestResult } from '../../types';
import { api } from '../../services/api';

interface LocalDrConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const LocalDrConfigModal: React.FC<LocalDrConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [config, setConfig] = useState<LocalDrConfig>({
    id: '',
    tenantId: '',
    locationType: 'LOCAL_DIRECTORY',
    hostOrIp: 'localhost',
    port: 5432,
    databaseName: 'jurisflow_dr',
    username: 'jurisflow_master',
    password: '',
    directoryPath: 'C:\\JurisFlow\\Data',
    networkSharePath: '',
    driveLetter: 'C:',
    localServerUrl: 'http://jurisflow.local:3000',
    tailscaleEnabled: true,
    tailscaleHostname: 'jurisflow-servidor',
    tailscaleMagicDnsUrl: 'http://jurisflow-servidor.ts.net:3000',
    autoFailoverEnabled: true,
    syncIntervalMinutes: 5,
    lastTestStatus: 'UNTESTED',
    updatedAt: '',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<LocalDrTestResult | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'LOCATION' | 'NETWORK' | 'TEST_LOGS'>('LOCATION');
  const [copiedLogs, setCopiedLogs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await api.getLocalDrConfig();
      if (data) {
        setConfig(data);
      }
    } catch (err: any) {
      console.error('Erro ao carregar configurações DR:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);
      await api.updateLocalDrConfig(config);
      setFeedback({ text: 'Configurações da Réplica DR Local salvas com sucesso!', type: 'success' });
      onSaved();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ text: 'Erro ao salvar configurações: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleRunTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setActiveTab('TEST_LOGS');
      const result = await api.testLocalDrConnection(config);
      setTestResult(result);
      if (result.success) {
        setConfig((prev) => ({
          ...prev,
          lastTestStatus: 'SUCCESS',
          lastTestedAt: new Date().toISOString(),
          lastTestLogs: result.logs,
        }));
      } else {
        setConfig((prev) => ({
          ...prev,
          lastTestStatus: 'ERROR',
          lastTestedAt: new Date().toISOString(),
          lastTestLogs: result.logs,
        }));
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        latencyMs: 0,
        steps: [
          {
            name: 'Conexão com o Serviço',
            status: 'FAILED',
            message: err.message || 'Falha catastrófica ao tentar comunicar com o nó local.',
          },
        ],
        details: {
          resolvedIp: 'N/A',
          portOpen: false,
          authValid: false,
          tablesValidCount: 0,
          tablesMissing: [],
          storageWriteOk: false,
          tailscaleStatus: 'UNCONFIGURED',
          magicDnsReachable: false,
          directoryExists: false,
        },
        logs: [`[ERRO] ${err.message}`],
        diagnosis: 'Não foi possível completar o teste de diagnóstico.',
        troubleshootingSuggestions: [
          'Verifique se o serviço local está ativo.',
          'Execute o assistente "Preparar Ambiente Novo" para criar a estrutura recomendada.',
        ],
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCopyLogs = () => {
    if (testResult?.logs) {
      navigator.clipboard.writeText(testResult.logs.join('\n'));
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-sm">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">
                  Configuração da Réplica DR (LOCAL - OFFLINE Standby)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 font-semibold font-mono">
                  Setup de Contingência
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Aponte o local físico do banco local (IP, Hostname, Diretório, Pasta de Rede) e URLs de acesso do escritório.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('LOCATION')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'LOCATION'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>1. Apontamento do Banco (Local / Rede)</span>
            </button>

            <button
              onClick={() => setActiveTab('NETWORK')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'NETWORK'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>2. Rede do Escritório & Tailscale (MagicDNS)</span>
            </button>

            <button
              onClick={() => setActiveTab('TEST_LOGS')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'TEST_LOGS'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>3. Diagnóstico de Conexão & Logs</span>
              {testResult && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    testResult.success ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              )}
            </button>
          </div>

          <div className="py-2">
            <button
              type="button"
              onClick={handleRunTest}
              disabled={testing}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testando Conexão...' : 'Testar Conexão Agora'}</span>
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Carregando configurações da réplica local...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: LOCATION APPOINTMENT */}
              {activeTab === 'LOCATION' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                      Tipo de Apontamento da Réplica DR
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, locationType: 'LOCAL_DIRECTORY' })}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          config.locationType === 'LOCAL_DIRECTORY'
                            ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <HardDrive
                            className={`w-4 h-4 ${
                              config.locationType === 'LOCAL_DIRECTORY'
                                ? 'text-indigo-600'
                                : 'text-slate-400'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-800">Pasta / Disco Local</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Diretório no servidor local (ex: C:\JurisFlow\Data ou /opt/jurisflow).
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, locationType: 'LOCAL_POSTGRES' })}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          config.locationType === 'LOCAL_POSTGRES'
                            ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Database
                            className={`w-4 h-4 ${
                              config.locationType === 'LOCAL_POSTGRES'
                                ? 'text-indigo-600'
                                : 'text-slate-400'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-800">PostgreSQL Local</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Serviço do PostgreSQL instalado localmente (localhost:5432).
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, locationType: 'NETWORK_SHARE' })}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          config.locationType === 'NETWORK_SHARE'
                            ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Network
                            className={`w-4 h-4 ${
                              config.locationType === 'NETWORK_SHARE'
                                ? 'text-indigo-600'
                                : 'text-slate-400'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-800">Pasta de Rede (SMB)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Storage NAS ou compartilhamento Windows (\\servidor\pasta).
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Campos por tipo */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    {config.locationType === 'LOCAL_DIRECTORY' && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-1">
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Disco / Unidade
                          </label>
                          <select
                            value={config.driveLetter || 'C:'}
                            onChange={(e) => setConfig({ ...config, driveLetter: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          >
                            <option value="C:">C: (Padrão)</option>
                            <option value="D:">D: (Dados)</option>
                            <option value="E:">E: (Storage)</option>
                            <option value="F:">F: (Secundário)</option>
                            <option value="/">/ (Linux Raiz)</option>
                            <option value="/opt">/opt (Linux)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Caminho Completo do Diretório de Dados
                          </label>
                          <input
                            type="text"
                            value={config.directoryPath}
                            onChange={(e) => setConfig({ ...config, directoryPath: e.target.value })}
                            placeholder="C:\JurisFlow\Data"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            Onde o banco offline e as 14 tabelas idênticas de contingência são persistidos.
                          </span>
                        </div>
                      </div>
                    )}

                    {config.locationType === 'NETWORK_SHARE' && (
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Caminho UNC da Pasta Compartilhada na Rede (SMB)
                        </label>
                        <input
                          type="text"
                          value={config.networkSharePath || ''}
                          onChange={(e) => setConfig({ ...config, networkSharePath: e.target.value })}
                          placeholder="\\192.168.1.100\JurisFlow_DR ou \\SERVIDOR-TI\Dados"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Certifique-se de que o usuário do serviço possui permissão de leitura e gravação no compartilhamento de rede.
                        </span>
                      </div>
                    )}

                    {(config.locationType === 'LOCAL_POSTGRES' || config.locationType === 'CUSTOM_IP_HOST') && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Host ou Endereço IP
                          </label>
                          <input
                            type="text"
                            value={config.hostOrIp}
                            onChange={(e) => setConfig({ ...config, hostOrIp: e.target.value })}
                            placeholder="localhost ou 192.168.1.50"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Porta TCP do Banco
                          </label>
                          <input
                            type="number"
                            value={config.port}
                            onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })}
                            placeholder="5432"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Nome do Banco DR
                          </label>
                          <input
                            type="text"
                            value={config.databaseName}
                            onChange={(e) => setConfig({ ...config, databaseName: e.target.value })}
                            placeholder="jurisflow_dr"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Usuário Master DR
                          </label>
                          <input
                            type="text"
                            value={config.username}
                            onChange={(e) => setConfig({ ...config, username: e.target.value })}
                            placeholder="jurisflow_master"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Senha do Usuário Master (Salva em pasta Secrets protegida)
                          </label>
                          <input
                            type="password"
                            value={config.password || ''}
                            onChange={(e) => setConfig({ ...config, password: e.target.value })}
                            placeholder="••••••••••••"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Configurações de Failover e Sincronização */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 block">
                          Comutação Automática de Falha (Auto-Failover)
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Alterna imediatamente para o banco DR local se o ping do Supabase falhar 3 vezes consecutivas.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.autoFailoverEnabled}
                        onChange={(e) => setConfig({ ...config, autoFailoverEnabled: e.target.checked })}
                        className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500"
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-700">Intervalo de Sincronização Standby (Minutos):</span>
                      <select
                        value={config.syncIntervalMinutes || 5}
                        onChange={(e) => setConfig({ ...config, syncIntervalMinutes: Number(e.target.value) })}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                      >
                        <option value={1}>1 minuto (Tempo real contínuo)</option>
                        <option value={5}>5 minutos (Recomendado)</option>
                        <option value={15}>15 minutos</option>
                        <option value={30}>30 minutos</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: NETWORK & TAILSCALE MAGIC DNS */}
              {activeTab === 'NETWORK' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 text-xs text-indigo-950 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-indigo-900">
                      <Globe className="w-4 h-4 text-indigo-600" />
                      <span>Roteamento de Acesso do Escritório & Acesso Remoto</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Nossa aplicação é instalada localmente no servidor do escritório para que todos os membros da equipe acessem via URL personalizada, tanto em servidores <strong>Windows</strong> quanto <strong>Linux</strong>. Com o <strong>Tailscale</strong>, qualquer advogado acessa o sistema de casa ou em audiências sem precisar abrir portas no roteador.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        URL Personalizada de Acesso Local no Escritório
                      </label>
                      <input
                        type="text"
                        value={config.localServerUrl || ''}
                        onChange={(e) => setConfig({ ...config, localServerUrl: e.target.value })}
                        placeholder="http://jurisflow.local:3000 ou http://192.168.1.150:3000"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Endereço que os computadores e notebooks conectados na rede Wi-Fi/cabo do escritório usam no navegador.
                      </span>
                    </div>

                    {/* Bloco Tailscale */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                            TS
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              Integração com Tailscale & DNS Mágico (MagicDNS)
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              Cria uma rede mesh VPN criptografada WireGuard ponto a ponto gratuita.
                            </span>
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={config.tailscaleEnabled}
                          onChange={(e) => setConfig({ ...config, tailscaleEnabled: e.target.checked })}
                          className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500"
                        />
                      </div>

                      {config.tailscaleEnabled && (
                        <div className="pt-3 border-t border-slate-100 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-slate-700 block mb-1">
                                Nome da Máquina / Hostname Tailscale
                              </label>
                              <input
                                type="text"
                                value={config.tailscaleHostname || ''}
                                onChange={(e) => {
                                  const name = e.target.value;
                                  setConfig({
                                    ...config,
                                    tailscaleHostname: name,
                                    tailscaleMagicDnsUrl: `http://${name || 'jurisflow-servidor'}.ts.net:3000`,
                                  });
                                }}
                                placeholder="jurisflow-servidor"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-slate-700 block mb-1">
                                URL Remota com DNS Mágico (ts.net)
                              </label>
                              <input
                                type="text"
                                value={config.tailscaleMagicDnsUrl || ''}
                                onChange={(e) => setConfig({ ...config, tailscaleMagicDnsUrl: e.target.value })}
                                placeholder="http://jurisflow-servidor.ts.net:3000"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-indigo-700 font-semibold"
                              />
                            </div>
                          </div>

                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>Acesso Remoto Habilitado:</strong> Com essa URL, os sócios e associados podem abrir o JurisFlow de qualquer lugar do mundo com tráfego 100% criptografado de ponta a ponta.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DIAGNÓSTICO & LOGS */}
              {activeTab === 'TEST_LOGS' && (
                <div className="space-y-4">
                  {testResult ? (
                    <div className="space-y-4">
                      {/* Status Banner */}
                      <div
                        className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                          testResult.success
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                            : 'bg-rose-50 border-rose-200 text-rose-950'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                            testResult.success ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        >
                          {testResult.success ? (
                            <CheckCircle2 className="w-6 h-6" />
                          ) : (
                            <AlertTriangle className="w-6 h-6" />
                          )}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm">
                              {testResult.success
                                ? 'Diagnóstico Concluído: Réplica DR Pronta para Contingência!'
                                : 'Falha na Validação de Conectividade do Banco DR'}
                            </h4>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/80 border border-current">
                              {testResult.latencyMs}ms de latência
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed opacity-90">{testResult.diagnosis}</p>
                        </div>
                      </div>

                      {/* Diagnostic Steps Grid */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          Etapas Verificadas de Conectividade e Integridade:
                        </span>
                        <div className="space-y-1.5">
                          {testResult.steps.map((step, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                                step.status === 'SUCCESS'
                                  ? 'bg-slate-50 border-slate-200'
                                  : 'bg-rose-50/50 border-rose-200'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                {step.status === 'SUCCESS' ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <span className="font-bold text-slate-800 block">{step.name}</span>
                                  <span className="text-slate-600 text-[11px] block">{step.message}</span>
                                </div>
                              </div>
                              {step.durationMs !== undefined && (
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                  {step.durationMs}ms
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Suggestions on Failure */}
                      {testResult.troubleshootingSuggestions && testResult.troubleshootingSuggestions.length > 0 && (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
                          <h5 className="font-bold text-amber-900 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Sugestões para Resolução do Problema:</span>
                          </h5>
                          <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px]">
                            {testResult.troubleshootingSuggestions.map((sug, idx) => (
                              <li key={idx}>{sug}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Terminal Logs Output */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-slate-500" />
                            <span>Logs do Diagnóstico de Rede & I/O</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyLogs}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1"
                          >
                            {copiedLogs ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedLogs ? 'Copiado!' : 'Copiar Logs'}</span>
                          </button>
                        </div>
                        <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-48">
                          {testResult.logs.join('\n')}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <h4 className="font-bold text-sm text-slate-800">Nenhum teste executado recentemente</h4>
                        <p className="text-xs text-slate-500">
                          Clique no botão "Testar Conexão Agora" para checar portas, permissão de gravação, usuário Master e consistência das 14 tabelas idênticas.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRunTest}
                        disabled={testing}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                      >
                        <Activity className="w-4 h-4" />
                        <span>Executar Teste de Conexão</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Credenciais e caminhos protegidos com isolamento do escritório.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
              <span>{saving ? 'Salvando...' : 'Salvar Configurações DR'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
