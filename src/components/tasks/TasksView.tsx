import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Kanban,
  List,
  Clock,
  AlertTriangle,
  User,
  Scale,
  Calendar,
  Tag,
  CheckCircle2,
  Circle,
  MoreVertical,
  Trash2,
  Edit2,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Building2,
  Paperclip,
  CheckCheck,
  FileText,
  Briefcase,
  Layers,
  GripVertical,
  Play,
  Pause,
  RotateCcw,
  Hourglass,
  DollarSign,
  Send,
  ExternalLink,
} from 'lucide-react';
import {
  Task,
  TaskCategory,
  TaskChecklistItem,
  TaskTimeLog,
  User as UserType,
  Case,
  Client,
  Role,
  Deadline,
} from '../../types';
import { api } from '../../services/api';

interface TasksViewProps {
  tasks: Task[];
  users: UserType[];
  cases: Case[];
  clients: (Client & { person?: { name: string } })[];
  deadlines?: Deadline[];
  currentUser: UserType | null;
  currentRole?: Role | null;
  onRefresh: () => void;
  onShowToast: (msg: string) => void;
  onOpenAiGateway?: (tab: string, prompt?: string) => void;
  onNavigateToCase?: (caseId: string) => void;
}

const CATEGORY_MAP: Record<TaskCategory, { label: string; color: string; bg: string; border: string }> = {
  PETICAO: { label: 'Petição & Minuta', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  PESQUISA: { label: 'Pesquisa Jurídica', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
  REUNIAO: { label: 'Reunião & Alinhamento', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  DILIGENCIA: { label: 'Diligência & Fórum', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  FINANCEIRO: { label: 'Financeiro & Honorários', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  CONTRATO: { label: 'Contratos & Procurações', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  GERAL: { label: 'Geral & Escritório', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
};

const PRIORITY_MAP: Record<Task['priority'], { label: string; color: string; bg: string; dot: string }> = {
  LOW: { label: 'Baixa', color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400' },
  MEDIUM: { label: 'Média', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  HIGH: { label: 'Alta', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  URGENT: { label: 'Urgente', color: 'text-rose-700', bg: 'bg-rose-50', dot: 'bg-rose-600' },
};

const STATUS_COLUMNS: { id: Task['status']; title: string; color: string; borderTop: string; badgeBg: string }[] = [
  { id: 'TODO', title: 'A Fazer', color: 'text-slate-700', borderTop: 'border-t-slate-400', badgeBg: 'bg-slate-100 text-slate-700' },
  { id: 'IN_PROGRESS', title: 'Em Execução', color: 'text-blue-700', borderTop: 'border-t-blue-500', badgeBg: 'bg-blue-100 text-blue-800' },
  { id: 'REVIEW', title: 'Em Revisão', color: 'text-amber-700', borderTop: 'border-t-amber-500', badgeBg: 'bg-amber-100 text-amber-800' },
  { id: 'DONE', title: 'Concluído', color: 'text-emerald-700', borderTop: 'border-t-emerald-500', badgeBg: 'bg-emerald-100 text-emerald-800' },
];

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  users,
  cases,
  clients,
  deadlines = [],
  currentUser,
  currentRole,
  onRefresh,
  onShowToast,
  onOpenAiGateway,
  onNavigateToCase,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('ALL');
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);

  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<Task['status'] | null>(null);

  // Active Timer / Stopwatch State for Timesheet
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Modal States
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timesheet Quick Log State in Modal
  const [logMinutes, setLogMinutes] = useState(30);
  const [logNote, setLogNote] = useState('');
  const [logBillable, setLogBillable] = useState(true);
  const [isLoggingTime, setIsLoggingTime] = useState(false);

  // New/Edit Form State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<TaskCategory>('PETICAO');
  const [formPriority, setFormPriority] = useState<Task['priority']>('MEDIUM');
  const [formDueDate, setFormDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formAssignedUserId, setFormAssignedUserId] = useState(() => currentUser?.id || '');
  const [formCaseId, setFormCaseId] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formDeadlineId, setFormDeadlineId] = useState('');
  const [formEstimatedMinutes, setFormEstimatedMinutes] = useState(60);
  const [formTags, setFormTags] = useState<string>('');
  const [formChecklist, setFormChecklist] = useState<TaskChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Active Timer Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && activeTimerTaskId) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, activeTimerTaskId]);

  const handleStartTimer = (taskId: string) => {
    if (activeTimerTaskId === taskId) {
      setIsTimerRunning(true);
    } else {
      setActiveTimerTaskId(taskId);
      setTimerSeconds(0);
      setIsTimerRunning(true);
    }
    onShowToast('Cronômetro iniciado para a tarefa selecionada.');
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleSaveTimerLog = async (task: Task) => {
    const minutes = Math.max(1, Math.round(timerSeconds / 60));
    try {
      await api.logTaskTime(task.id, {
        minutes,
        note: 'Apontamento via cronômetro em tempo real',
        billable: true,
      });
      setIsTimerRunning(false);
      setActiveTimerTaskId(null);
      setTimerSeconds(0);
      onShowToast(`Registrado ${minutes} min no timesheet com sucesso!`);
      onRefresh();
    } catch (err) {
      onShowToast('Erro ao salvar apontamento de horas.');
    }
  };

  const handleQuickTimeLog = async (taskId: string) => {
    if (!logMinutes || logMinutes <= 0) return;
    setIsLoggingTime(true);
    try {
      const updated = await api.logTaskTime(taskId, {
        minutes: Number(logMinutes),
        note: logNote || 'Apontamento operacional',
        billable: logBillable,
      });
      onShowToast(`Apontamento de ${logMinutes} minutos lançado com sucesso!`);
      setLogNote('');
      setLogMinutes(30);
      if (selectedTaskDetail && selectedTaskDetail.id === taskId) {
        setSelectedTaskDetail(updated);
      }
      onRefresh();
    } catch (err) {
      onShowToast('Falha ao registrar horas no timesheet.');
    } finally {
      setIsLoggingTime(false);
    }
  };

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = (task.description || '').toLowerCase().includes(q);
        const matchCase = (task.caseNumber || '').toLowerCase().includes(q) || (task.caseTitle || '').toLowerCase().includes(q);
        const matchClient = (task.clientName || '').toLowerCase().includes(q);
        const matchDeadline = (task.deadlineTitle || '').toLowerCase().includes(q);
        const matchTags = (task.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchCase && !matchClient && !matchDeadline && !matchTags) {
          return false;
        }
      }

      // User filter
      if (onlyMyTasks && currentUser && task.assignedUserId !== currentUser.id) {
        return false;
      }
      if (selectedUserFilter !== 'ALL' && task.assignedUserId !== selectedUserFilter) {
        return false;
      }

      // Category filter
      if (selectedCategoryFilter !== 'ALL' && task.category !== selectedCategoryFilter) {
        return false;
      }

      // Priority filter
      if (selectedPriorityFilter !== 'ALL' && task.priority !== selectedPriorityFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, onlyMyTasks, selectedUserFilter, selectedCategoryFilter, selectedPriorityFilter, currentUser]);

  // Metrics
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'TODO').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const review = tasks.filter((t) => t.status === 'REVIEW').length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const overdue = tasks.filter((t) => t.status !== 'DONE' && t.dueDate < today).length;
    const totalEstimatedHours = Math.round((tasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0) / 60) * 10) / 10;
    const totalLoggedMinutes = tasks.reduce((acc, t) => {
      const logsSum = (t.timeLogs || []).reduce((lAcc, l) => lAcc + l.minutes, 0);
      return acc + logsSum;
    }, 0);
    const totalLoggedHours = Math.round((totalLoggedMinutes / 60) * 10) / 10;

    return { total, todo, inProgress, review, done, overdue, totalEstimatedHours, totalLoggedHours };
  }, [tasks]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingTaskId(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('PETICAO');
    setFormPriority('MEDIUM');
    setFormDueDate(new Date().toISOString().split('T')[0]);
    setFormAssignedUserId(currentUser?.id || (users[0]?.id ?? ''));
    setFormCaseId('');
    setFormClientId('');
    setFormDeadlineId('');
    setFormEstimatedMinutes(60);
    setFormTags('');
    setFormChecklist([
      { id: 'chk-init-1', text: 'Analisar documentação prévia dos autos', completed: false },
      { id: 'chk-init-2', text: 'Elaborar minuta e validar jurisprudência', completed: false },
    ]);
    setIsNewTaskModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormCategory(task.category || 'GERAL');
    setFormPriority(task.priority);
    setFormDueDate(task.dueDate || new Date().toISOString().split('T')[0]);
    setFormAssignedUserId(task.assignedUserId);
    setFormCaseId(task.caseId || '');
    setFormClientId(task.clientId || '');
    setFormDeadlineId(task.deadlineId || '');
    setFormEstimatedMinutes(task.estimatedMinutes || 60);
    setFormTags((task.tags || []).join(', '));
    setFormChecklist(task.checklist || []);
    setIsNewTaskModalOpen(true);
  };

  // Save Task (Create or Update)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      onShowToast('O título da tarefa é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const selectedDeadline = deadlines.find((d) => d.id === formDeadlineId);

      const payload: Partial<Task> = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory,
        priority: formPriority,
        dueDate: formDueDate,
        assignedUserId: formAssignedUserId,
        caseId: formCaseId || selectedDeadline?.caseId || undefined,
        clientId: formClientId || undefined,
        deadlineId: formDeadlineId || undefined,
        deadlineTitle: selectedDeadline?.title,
        deadlineFatalDate: selectedDeadline?.dueDate || selectedDeadline?.fatalDate,
        estimatedMinutes: Number(formEstimatedMinutes) || 30,
        tags: parsedTags,
        checklist: formChecklist,
      };

      if (editingTaskId) {
        await api.updateTask(editingTaskId, payload);
        onShowToast('Tarefa atualizada com sucesso!');
      } else {
        await api.createTask(payload);
        onShowToast('Nova tarefa cadastrada com sucesso!');
      }

      setIsNewTaskModalOpen(false);
      if (selectedTaskDetail && editingTaskId === selectedTaskDetail.id) {
        setSelectedTaskDetail(null);
      }
      onRefresh();
    } catch (err: any) {
      console.error(err);
      onShowToast(`Erro ao salvar tarefa: ${err?.message || 'Falha na requisição'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Transition
  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await api.updateTask(taskId, { status: newStatus });
      onShowToast(`Status alterado para ${STATUS_COLUMNS.find((c) => c.id === newStatus)?.title}`);
      onRefresh();
      if (selectedTaskDetail && selectedTaskDetail.id === taskId) {
        setSelectedTaskDetail({
          ...selectedTaskDetail,
          status: newStatus,
          completedAt: newStatus === 'DONE' ? new Date().toISOString() : undefined,
        });
      }
    } catch (err: any) {
      onShowToast('Falha ao atualizar status da tarefa.');
    }
  };

  // Toggle Checklist Item
  const handleToggleChecklist = async (task: Task, itemId: string) => {
    const updatedChecklist = (task.checklist || []).map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    // Auto update status to DONE if all checklist items completed
    const allCompleted = updatedChecklist.length > 0 && updatedChecklist.every((i) => i.completed);

    try {
      const payload: Partial<Task> = {
        checklist: updatedChecklist,
      };
      if (allCompleted && task.status !== 'DONE') {
        payload.status = 'DONE';
      }

      await api.updateTask(task.id, payload);
      onRefresh();

      if (selectedTaskDetail && selectedTaskDetail.id === task.id) {
        setSelectedTaskDetail({
          ...selectedTaskDetail,
          checklist: updatedChecklist,
          status: allCompleted ? 'DONE' : selectedTaskDetail.status,
        });
      }
    } catch (err) {
      onShowToast('Erro ao atualizar item do checklist.');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
      await api.deleteTask(taskId);
      onShowToast('Tarefa excluída com sucesso.');
      if (selectedTaskDetail?.id === taskId) {
        setSelectedTaskDetail(null);
      }
      onRefresh();
    } catch (err) {
      onShowToast('Erro ao excluir tarefa.');
    }
  };

  // Add item to checklist form
  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setFormChecklist([
      ...formChecklist,
      {
        id: `chk-${Date.now()}`,
        text: newChecklistText.trim(),
        completed: false,
      },
    ]);
    setNewChecklistText('');
  };

  // Remove item from checklist form
  const handleRemoveChecklistItem = (id: string) => {
    setFormChecklist(formChecklist.filter((i) => i.id !== id));
  };

  // Helper formatting seconds
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div id="tasks-view" className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tarefas & Fluxo Operacional</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Gestão visual Kanban com animações fluidas, prazos processuais vinculados, checklists técnicos e timesheet integrado.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Timer Sticky Widget */}
          {activeTimerTaskId && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg shadow-2xs text-xs font-semibold text-amber-900 animate-pulse">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Timer: {formatTimer(timerSeconds)}</span>
              {isTimerRunning ? (
                <button
                  onClick={handlePauseTimer}
                  className="p-1 hover:bg-amber-200 rounded text-amber-800 transition-colors"
                  title="Pausar Timer"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setIsTimerRunning(true)}
                  className="p-1 hover:bg-amber-200 rounded text-amber-800 transition-colors"
                  title="Retomar Timer"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => {
                  const task = tasks.find((t) => t.id === activeTimerTaskId);
                  if (task) handleSaveTimerLog(task);
                }}
                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold"
              >
                Salvar Horas
              </button>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              id="tasks-btn-kanban-view"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              id="tasks-btn-list-view"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
          </div>

          <button
            id="tasks-btn-new-task"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Total de Tarefas</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{metrics.total}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">A Fazer</span>
          <div className="text-xl font-bold text-slate-700 mt-1">{metrics.todo}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-blue-600">Em Execução</span>
          <div className="text-xl font-bold text-blue-700 mt-1">{metrics.inProgress}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-amber-600">Em Revisão</span>
          <div className="text-xl font-bold text-amber-700 mt-1">{metrics.review}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-emerald-600">Concluídas</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">{metrics.done}</div>
        </div>

        <div className={`p-3.5 rounded-xl border shadow-2xs ${metrics.overdue > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${metrics.overdue > 0 ? 'text-rose-700' : 'text-slate-500'}`}>Atrasadas</span>
            <span className="text-[11px] font-medium text-slate-500">{metrics.totalLoggedHours}h apontadas</span>
          </div>
          <div className={`text-xl font-bold mt-1 ${metrics.overdue > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{metrics.overdue}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="tasks-input-search"
              type="text"
              placeholder="Buscar por título, número de processo, cliente, prazo fatal ou tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* My Tasks Toggle */}
            <button
              id="tasks-btn-filter-mine"
              onClick={() => setOnlyMyTasks(!onlyMyTasks)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                onlyMyTasks
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Minhas Tarefas
            </button>

            {/* User Filter */}
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Todos os Responsáveis</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Todas as Categorias</option>
              {Object.entries(CATEGORY_MAP).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Todas as Prioridades</option>
              <option value="URGENT">Urgente</option>
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Média</option>
              <option value="LOW">Baixa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main View: KANBAN BOARD WITH MOTION ANIMATIONS */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {STATUS_COLUMNS.map((column) => {
            const columnTasks = filteredTasks.filter((t) => t.status === column.id);
            const isColumnTarget = dragOverColumnId === column.id;

            return (
              <motion.div
                key={column.id}
                layout
                id={`kanban-col-${column.id.toLowerCase()}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDragEnter={() => setDragOverColumnId(column.id)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (dragOverColumnId === column.id) setDragOverColumnId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverColumnId(null);
                  const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                  if (taskId) {
                    const task = tasks.find((t) => t.id === taskId);
                    if (task && task.status !== column.id) {
                      handleStatusChange(taskId, column.id);
                    }
                  }
                  setDraggedTaskId(null);
                }}
                className={`rounded-xl border transition-colors duration-200 flex flex-col min-h-[560px] shadow-2xs ${
                  isColumnTarget
                    ? 'bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-200/80 shadow-md'
                    : 'bg-slate-50/80 border-slate-200'
                }`}
              >
                {/* Column Header */}
                <div className={`p-3.5 bg-white rounded-t-xl border-b border-slate-200 border-t-4 ${column.borderTop} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold text-sm ${column.color}`}>{column.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${column.badgeBg}`}>
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleOpenCreate();
                      setFormPriority(column.id === 'TODO' ? 'MEDIUM' : 'HIGH');
                    }}
                    className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition-colors"
                    title="Adicionar nesta coluna"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Cards Container */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[740px]">
                  {/* Drop zone placeholder indicator when dragging over column */}
                  <AnimatePresence>
                    {isColumnTarget && draggedTaskId && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, height: 0 }}
                        animate={{ opacity: 1, scale: 1, height: 'auto' }}
                        exit={{ opacity: 0, scale: 0.95, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="p-3 border-2 border-dashed border-indigo-400 bg-indigo-50 rounded-lg text-center text-xs font-semibold text-indigo-700 flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <span>Soltar aqui para mover para {column.title}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {columnTasks.length === 0 && !isColumnTarget ? (
                    <div className="py-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                      Nenhuma tarefa nesta etapa
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {columnTasks.map((task) => {
                        const cat = CATEGORY_MAP[task.category || 'GERAL'];
                        const prio = PRIORITY_MAP[task.priority];
                        const totalCheck = task.checklist?.length || 0;
                        const doneCheck = task.checklist?.filter((c) => c.completed).length || 0;
                        const isOverdue = task.status !== 'DONE' && task.dueDate < new Date().toISOString().split('T')[0];
                        const isBeingDragged = draggedTaskId === task.id;
                        const isTimerActiveForThis = activeTimerTaskId === task.id && isTimerRunning;
                        const loggedMinutes = (task.timeLogs || []).reduce((acc, l) => acc + l.minutes, 0);

                        return (
                          <motion.div
                            key={task.id}
                            layout
                            layoutId={`task-card-anim-${task.id}`}
                            initial={{ opacity: 0, y: 12, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
                            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                            whileHover={{ y: -2, transition: { duration: 0.12 } }}
                            id={`task-card-${task.id}`}
                            draggable
                            onDragStart={(e) => {
                              setDraggedTaskId(task.id);
                              e.dataTransfer.setData('text/plain', task.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => {
                              setDraggedTaskId(null);
                              setDragOverColumnId(null);
                            }}
                            onClick={() => setSelectedTaskDetail(task)}
                            className={`bg-white p-3.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing group space-y-2.5 relative select-none ${
                              isBeingDragged
                                ? 'opacity-35 border-dashed border-indigo-400 scale-[0.98] shadow-none ring-2 ring-indigo-200'
                                : isTimerActiveForThis
                                ? 'border-amber-400 ring-2 ring-amber-200 shadow-sm'
                                : 'border-slate-200 shadow-2xs hover:shadow-sm hover:border-indigo-300'
                            }`}
                          >
                            {/* Top Tag & Priority with Drag Grip */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cat.bg} ${cat.color} ${cat.border}`}>
                                  {cat.label}
                                </span>
                              </div>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${prio.bg} ${prio.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                                {prio.label}
                              </span>
                            </div>

                            {/* Task Title */}
                            <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                              {task.title}
                            </h4>

                            {/* Linked Case or Client */}
                            {(task.caseNumber || task.clientName || task.deadlineTitle) && (
                              <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-150 space-y-1">
                                {task.deadlineTitle && (
                                  <div className="flex items-center gap-1.5 font-semibold text-amber-700 truncate">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span className="truncate">Prazo: {task.deadlineTitle}</span>
                                  </div>
                                )}
                                {task.caseNumber && (
                                  <div className="flex items-center gap-1.5 font-medium text-slate-700 truncate">
                                    <Scale className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <span className="truncate">{task.caseNumber}</span>
                                  </div>
                                )}
                                {task.clientName && (
                                  <div className="flex items-center gap-1.5 text-slate-500 truncate">
                                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{task.clientName}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Checklist progress */}
                            {totalCheck > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <CheckSquare className="w-3 h-3 text-slate-400" />
                                    Checklist
                                  </span>
                                  <span className="font-semibold text-slate-700">
                                    {doneCheck}/{totalCheck} ({Math.round((doneCheck / totalCheck) * 100)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-300 ${
                                      doneCheck === totalCheck ? 'bg-emerald-500' : 'bg-indigo-600'
                                    }`}
                                    style={{ width: `${(doneCheck / totalCheck) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Timesheet / Hours Indicator */}
                            {loggedMinutes > 0 && (
                              <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2 py-1 rounded text-slate-600 font-medium">
                                <span className="flex items-center gap-1">
                                  <Hourglass className="w-3 h-3 text-slate-400" />
                                  Timesheet:
                                </span>
                                <span className="font-bold text-slate-800">
                                  {Math.round((loggedMinutes / 60) * 10) / 10}h
                                  {task.estimatedMinutes ? ` / ${Math.round((task.estimatedMinutes / 60) * 10) / 10}h est.` : ''}
                                </span>
                              </div>
                            )}

                            {/* Bottom metadata */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                                  {(task.assignedUserName || 'U').charAt(0)}
                                </div>
                                <span className="truncate max-w-[90px] text-slate-700 font-medium">
                                  {task.assignedUserName?.split(' ')[0] || 'Advogado'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Stopwatch button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isTimerActiveForThis) {
                                      handlePauseTimer();
                                    } else {
                                      handleStartTimer(task.id);
                                    }
                                  }}
                                  className={`p-1 rounded transition-colors ${
                                    isTimerActiveForThis
                                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                      : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                                  }`}
                                  title={isTimerActiveForThis ? 'Pausar Timer' : 'Iniciar Timer de Horas'}
                                >
                                  {isTimerActiveForThis ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                </button>

                                <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{task.dueDate.split('-').reverse().slice(0, 2).join('/')}</span>
                                </div>
                              </div>
                            </div>

                            {/* Fast Move Buttons (on hover) */}
                            <div className="flex items-center justify-between pt-1 opacity-90 group-hover:opacity-100 transition-opacity">
                              {column.id !== 'TODO' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const prevStatus =
                                      column.id === 'DONE'
                                        ? 'REVIEW'
                                        : column.id === 'REVIEW'
                                        ? 'IN_PROGRESS'
                                        : 'TODO';
                                    handleStatusChange(task.id, prevStatus);
                                  }}
                                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded text-xs flex items-center gap-1"
                                  title="Mover para etapa anterior"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                  <span className="text-[10px]">Voltar</span>
                                </button>
                              )}
                              <div className="flex-1" />
                              {column.id !== 'DONE' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextStatus =
                                      column.id === 'TODO'
                                        ? 'IN_PROGRESS'
                                        : column.id === 'IN_PROGRESS'
                                        ? 'REVIEW'
                                        : 'DONE';
                                    handleStatusChange(task.id, nextStatus);
                                  }}
                                  className="p-1 hover:bg-indigo-50 text-indigo-600 font-semibold rounded text-xs flex items-center gap-1"
                                  title="Avançar para próxima etapa"
                                >
                                  <span className="text-[10px]">Avançar</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Main View: LIST VIEW */}
      {viewMode === 'list' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tarefa & Categoria</th>
                  <th className="px-4 py-3">Vínculo Processual / Cliente</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3">Prioridade</th>
                  <th className="px-4 py-3">Checklist</th>
                  <th className="px-4 py-3">Entrega</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">
                      Nenhuma tarefa encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const cat = CATEGORY_MAP[task.category || 'GERAL'];
                    const prio = PRIORITY_MAP[task.priority];
                    const totalCheck = task.checklist?.length || 0;
                    const doneCheck = task.checklist?.filter((c) => c.completed).length || 0;
                    const isOverdue = task.status !== 'DONE' && task.dueDate < new Date().toISOString().split('T')[0];

                    return (
                      <tr
                        key={task.id}
                        onClick={() => setSelectedTaskDetail(task)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Status dropdown */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                            className="text-xs font-semibold px-2 py-1 rounded-md border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="TODO">A Fazer</option>
                            <option value="IN_PROGRESS">Em Execução</option>
                            <option value="REVIEW">Em Revisão</option>
                            <option value="DONE">Concluído</option>
                          </select>
                        </td>

                        {/* Title & Category */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {task.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${cat.bg} ${cat.color}`}>
                              {cat.label}
                            </span>
                            {task.deadlineTitle && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                                Prazo: {task.deadlineTitle}
                              </span>
                            )}
                            {(task.tags || []).map((tg) => (
                              <span key={tg} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                #{tg}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Case & Client */}
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {task.caseNumber ? (
                            <div className="flex items-center gap-1 font-medium text-slate-800">
                              <Scale className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{task.caseNumber}</span>
                            </div>
                          ) : task.clientName ? (
                            <div className="flex items-center gap-1 text-slate-600">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{task.clientName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Responsible User */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{task.assignedUserName || 'Dra. Gabriela M. Manni Capitani'}</span>
                          </div>
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${prio.bg} ${prio.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                            {prio.label}
                          </span>
                        </td>

                        {/* Checklist progress */}
                        <td className="px-4 py-3 text-xs">
                          {totalCheck > 0 ? (
                            <span className="font-semibold text-slate-700">
                              {doneCheck}/{totalCheck} ({Math.round((doneCheck / totalCheck) * 100)}%)
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Due Date */}
                        <td className="px-4 py-3 text-xs">
                          <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{task.dueDate.split('-').reverse().join('/')}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(task)}
                              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                              title="Editar Tarefa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                              title="Excluir Tarefa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* MODAL: CREATE / EDIT TASK */}
      <AnimatePresence>
        {isNewTaskModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8"
            >
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-lg text-slate-900">
                    {editingTaskId ? 'Editar Tarefa Operacional' : 'Cadastrar Nova Tarefa'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTask} className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Título da Tarefa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Minuta de Agravo de Instrumento com Pedido Liminar"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Descrição & Instruções Técnicas
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detalhes sobre a matéria, teses aplicáveis, orientações do cliente ou jurisprudência paradigma..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Category, Priority, Responsible */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Categoria
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as TaskCategory)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Prioridade
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as Task['priority'])}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="LOW">Baixa</option>
                      <option value="MEDIUM">Média</option>
                      <option value="HIGH">Alta</option>
                      <option value="URGENT">Urgente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Responsável
                    </label>
                    <select
                      value={formAssignedUserId}
                      onChange={(e) => setFormAssignedUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Due Date & Estimated Minutes & Tags */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Data de Entrega
                    </label>
                    <input
                      type="date"
                      required
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tempo Estimado (min)
                    </label>
                    <input
                      type="number"
                      min="5"
                      step="15"
                      value={formEstimatedMinutes}
                      onChange={(e) => setFormEstimatedMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tags (separadas por vírgula)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: STJ, Liminar, Tributário"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Link to Deadline, Case & Client */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Vincular a Prazo Processual (CPC)
                    </label>
                    <select
                      value={formDeadlineId}
                      onChange={(e) => {
                        const dlId = e.target.value;
                        setFormDeadlineId(dlId);
                        const dl = deadlines.find((d) => d.id === dlId);
                        if (dl) {
                          if (dl.caseId) setFormCaseId(dl.caseId);
                          if (dl.dueDate) setFormDueDate(dl.dueDate);
                          if (!formTitle) setFormTitle(`Cumprir Prazo: ${dl.title}`);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Nenhum prazo vinculado</option>
                      {deadlines.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} (Fatal: {d.dueDate})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Vincular a Processo Judicial
                    </label>
                    <select
                      value={formCaseId}
                      onChange={(e) => setFormCaseId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Nenhum processo vinculado</option>
                      {cases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.caseNumber} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Vincular a Cliente
                    </label>
                    <select
                      value={formClientId}
                      onChange={(e) => setFormClientId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Nenhum cliente vinculado</option>
                      {clients.map((cl) => (
                        <option key={cl.id} value={cl.id}>
                          {cl.person?.name || cl.clientCode}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Interactive Checklist Editor */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Checklist de Sub-Tarefas & Entregáveis ({formChecklist.length})
                  </label>

                  <div className="space-y-2 mb-3">
                    {formChecklist.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200"
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(e) => {
                            const updated = [...formChecklist];
                            updated[index].completed = e.target.checked;
                            setFormChecklist(updated);
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const updated = [...formChecklist];
                            updated[index].text = e.target.value;
                            setFormChecklist(updated);
                          }}
                          className="flex-1 bg-transparent border-none text-sm text-slate-800 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Adicionar novo item de checklist..."
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddChecklistItem();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddChecklistItem}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                    >
                      Adicionar Item
                    </button>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewTaskModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm shadow-xs transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : editingTaskId ? 'Salvar Alterações' : 'Criar Tarefa'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: TASK DETAIL DRAWER / VIEW */}
      <AnimatePresence>
        {selectedTaskDetail && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${CATEGORY_MAP[selectedTaskDetail.category || 'GERAL'].bg} ${CATEGORY_MAP[selectedTaskDetail.category || 'GERAL'].color}`}>
                    {CATEGORY_MAP[selectedTaskDetail.category || 'GERAL'].label}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${PRIORITY_MAP[selectedTaskDetail.priority].bg} ${PRIORITY_MAP[selectedTaskDetail.priority].color}`}>
                    {PRIORITY_MAP[selectedTaskDetail.priority].label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {onOpenAiGateway && (
                    <button
                      onClick={() => {
                        onOpenAiGateway(
                          'draft',
                          `Tarefa: ${selectedTaskDetail.title}\nInstruções: ${selectedTaskDetail.description || 'Elaborar peça técnica'}\nProcesso: ${selectedTaskDetail.caseNumber || 'N/A'}`
                        );
                        setSelectedTaskDetail(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-colors mr-1"
                      title="Redigir ou Analisar com IA"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Assistente IA
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleOpenEdit(selectedTaskDetail);
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(selectedTaskDetail.id)}
                    className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedTaskDetail(null)}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedTaskDetail.title}</h3>
                  {selectedTaskDetail.description ? (
                    <p className="text-sm text-slate-600 mt-2 whitespace-pre-line leading-relaxed">
                      {selectedTaskDetail.description}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 mt-1 italic">Nenhuma descrição cadastrada.</p>
                  )}
                </div>

                {/* Status Switcher */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Status da Tarefa:</span>
                    <div className="font-bold text-sm text-slate-800 mt-0.5">
                      {STATUS_COLUMNS.find((c) => c.id === selectedTaskDetail.status)?.title}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {STATUS_COLUMNS.map((col) => (
                      <button
                        key={col.id}
                        onClick={() => handleStatusChange(selectedTaskDetail.id, col.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          selectedTaskDetail.status === col.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {col.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Key Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500">Responsável</span>
                    <div className="font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      {selectedTaskDetail.assignedUserName || 'Dra. Gabriela M. Manni Capitani'}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500">Data de Entrega</span>
                    <div className="font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      {selectedTaskDetail.dueDate.split('-').reverse().join('/')}
                    </div>
                  </div>

                  {selectedTaskDetail.deadlineTitle && (
                    <div className="bg-amber-50/80 p-3 rounded-lg border border-amber-200 col-span-2">
                      <span className="text-amber-800 font-semibold text-[11px] uppercase tracking-wider block">
                        Prazo Processual Vinculado (CPC)
                      </span>
                      <div className="font-bold text-amber-900 mt-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          {selectedTaskDetail.deadlineTitle}
                        </span>
                        {selectedTaskDetail.deadlineFatalDate && (
                          <span className="text-xs font-mono bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                            Fatal: {selectedTaskDetail.deadlineFatalDate.split('-').reverse().join('/')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTaskDetail.caseNumber && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 col-span-2">
                      <span className="text-slate-500">Processo Vinculado</span>
                      <div className="font-bold text-indigo-700 mt-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <Scale className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="truncate">{selectedTaskDetail.caseNumber} {selectedTaskDetail.caseTitle ? `— ${selectedTaskDetail.caseTitle}` : ''}</span>
                        </div>
                        {onNavigateToCase && selectedTaskDetail.caseId && (
                          <button
                            onClick={() => onNavigateToCase(selectedTaskDetail.caseId!)}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
                          >
                            Abrir <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTaskDetail.clientName && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 col-span-2">
                      <span className="text-slate-500">Cliente</span>
                      <div className="font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        {selectedTaskDetail.clientName}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timesheet & Stopwatch Section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Hourglass className="w-3.5 h-3.5 text-indigo-600" />
                      Timesheet Operacional (
                      {Math.round(((selectedTaskDetail.timeLogs || []).reduce((a, b) => a + b.minutes, 0) / 60) * 10) / 10}h de {Math.round(((selectedTaskDetail.estimatedMinutes || 60) / 60) * 10) / 10}h estimadas)
                    </span>
                    <button
                      onClick={() => handleStartTimer(selectedTaskDetail.id)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-md flex items-center gap-1 transition-colors"
                    >
                      <Play className="w-3 h-3" /> Iniciar Timer
                    </button>
                  </div>

                  {/* Quick Add Minutes Form */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={logMinutes}
                      onChange={(e) => setLogMinutes(Number(e.target.value))}
                      className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800"
                      placeholder="Minutos"
                    />
                    <input
                      type="text"
                      value={logNote}
                      onChange={(e) => setLogNote(e.target.value)}
                      placeholder="Descrição do apontamento..."
                      className="flex-1 min-w-[140px] px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={logBillable}
                        onChange={(e) => setLogBillable(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      Faturável
                    </label>
                    <button
                      type="button"
                      disabled={isLoggingTime}
                      onClick={() => handleQuickTimeLog(selectedTaskDetail.id)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {isLoggingTime ? 'Gravando...' : 'Apontar'}
                    </button>
                  </div>

                  {/* Logs Table */}
                  {selectedTaskDetail.timeLogs && selectedTaskDetail.timeLogs.length > 0 && (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pt-1">
                      {selectedTaskDetail.timeLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-200">
                          <div>
                            <span className="font-semibold text-slate-800">{log.minutes} min</span>
                            <span className="text-slate-500 ml-1.5">{log.note}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {log.billable && (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded font-bold">
                                Faturável
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">{log.userName?.split(' ')[0]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Interactive Checklist In Detail Drawer */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Checklist de Execução (
                      {selectedTaskDetail.checklist?.filter((c) => c.completed).length || 0}/
                      {selectedTaskDetail.checklist?.length || 0})
                    </span>
                  </div>

                  {(!selectedTaskDetail.checklist || selectedTaskDetail.checklist.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">Nenhum item de checklist.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTaskDetail.checklist.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleToggleChecklist(selectedTaskDetail, item.id)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            item.completed
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 line-through'
                              : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300'
                          }`}
                        >
                          {item.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="font-medium flex-1">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tags */}
                {selectedTaskDetail.tags && selectedTaskDetail.tags.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTaskDetail.tags.map((tg) => (
                        <span key={tg} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs bg-slate-100 text-slate-700 font-medium">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {tg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Criado em {new Date(selectedTaskDetail.createdAt).toLocaleDateString('pt-BR')}
                </span>
                <button
                  onClick={() => setSelectedTaskDetail(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
