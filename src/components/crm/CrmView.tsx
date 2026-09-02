import React, { useState } from 'react';
import {
  Users,
  Building,
  User,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Scale,
  DollarSign,
  ShieldAlert,
  ChevronRight,
  X,
  Edit2,
  CheckCircle2,
} from 'lucide-react';
import { Client, Person, User as AppUser } from '../../types';

interface CrmViewProps {
  clients: (Client & { person?: Person })[];
  persons: Person[];
  users: AppUser[];
  onSavePerson: (data: Partial<Person>) => Promise<void>;
  onSaveClient: (data: any) => Promise<void>;
  onSelectClientCases: (clientId: string) => void;
}

export const CrmView: React.FC<CrmViewProps> = ({
  clients = [],
  persons = [],
  users = [],
  onSavePerson = async (_data: Partial<Person>) => {},
  onSaveClient = async (_data: any) => {},
  onSelectClientCases = (_clientId: string) => {},
}) => {
  const [activeTab, setActiveTab] = useState<'CLIENTS' | 'PERSONS'>('CLIENTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'NEW_CLIENT' | 'NEW_PERSON'>('NEW_CLIENT');

  // Selected Detail Drawer
  const [selectedClient, setSelectedClient] = useState<(Client & { person?: Person }) | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [personType, setPersonType] = useState<'PF' | 'PJ'>('PJ');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');
  const [clientOrigin, setClientOrigin] = useState('INDICACAO');
  const [clientRisk, setClientRisk] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
  const [assignedLawyerId, setAssignedLawyerId] = useState(users?.[0]?.id || 'u-carlos');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setTradeName('');
    setPersonType('PJ');
    setDocument('');
    setEmail('');
    setPhone('');
    setCity('São Paulo');
    setState('SP');
    setClientOrigin('INDICACAO');
    setClientRisk('LOW');
  };

  const handleOpenModal = (mode: 'NEW_CLIENT' | 'NEW_PERSON') => {
    setModalMode(mode);
    resetForm();
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modalMode === 'NEW_CLIENT') {
        await onSaveClient({
          origin: clientOrigin as any,
          riskScore: clientRisk,
          assignedLawyerId,
          person: {
            name,
            tradeName: personType === 'PJ' ? tradeName : undefined,
            type: personType,
            document,
            email,
            phone,
            address: {
              street: 'Av. Paulista',
              number: '1000',
              neighborhood: 'Bela Vista',
              city,
              state,
              zipCode: '01310-100',
            },
          },
        });
      } else {
        await onSavePerson({
          name,
          tradeName: personType === 'PJ' ? tradeName : undefined,
          type: personType,
          document,
          email,
          phone,
          address: {
            street: 'Av. Paulista',
            number: '1000',
            neighborhood: 'Bela Vista',
            city,
            state,
            zipCode: '01310-100',
          },
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    const p = c.person;
    const matchesSearch =
      !searchQuery ||
      p?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p?.document.includes(searchQuery) ||
      p?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clientCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'ALL' || p?.type === filterType;
    const matchesRisk = filterRisk === 'ALL' || c.riskScore === filterRisk;

    return matchesSearch && matchesType && matchesRisk;
  });

  const filteredPersons = persons.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.document.includes(searchQuery) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'ALL' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header & CRM Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600" />
            CRM & Gestão de Clientes
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Cadastro unificado de partes (PF/PJ), clientes contratuais, histórico de processos e score de risco
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenModal('NEW_CLIENT')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            <button
              onClick={() => setActiveTab('CLIENTS')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'CLIENTS'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Clientes Ativos ({clients.length})
            </button>
            <button
              onClick={() => setActiveTab('PERSONS')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'PERSONS'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Base Geral de Partes ({persons.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, razão social, CPF/CNPJ ou código..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filtros:
          </span>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:bg-white"
          >
            <option value="ALL">Todos os Tipos (PF & PJ)</option>
            <option value="PF">Pessoa Física (PF)</option>
            <option value="PJ">Pessoa Jurídica (PJ)</option>
          </select>

          {activeTab === 'CLIENTS' && (
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:bg-white"
            >
              <option value="ALL">Todos os Riscos</option>
              <option value="LOW">Risco Baixo</option>
              <option value="MEDIUM">Risco Médio</option>
              <option value="HIGH">Risco Alto</option>
            </select>
          )}
        </div>
      </div>

      {/* CLIENTS TABLE / CARDS */}
      {activeTab === 'CLIENTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const person = client.person;
            const isPJ = person?.type === 'PJ';

            return (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-105 transition-transform">
                        {isPJ ? <Building className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 font-semibold">{client.clientCode}</span>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {person?.name || 'Cliente'}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                        client.riskScore === 'LOW'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : client.riskScore === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      Risco {client.riskScore}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-500">
                    <p className="font-mono text-slate-700 font-medium">
                      {isPJ ? 'CNPJ' : 'CPF'}: {person?.document}
                    </p>
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {person?.email}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {person?.phone}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {person?.city} - {person?.state}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-indigo-600 font-semibold">
                    <Scale className="w-3.5 h-3.5" />
                    <span>{client.totalCasesCount} Processos</span>
                  </div>

                  <span className="text-slate-500 font-medium">
                    {client.origin}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PERSONS TABLE */}
      {activeTab === 'PERSONS' && (
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Tipo / Nome</th>
                  <th className="px-4 py-3">Documento (CPF/CNPJ)</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Localização</th>
                  <th className="px-4 py-3">Data Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPersons.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            p.type === 'PJ'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {p.type}
                        </span>
                        <div>
                          <p className="text-slate-900 font-semibold">{p.name}</p>
                          {p.tradeName && <p className="text-[10px] text-slate-400">{p.tradeName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800">{p.document}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">{p.email}</p>
                      <p className="text-[10px] text-slate-400">{p.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.city} - {p.state}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{p.createdAt.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Client Detail Drawer */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border-l border-slate-200 h-full p-6 overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 font-semibold">{selectedClient.clientCode}</span>
                <span className="text-xs font-semibold text-emerald-600">Cliente Ativo</span>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedClient.person?.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedClient.person?.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'} • {selectedClient.person?.tradeName || ''}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Documento:</span>
                  <span className="font-mono text-slate-900 font-semibold">{selectedClient.person?.document}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">E-mail:</span>
                  <span className="text-slate-800">{selectedClient.person?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Telefone:</span>
                  <span className="text-slate-800">{selectedClient.person?.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Endereço:</span>
                  <span className="text-slate-800">{selectedClient.person?.city} - {selectedClient.person?.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Origem do Lead:</span>
                  <span className="text-indigo-600 font-semibold">{selectedClient.origin}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-900 font-semibold">Processos Judiciais Ativos</p>
                  <p className="text-xl font-bold font-mono text-indigo-700 mt-0.5">
                    {selectedClient.totalCasesCount} casos
                  </p>
                </div>
                <button
                  onClick={() => {
                    onSelectClientCases(selectedClient.id);
                    setSelectedClient(null);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Ver Processos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Client / Person Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Cadastrar Novo Cliente (PF/PJ)
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Type Selection */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="radio"
                    name="type"
                    checked={personType === 'PJ'}
                    onChange={() => setPersonType('PJ')}
                    className="text-indigo-600"
                  />
                  <span>Pessoa Jurídica (PJ)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="radio"
                    name="type"
                    checked={personType === 'PF'}
                    onChange={() => setPersonType('PF')}
                    className="text-indigo-600"
                  />
                  <span>Pessoa Física (PF)</span>
                </label>
              </div>

              {/* Name / Razao Social */}
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  {personType === 'PJ' ? 'Razão Social *' : 'Nome Completo *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={personType === 'PJ' ? 'Ex: Construtora Horizonte S/A' : 'Ex: João da Silva'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {personType === 'PJ' && (
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Ex: Horizonte Empreendimentos"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Document CPF/CNPJ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    {personType === 'PJ' ? 'CNPJ *' : 'CPF *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder={personType === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Email & City */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@cliente.com.br"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Cidade / UF</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="São Paulo"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      maxLength={2}
                      placeholder="SP"
                      className="w-14 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-slate-900 font-mono text-center uppercase focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Origin & Risk */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Origem do Cliente</label>
                  <select
                    value={clientOrigin}
                    onChange={(e) => setClientOrigin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="INDICACAO">Indicação de Parceiro</option>
                    <option value="SITE">Website Institucional</option>
                    <option value="GOOGLE_ADS">Google Ads / Busca</option>
                    <option value="EVENTO">Congresso / Evento Jurídico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Score de Risco</label>
                  <select
                    value={clientRisk}
                    onChange={(e) => setClientRisk(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="LOW">Baixo Risco</option>
                    <option value="MEDIUM">Médio Risco</option>
                    <option value="HIGH">Alto Risco</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
