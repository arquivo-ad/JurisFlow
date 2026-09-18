import React, { useState } from 'react';
import {
  Wrench,
  Server,
  HardDrive,
  Terminal,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCode,
  ShieldCheck,
  Globe,
  Lock,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Loader2,
  Radio,
  Wifi,
} from 'lucide-react';
import {
  EnvironmentSetupScriptRequest,
  EnvironmentSetupScriptResponse,
  PortCheckResponse,
} from '../../types';
import { api } from '../../services/api';

interface PrepareNewEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrepareNewEnvironmentModal: React.FC<PrepareNewEnvironmentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [step, setStep] = useState<'FORM' | 'GENERATED'>('FORM');
  const [formData, setFormData] = useState<EnvironmentSetupScriptRequest>({
    os: 'WINDOWS',
    linuxDistro: 'UBUNTU_DEBIAN',
    driveLetter: 'C:',
    basePath: '',
    serverHostname: 'jurisflow-servidor',
    localPort: 8888,
    dbPort: 5432,
    dbUser: 'jurisflow_master',
    tailscaleEnabled: true,
    tailscaleHostname: 'jurisflow-servidor',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnvironmentSetupScriptResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Port test state
  const [portTesting, setPortTesting] = useState(false);
  const [portTestResult, setPortTestResult] = useState<PortCheckResponse | null>(null);

  const handleTestPort = async () => {
    const targetPort = Number(formData.localPort) || 8888;
    try {
      setPortTesting(true);
      setError(null);
      const res = await api.checkPortAvailability(targetPort, formData.serverHostname);
      setPortTestResult(res);
    } catch (err: any) {
      setPortTestResult({
        available: false,
        port: targetPort,
        status: 'ERROR',
        message: err.message || 'Falha ao comunicar com o validador de portas.',
        isHighPort: targetPort >= 8000,
        suggestedPort: 8888,
      });
    } finally {
      setPortTesting(false);
    }
  };

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await api.generateEnvironmentSetupScript(formData);
      setResult(res);
      setStep('GENERATED');
    } catch (err: any) {
      setError(err.message || 'Falha ao gerar o script de preparação.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.scriptContent) {
      navigator.clipboard.writeText(result.scriptContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyPassword = () => {
    if (result?.generatedPassword) {
      navigator.clipboard.writeText(result.generatedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2500);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.scriptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-sm">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">
                  Assistente "Preparar Ambiente Novo" (DR Local Automatizado)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold font-mono">
                  1-Click Setup Sem TI
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Criado para escritórios sem equipe de TI: gera script seguro que instala o banco e cria as 14 tabelas idênticas ao Supabase.
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'FORM' ? (
            <form onSubmit={handleGenerate} className="space-y-6">
              {/* Introduction Card */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-slate-900 block">
                    Como funciona a automação do ambiente do escritório:
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Este assistente cria um script executável que você roda diretamente no servidor do seu escritório com apenas um duplo-clique ou comando. O script baixa o banco gratuito, cria todas as <strong>14 tabelas idênticas à nuvem</strong>, salva as credenciais com chave segura na pasta <code>Secrets</code> (protegida exclusivamente para Administradores do sistema) e deixa o sistema pronto para trabalhar offline caso a internet caia.
                  </p>
                </div>
              </div>

              {/* Step 1: Operating System Choice */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  1. Qual é o Sistema Operacional do Servidor do Escritório?
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, os: 'WINDOWS', driveLetter: 'C:' })}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                      formData.os === 'WINDOWS'
                        ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        formData.os === 'WINDOWS'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      WIN
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Servidor Windows</span>
                        {formData.os === 'WINDOWS' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold">
                            Selecionado
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">
                        Windows Server 2019/2022 ou Windows 10/11 Pro no escritório. (Gera script PowerShell <code>.ps1</code>).
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, os: 'LINUX', driveLetter: '/' })}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                      formData.os === 'LINUX'
                        ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        formData.os === 'LINUX'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      LNX
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Servidor Linux</span>
                        {formData.os === 'LINUX' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold">
                            Selecionado
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">
                        Ubuntu, Debian, RHEL, CentOS, AlmaLinux ou Fedora. (Gera script Bash <code>.sh</code>).
                      </span>
                    </div>
                  </button>
                </div>

                {/* Sub-opção se for Linux */}
                {formData.os === 'LINUX' && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 animate-in fade-in">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Selecione a Distribuição Linux:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'UBUNTU_DEBIAN', label: 'Ubuntu / Debian (apt)' },
                        { id: 'RHEL_CENTOS_ALMA', label: 'RHEL / AlmaLinux (dnf)' },
                        { id: 'FEDORA', label: 'Fedora Server' },
                        { id: 'ARCH', label: 'Arch Linux (pacman)' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, linuxDistro: item.id as any })}
                          className={`p-2 rounded-xl text-xs font-medium border text-center transition-all ${
                            formData.linuxDistro === item.id
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Drive Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  2. Em Qual Disco Deseja Criar a Pasta do Sistema?
                </label>

                {formData.os === 'WINDOWS' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { drive: 'C:', label: 'Disco C: (Principal do Sistema)' },
                      { drive: 'D:', label: 'Disco D: (Partição de Dados)' },
                      { drive: 'E:', label: 'Disco E: (Storage Secundário)' },
                      { drive: 'F:', label: 'Disco F: (Outro Volume)' },
                    ].map((item) => (
                      <button
                        key={item.drive}
                        type="button"
                        onClick={() => setFormData({ ...formData, driveLetter: item.drive })}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          formData.driveLetter === item.drive
                            ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <HardDrive
                            className={`w-4 h-4 ${
                              formData.driveLetter === item.drive
                                ? 'text-indigo-600'
                                : 'text-slate-400'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-900">{item.drive}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">{item.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.basePath || '/opt/jurisflow'}
                      onChange={(e) => setFormData({ ...formData, basePath: e.target.value })}
                      placeholder="/opt/jurisflow"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      Caminho base no Linux. Será criada a pasta <code>secrets</code> com permissão restrita <code>chmod 600</code>.
                    </span>
                  </div>
                )}
              </div>

              {/* Step 3: Office Network & Tailscale */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  3. Rede do Escritório & Acesso Remoto com Tailscale
                </label>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Nome da Máquina / Hostname do Servidor
                      </label>
                      <input
                        type="text"
                        value={formData.serverHostname || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            serverHostname: e.target.value,
                            tailscaleHostname: e.target.value,
                          })
                        }
                        placeholder="jurisflow-servidor"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <span>Porta Web da Aplicação</span>
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700">
                            Alta & Exclusiva
                          </span>
                        </label>
                        <span className="text-[10px] text-slate-400">Recomendado: 8888</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            value={formData.localPort || 8888}
                            onChange={(e) => {
                              setFormData({ ...formData, localPort: Number(e.target.value) });
                              setPortTestResult(null);
                            }}
                            placeholder="8888"
                            min={1024}
                            max={65535}
                            className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-mono font-bold text-slate-800 ${
                              portTestResult?.available
                                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                                : portTestResult?.status === 'OCCUPIED'
                                ? 'border-rose-500 ring-2 ring-rose-500/20'
                                : 'border-slate-300 focus:border-indigo-500'
                            }`}
                          />
                          {(formData.localPort || 0) >= 8000 && (
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Porta Alta
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleTestPort}
                          disabled={portTesting || !formData.localPort}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                          title="Verifica se a porta está disponível no servidor antes de gerar o script"
                        >
                          {portTesting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                              <span>Testando...</span>
                            </>
                          ) : (
                            <>
                              <Radio className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Testar Porta</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Quick High-Port Selection Chips */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-500">Sugestões exclusivas:</span>
                        {[8888, 8889, 8088, 9443].map((port) => (
                          <button
                            key={port}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, localPort: port });
                              setPortTestResult(null);
                            }}
                            className={`px-2 py-0.5 text-[10px] font-mono rounded-lg transition-all ${
                              formData.localPort === port
                                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {port} {port === 8888 ? '★' : ''}
                          </button>
                        ))}
                      </div>

                      {/* Port Availability Live Test Results */}
                      {portTestResult && (
                        <div
                          className={`p-2.5 rounded-xl border text-xs animate-in fade-in space-y-1 ${
                            portTestResult.available
                              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
                              : portTestResult.status === 'OCCUPIED'
                              ? 'bg-rose-50/90 border-rose-300 text-rose-900'
                              : 'bg-amber-50/90 border-amber-300 text-amber-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold">
                              {portTestResult.available ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              )}
                              <span>
                                {portTestResult.available
                                  ? `Porta ${portTestResult.port} 100% Livre e Pronta!`
                                  : `Porta ${portTestResult.port} em Uso no Servidor`}
                              </span>
                            </div>
                            {portTestResult.latencyMs && (
                              <span className="text-[10px] opacity-75 font-mono">
                                {portTestResult.latencyMs}ms
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] leading-relaxed pl-5.5">
                            {portTestResult.message}
                          </p>
                          {portTestResult.warning && (
                            <p className="text-[10px] text-amber-800 bg-amber-100/60 p-1.5 rounded-lg ml-5.5 mt-1">
                              {portTestResult.warning}
                            </p>
                          )}
                          {!portTestResult.available && (
                            <div className="pt-1 pl-5.5 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, localPort: 8888 });
                                  setPortTestResult(null);
                                }}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-md"
                              >
                                Usar Porta Padrão Exclusiva 8888
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 block">
                        Ativar Tailscale com DNS Mágico (Acesso Remoto de Qualquer Lugar)
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Permite que advogados acessem o servidor do escritório de casa ou fóruns sem abrir portas no roteador.
                      </span>
                    </div>

                    <input
                      type="checkbox"
                      checked={formData.tailscaleEnabled}
                      onChange={(e) => setFormData({ ...formData, tailscaleEnabled: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  <Wrench className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Gerando Script de Instalação...' : 'Gerar Script de Preparação'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: SCRIPT GENERATED VIEW */
            <div className="space-y-5 animate-in fade-in">
              {/* Success Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-emerald-900">
                    Script de Preparação Gerado com Êxito! ({result?.fileName})
                  </h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Instalação automatizada para <strong>{result?.os}</strong> no diretório{' '}
                    <code>{result?.installationPath}</code> com senha segura salva em{' '}
                    <code>{result?.secretsPath}</code>.
                  </p>
                </div>
              </div>

              {/* Senha Gerada & Pasta Secrets */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Credencial Master Gerada com Segurança Restrita:
                    </span>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 font-mono text-slate-700">
                    Acesso exclusivo: Administradores/root
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={result?.generatedPassword || ''}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-indigo-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPassword ? 'Copiada!' : 'Copiar Senha'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Esta senha foi gravada no arquivo <code>database_credentials.txt</code> dentro da pasta Secrets protegida por ICACLS (Windows) / chmod 600 (Linux).
                </p>
              </div>

              {/* Instructions List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Instruções para Execução no Servidor do Escritório:
                </span>
                <div className="space-y-1.5">
                  {result?.instructions.map((inst, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>{inst}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Preview & Actions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {result?.fileName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copiado para a Área de Transferência!' : 'Copiar Script'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Arquivo ({result?.fileName})</span>
                    </button>
                  </div>
                </div>

                <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-56">
                  {result?.scriptContent}
                </pre>
              </div>

              {/* Notice about Desktop error log */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Tratamento de Exceções Automatizado:</strong> Caso ocorra qualquer erro durante a execução, o script gerará automaticamente um arquivo <code>JurisFlow_Install_Error.log</code> na Área de Trabalho (Desktop) do servidor com o rastreamento completo para encaminhar ao suporte técnico.
                </span>
              </div>

              {/* Footer buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  Voltar e Alterar Opções
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Concluir e Fechar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
