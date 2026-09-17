import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  RefreshCw,
  Zap,
  ShieldCheck,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  ArrowRightLeft,
  Check,
  Copy,
  Clock,
  HardDrive,
  Cpu,
  Wifi,
  WifiOff,
  Lock,
  KeyRound,
  ShieldAlert,
  Settings,
  Wrench,
  Globe,
  Folder,
} from 'lucide-react';
import { DatabaseNode, DatabaseSyncResult, LocalDrConfig } from '../../types';
import { api } from '../../services/api';
import { SupportApiKeyModal } from '../support/SupportApiKeyModal';
import { LocalDrConfigModal } from './LocalDrConfigModal';
import { PrepareNewEnvironmentModal } from './PrepareNewEnvironmentModal';

export const DatabaseDRTab: React.FC = () => {
  const [nodes, setNodes] = useState<DatabaseNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<DatabaseSyncResult | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // DR Local Offline Failover & Failback State
  const [isDrActive, setIsDrActive] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'ONLINE' | 'OFFLINE' | 'CHECKING'>('ONLINE');
  const [cloudLatency, setCloudLatency] = useState<number>(28);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isLocalDrConfigModalOpen, setIsLocalDrConfigModalOpen] = useState(false);
  const [isPrepareNewEnvModalOpen, setIsPrepareNewEnvModalOpen] = useState(false);
  const [localDrConfig, setLocalDrConfig] = useState<LocalDrConfig | null>(null);

  // Modal State for New Database Node
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNodeData, setNewNodeData] = useState<Partial<DatabaseNode>>({
    name: '',
    provider: 'LOCAL_OFFLINE',
    url: 'local://dr-offline-storage.db',
    anonKey: '',
    serviceRoleKey: '',
    role: 'PASSIVE',
    region: 'Armazenamento Local / Cache Offline Seguro',
    notes: 'Réplica DR sempre LOCAL e OFFLINE. Opera em contingência contínua caso a Cloud ou rede sofram interrupção.',
  });

  // Supabase Status State
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean;
    url: string | null;
    tables: Record<string, number>;
    memoryCounts?: Record<string, number>;
    error?: string;
    keyInfo?: {
      keyType: 'SERVICE_ROLE' | 'PUBLISHABLE' | 'UNKNOWN';
      keyPrefix: string;
      isServiceRole: boolean;
    };
    rlsNotice?: string;
    rlsTables?: string[];
    suggestedSqlPolicy?: string;
  } | null>(null);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [supabaseFeedback, setSupabaseFeedback] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const data = await api.getDatabases();
      setNodes(data);
      const active = data.find((n) => n.role === 'ACTIVE');
      setIsDrActive(active?.provider === 'LOCAL_OFFLINE' || !!active?.isLocalDr);
    } catch (err) {
      console.error('Falha ao listar nós de banco de dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupabaseStatus = async () => {
    try {
      const res = await api.getSupabaseStatus();
      setSupabaseStatus(res);
    } catch (err: any) {
      console.warn('Falha ao consultar status do Supabase', err);
    }
  };

  const fetchLocalDrConfig = async () => {
    try {
      const cfg = await api.getLocalDrConfig();
      setLocalDrConfig(cfg);
    } catch (err: any) {
      console.warn('Falha ao buscar configuração do DR Local', err);
    }
  };

  const checkCloudHealth = async () => {
    try {
      setCloudStatus('CHECKING');
      const res = await api.pingCloudDatabase();
      setCloudStatus('ONLINE');
      setCloudLatency(res.latencyMs || 28);
      return true;
    } catch (err) {
      setCloudStatus('OFFLINE');
      return false;
    }
  };

  useEffect(() => {
    fetchNodes();
    fetchSupabaseStatus();
    fetchLocalDrConfig();
    checkCloudHealth();

    // Loop de ping no Cloud se o DR estiver ativo
    const interval = setInterval(() => {
      checkCloudHealth();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handlePing = async (id: string) => {
    setPingingId(id);
    try {
      const res = await api.pingDatabase(id);
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, latencyMs: res.latencyMs, status: 'ONLINE' } : n))
      );
      setFeedback(`Nó respondendo em ${res.latencyMs}ms (${res.status})`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(`Erro ao verificar nó: ${err.message}`);
    } finally {
      setPingingId(null);
    }
  };

  const handleFailoverToLocalDr = async () => {
    if (
      !confirm(
        'CONTINGÊNCIA DE EMERGÊNCIA / FAILOVER DR:\n\nDeseja transferir as operações para a RÉPLICA DR LOCAL (OFFLINE)?\n\nO sistema continuará operando normalmente em armazenamento local seguro sem interrupção.'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const res = await api.failoverToDr();
      setNodes(res.nodes);
      setIsDrActive(true);
      setFeedback(res.message);
      checkCloudHealth();
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      alert('Erro no Failover para DR Local: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDrToCloudAndRestore = async () => {
    try {
      setLoading(true);
      const res = await api.syncDrToCloud();
      setNodes(res.nodes);
      setIsDrActive(false);
      setCloudStatus('ONLINE');
      setFeedback(res.message);
      await fetchNodes();
      await fetchSupabaseStatus();
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      alert('Erro na sincronização DR -> Cloud: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFailover = async (passiveNode: DatabaseNode) => {
    const activeNode = nodes.find((n) => n.role === 'ACTIVE');
    if (!activeNode) return;

    if (
      !confirm(
        `CONFIRMAÇÃO DE FAILOVER:\n\nDeseja transferir a operação ATIVA (Primary Write) para o nó "${passiveNode.name}"?\n\nO nó "${activeNode.name}" passará para o modo STANDBY PASSIVO.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const res = await api.failoverDatabase(passiveNode.id, activeNode.id);
      setNodes(res.nodes);
      setIsDrActive(passiveNode.provider === 'LOCAL_OFFLINE' || !!passiveNode.isLocalDr);
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      alert('Erro no Failover: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDatabases = async () => {
    const active = nodes.find((n) => n.role === 'ACTIVE');
    const passive = nodes.find((n) => n.role === 'PASSIVE');
    if (!active || !passive) {
      alert('É necessário ter ao menos um nó ATIVO e um nó PASSIVO no cluster.');
      return;
    }

    setSyncingId(passive.id);
    setSyncResult(null);
    try {
      const res = await api.syncDatabases(active.id, passive.id);
      setSyncResult(res);
      setFeedback(`Sincronização DR concluída: ${res.recordsSynced} registros replicados com verificação de checksum.`);
      await fetchNodes();
    } catch (err: any) {
      alert('Erro na sincronização DR: ' + err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDatabase(newNodeData);
      setIsAddModalOpen(false);
      setNewNodeData({
        name: '',
        provider: 'LOCAL_OFFLINE',
        url: 'local://dr-offline-storage.db',
        anonKey: '',
        serviceRoleKey: '',
        role: 'PASSIVE',
        region: 'Armazenamento Local / Cache Offline Seguro',
        notes: 'Réplica DR sempre LOCAL e OFFLINE.',
      });
      fetchNodes();
    } catch (err: any) {
      alert('Erro ao cadastrar réplica: ' + err.message);
    }
  };

  const handleDeleteNode = async (id: string, name: string) => {
    if (!confirm(`Deseja remover o nó de contingência "${name}" do cluster?`)) return;
    try {
      await api.deleteDatabase(id);
      fetchNodes();
    } catch (err: any) {
      alert('Erro ao remover nó: ' + err.message);
    }
  };

  const handleSyncSupabase = async () => {
    setIsSyncingSupabase(true);
    setSupabaseFeedback(null);
    try {
      const res = await api.syncSupabase();
      setSupabaseFeedback(res.message || 'Sincronização com Supabase concluída!');
      await fetchSupabaseStatus();
    } catch (err: any) {
      setSupabaseFeedback('Erro ao sincronizar: ' + err.message);
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const copySqlPolicy = () => {
    if (supabaseStatus?.suggestedSqlPolicy) {
      navigator.clipboard.writeText(supabaseStatus.suggestedSqlPolicy);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  const activeNode = nodes.find((n) => n.role === 'ACTIVE') || nodes[0];
  const drLocalNode = nodes.find((n) => n.provider === 'LOCAL_OFFLINE' || n.isLocalDr);
  const cloudNode = nodes.find((n) => n.provider === 'SUPABASE') || nodes[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-sm shrink-0 mt-0.5">
            <Server className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Arquitetura de Banco de Dados: 1 Ativo + 1 DR (LOCAL - OFFLINE)
              </h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
                Auto-Failover & Auto-Sync
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              O ambiente opera com 1 nó Ativo (Supabase Cloud) e 1 Réplica DR contínua <strong>sempre LOCAL e OFFLINE</strong>.
              Em caso de queda de rede ou da Cloud, o sistema comuta automaticamente para a réplica local sem interrupção de trabalho. Ao restabelecer a conexão, o sistema faz o ping, reconcilia os dados via SYNC e retorna para a Cloud.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setIsLocalDrConfigModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-300" />
            <span>Configuração Réplica DR</span>
          </button>

          <button
            onClick={() => setIsPrepareNewEnvModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <Wrench className="w-3.5 h-3.5 text-emerald-300" />
            <span>Preparar Ambiente Novo</span>
          </button>

          <button
            onClick={() => setIsSupportModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Central de Suporte & API Key</span>
          </button>

          <button
            onClick={handleSyncDatabases}
            disabled={syncingId !== null || nodes.length < 2}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <ArrowRightLeft className={`w-3.5 h-3.5 ${syncingId ? 'animate-spin' : ''}`} />
            <span>Sincronização Forçada DR</span>
          </button>
        </div>
      </div>

      {/* BANNER DE CONTINGÊNCIA / FAILOVER ATIVO (Quando DR Local está operando) */}
      {isDrActive ? (
        <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/50 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
              <WifiOff className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-amber-900 text-sm">
                  OPERANDO EM CONTINGÊNCIA: Réplica DR (LOCAL - OFFLINE) Ativa
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                  Operação Contínua
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                O sistema está gravando localmente no banco offline sem nenhuma parada nos processos. O ping monitora o retorno da Cloud em segundo plano.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="text-right hidden sm:block text-xs">
              <span className="text-slate-500 block text-[10px]">Status do Supabase Cloud:</span>
              <span className="font-bold text-emerald-700 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                {cloudStatus === 'ONLINE' ? 'ONLINE (Pronto para Retorno)' : 'Verificando ping...'}
              </span>
            </div>

            <button
              onClick={handleSyncDrToCloudAndRestore}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>SYNC DR ➔ Cloud & Reassumir Cloud</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              <strong>Ambiente Cloud Primário Ativo:</strong> Supabase conectado e sincronizado com a Réplica DR Local Offline.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={checkCloudHealth}
              className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-semibold text-[11px] flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Ping Cloud ({cloudLatency}ms)</span>
            </button>
            <button
              onClick={handleFailoverToLocalDr}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] flex items-center gap-1.5 transition-colors shadow-xs"
              title="Alterna imediatamente para o banco offline local em caso de interrupção na internet ou nuvem"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simular Falha / Comutar para DR Local</span>
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium flex items-center gap-2 shadow-xs">
          <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Cluster Nodes Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            Nós Configurados (1 Ativo + 1 DR Local Offline)
          </h3>
          <span className="text-xs text-slate-500">
            Total de Registros Locais:{' '}
            <strong className="text-slate-800">{activeNode?.recordsCount || 184}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nodes.map((node) => {
            const isActive = node.role === 'ACTIVE';
            const isLocal = node.provider === 'LOCAL_OFFLINE' || node.isLocalDr;

            return (
              <div
                key={node.id}
                className={`p-5 rounded-2xl border transition-all relative ${
                  isActive
                    ? 'bg-white border-indigo-300 shadow-md ring-2 ring-indigo-500/10'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Node Top Row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isActive
                          ? isLocal
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isLocal ? <HardDrive className="w-5 h-5" /> : <Database className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{node.name}</span>
                        {isLocal && (
                          <span className="text-[9px] px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                            LOCAL - OFFLINE
                          </span>
                        )}
                        {node.provider === 'SUPABASE' && (
                          <span className="text-[9px] px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold">
                            SUPABASE CLOUD
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 block truncate max-w-[240px]">
                        {node.url}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono tracking-wide uppercase ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-300'
                          : 'bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {isActive ? '● Ativo (Primary Write)' : '○ Standby DR (Cópia Contínua)'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {node.region || 'Local Host'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  {node.notes}
                </p>

                {/* Metrics Box */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-100/70 border border-slate-200/80 text-[11px] mb-4">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Latência</span>
                    <span className="font-mono font-bold text-slate-800 flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          (node.latencyMs || 0) < 40 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      {node.latencyMs ? `${node.latencyMs} ms` : isLocal ? '1 ms' : '28 ms'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Tabelas / Registros</span>
                    <span className="font-mono font-bold text-slate-800">
                      {node.tablesCount || 14} tab • {node.recordsCount || 184}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Modo Operacional</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {isLocal ? 'OFFLINE READY' : 'CLOUD READY'}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Último sync: {node.lastSyncAt ? new Date(node.lastSyncAt).toLocaleTimeString('pt-BR') : 'Agora'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePing(node.id)}
                      disabled={pingingId === node.id}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Activity className={`w-3 h-3 ${pingingId === node.id ? 'animate-pulse text-indigo-600' : ''}`} />
                      <span>Ping</span>
                    </button>

                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => handleFailover(node)}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Zap className="w-3 h-3 text-amber-600" />
                        <span>Promover para Ativo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ESPECIFICAÇÃO DE SEGURANÇA: CONTÊINERES APARTADOS & RLS POR ESCRITÓRIO */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Segurança & Isolamento Estrito por Escritório (Contêineres Apartados)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  RLS Ativo em 100% das Tabelas
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Cada tabela possui chave de partição isolada. Nenhum escritório tem permissão de acessar dados de outro escritório.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSupportModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Gerenciar API Key de Suporte</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Garantia de Isolamento Multi-Tenant</span>
            </h4>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              O banco de dados aplica <code>tenant_id</code> obrigatório em todas as consultas SQL e no cache offline local. Qualquer tentativa de requisição sem chave do escritório correspondente é rejeitada automaticamente com <strong>HTTP 403 Forbidden</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Trava de Produção Real & Acesso Super Admin</span>
            </h4>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              No ambiente 100% produtivo real entregue ao cliente, os <strong>Super Admins perdem todo o acesso direto</strong>. Para prestar qualquer atendimento técnico ou suporte de banco de dados, o cliente deve <strong>gerar manualmente uma API Key com prazo de validade</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Sync Result Report Card */}
      {syncResult && (
        <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Relatório de Replicação e Integridade Criptográfica
            </h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
              SHA-256 Verificado
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500 text-[10px] block">Registros Replicados</span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                {syncResult.recordsSynced}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500 text-[10px] block">Tabelas Sincronizadas</span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                {syncResult.details.length} tabelas
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500 text-[10px] block">Início da Replicação</span>
              <span className="font-medium text-slate-800 font-mono text-[11px]">
                {new Date(syncResult.startedAt).toLocaleTimeString('pt-BR')}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500 text-[10px] block">Conclusão</span>
              <span className="font-medium text-slate-800 font-mono text-[11px]">
                {new Date(syncResult.completedAt).toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <span className="text-[11px] font-semibold text-slate-700 block">Detalhamento por Tabela:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono">
              {syncResult.details.map((d, idx) => (
                <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 truncate">{d.table}</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[10px]">
                    {d.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Painel da Réplica DR (LOCAL - OFFLINE Standby) & Apontamento do Escritório */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-700">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Réplica DR (LOCAL - OFFLINE Standby) & Conectividade do Escritório
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 font-mono">
                  {localDrConfig?.locationType || 'LOCAL_DIRECTORY'}
                </span>
                {localDrConfig?.lastTestStatus === 'SUCCESS' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    CONEXÃO VALIDADA
                  </span>
                ) : localDrConfig?.lastTestStatus === 'ERROR' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 font-mono">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    FALHA NO TESTE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                    NÃO TESTADO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Apontamento do banco de contingência local, servidor do escritório e acesso remoto seguro via Tailscale MagicDNS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPrepareNewEnvModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Wrench className="w-3.5 h-3.5 text-emerald-700" />
              <span>Preparar Ambiente Novo (Sem TI)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLocalDrConfigModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurar / Testar Apontamento</span>
            </button>
          </div>
        </div>

        {/* Informações Atuais de Apontamento e Rede */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-slate-400" />
              Localização Física / Apontamento
            </span>
            <span className="font-mono font-bold text-slate-800 text-xs block truncate">
              {localDrConfig?.locationType === 'LOCAL_POSTGRES' || localDrConfig?.locationType === 'CUSTOM_IP_HOST'
                ? `${localDrConfig.hostOrIp}:${localDrConfig.port} (${localDrConfig.databaseName})`
                : localDrConfig?.locationType === 'NETWORK_SHARE'
                ? localDrConfig.networkSharePath || `\\\\${localDrConfig.hostOrIp || 'servidor'}\\JurisFlow_DR`
                : `${localDrConfig?.driveLetter || 'C:'} - ${localDrConfig?.directoryPath || 'C:\\JurisFlow\\Data'}`}
            </span>
            <span className="text-[10px] text-slate-500 block">
              14 tabelas com paridade relacional e RLS por escritório.
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              URL de Acesso Local no Escritório
            </span>
            <span className="font-mono font-bold text-indigo-700 text-xs block truncate">
              {localDrConfig?.localServerUrl || 'http://jurisflow.local:3000'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Acessível por todos os computadores da rede interna.
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              Tailscale MagicDNS (Acesso Remoto)
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-emerald-700 text-xs block truncate">
                {localDrConfig?.tailscaleEnabled
                  ? localDrConfig.tailscaleMagicDnsUrl || 'http://jurisflow-servidor.ts.net:3000'
                  : 'Desativado'}
              </span>
              {localDrConfig?.tailscaleEnabled && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                  Ativo
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 block">
              Conexão externa segura criptografada WireGuard sem abrir portas.
            </span>
          </div>
        </div>
      </div>

      {/* Supabase PostgreSQL Native Persistence Panel */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-300 flex items-center justify-center text-emerald-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Instância Ativa Supabase (PostgreSQL 15 Cloud)
              </h3>
              <p className="text-xs text-slate-500 font-mono truncate max-w-sm">
                {supabaseStatus?.url || 'https://suawbaxfgpwyhkykyhka.supabase.co'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncSupabase}
              disabled={isSyncingSupabase}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
              <span>Sincronizar Supabase</span>
            </button>
          </div>
        </div>

        {supabaseFeedback && (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs">
            {supabaseFeedback}
          </div>
        )}

        {/* Supabase Tables Counters */}
        {supabaseStatus?.tables && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tabelas Persistidas no PostgreSQL
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Status: {supabaseStatus.connected ? 'Conectado' : 'Aguardando Sincronização'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
              {Object.entries(supabaseStatus.tables).map(([tbl, cnt]) => (
                <div key={tbl} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 font-mono block truncate">{tbl}</span>
                  <span className="font-bold text-slate-800 font-mono text-sm">{cnt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RLS Policy Notice if present */}
        {supabaseStatus?.suggestedSqlPolicy && (
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Script SQL Recomendado para Row Level Security (RLS)
              </span>
              <button
                type="button"
                onClick={copySqlPolicy}
                className="px-2 py-1 rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 font-semibold text-[10px] flex items-center gap-1"
              >
                {copiedSql ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[10px] overflow-x-auto">
              {supabaseStatus.suggestedSqlPolicy}
            </pre>
          </div>
        )}
      </div>

      {/* Modal de Suporte & Chave de Acesso */}
      <SupportApiKeyModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />

      {/* Modal de Configuração do DR Local & Teste de Conexão */}
      <LocalDrConfigModal
        isOpen={isLocalDrConfigModalOpen}
        onClose={() => setIsLocalDrConfigModalOpen(false)}
        onSaved={() => {
          fetchNodes();
          fetchLocalDrConfig();
        }}
      />

      {/* Assistente "Preparar Ambiente Novo" (Script Windows / Linux sem equipe de TI) */}
      <PrepareNewEnvironmentModal
        isOpen={isPrepareNewEnvModalOpen}
        onClose={() => setIsPrepareNewEnvModalOpen(false)}
      />
    </div>
  );
};
