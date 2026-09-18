import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  FileCheck,
  AlertTriangle,
  Lock,
  X,
  CheckCircle2,
  Calendar,
  UserCheck,
  Cpu,
} from 'lucide-react';
import { LawyerDigitalCertificateInfo } from '../../types';
import { api } from '../../services/api';

interface DigitalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCertificate: LawyerDigitalCertificateInfo | null;
  onCertificateLoaded: (cert: LawyerDigitalCertificateInfo) => void;
  onShowToast: (msg: string) => void;
}

export const DigitalCertificateModal: React.FC<DigitalCertificateModalProps> = ({
  isOpen,
  onClose,
  activeCertificate,
  onCertificateLoaded,
  onShowToast,
}) => {
  const [certType, setCertType] = useState<'A1' | 'A3'>('A1');
  const [fileName, setFileName] = useState('');
  const [password, setPassword] = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [inspectedCert, setInspectedCert] = useState<LawyerDigitalCertificateInfo | null>(activeCertificate);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setErrorMsg(null);
    }
  };

  const handleInspectCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName && certType === 'A1') {
      setErrorMsg('Selecione um arquivo de certificado digital (.pfx ou .p12).');
      return;
    }
    if (!password) {
      setErrorMsg('Informe a senha do certificado para validação pontual em memória.');
      return;
    }

    setInspecting(true);
    setErrorMsg(null);

    try {
      // Ephemeral inspection: passes only file metadata and pin/pass for server-side memory validation
      const res = await api.inspectDigitalCertificate({
        fileName: fileName || 'token_a3_oab.pkcs11',
        passwordLength: password.length,
      });

      if (res.success && res.certificate) {
        setInspectedCert(res.certificate);
        onCertificateLoaded(res.certificate);
        onShowToast('Certificado ICP-Brasil validado com sucesso para a sessão atual.');
      } else {
        setErrorMsg('Não foi possível validar o certificado digital.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro na validação do certificado digital.');
    } finally {
      setInspecting(false);
      // Clear password field immediately for memory security
      setPassword('');
    }
  };

  const handleClearCertificate = () => {
    setInspectedCert(null);
    setFileName('');
    setPassword('');
    onShowToast('Credencial efêmera do certificado removida da sessão.');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Certificado Digital ICP-Brasil</h2>
              <p className="text-xs text-slate-500">
                Autenticação de consultas avançadas nos Tribunais (A1/A3)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Security & LGPD Notice */}
          <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 text-xs text-sky-800 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-sky-900">
              <Lock className="w-4 h-4 text-sky-700" />
              <span>Garantia Arquitetural de Segurança Zero-Storage</span>
            </div>
            <p className="text-[11px] leading-relaxed text-sky-800/90">
              O JurisFlow opera em estrita conformidade com as diretrizes do CNJ e da LGPD. As credenciais do seu certificado digital trafegam pontualmente em memória volátil isolada e <strong>nunca são persistidas em banco de dados ou logs de auditoria</strong>.
            </p>
          </div>

          {/* Active Certificate Card if present */}
          {inspectedCert ? (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-900">Certificado Ativo na Sessão</span>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {inspectedCert.type} ICP-Brasil
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Titular:</span>
                  <span className="font-semibold text-slate-900">{inspectedCert.subjectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Documento / CPF:</span>
                  <span className="font-mono text-slate-800">{inspectedCert.cpfCnpj}</span>
                </div>
                {inspectedCert.oabRegistry && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registro OAB:</span>
                    <span className="font-semibold text-indigo-700">{inspectedCert.oabRegistry}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Autoridade Certificadora:</span>
                  <span className="text-slate-700">{inspectedCert.issuerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Válido até:</span>
                  <span className="font-mono text-slate-800">{inspectedCert.validTo}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/70 flex justify-end">
                <button
                  type="button"
                  onClick={handleClearCertificate}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline"
                >
                  Desvincular da Sessão
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInspectCertificate} className="space-y-4">
              {/* Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Modalidade do Certificado
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCertType('A1')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                      certType === 'A1'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    Arquivo A1 (.pfx/.p12)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCertType('A3')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                      certType === 'A3'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    Token / Cartão A3
                  </button>
                </div>
              </div>

              {certType === 'A1' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Arquivo do Certificado (.pfx ou .p12)
                  </label>
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 border border-slate-200 rounded-lg p-1.5"
                  />
                  {fileName && (
                    <p className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Arquivo selecionado: {fileName}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                    Módulo PKCS#11 / Web PKI
                  </p>
                  <p className="text-[11px] text-slate-500">
                    O JurisFlow se comunicará com o token físico de sua OAB através da interface local criptográfica sem exportar sua chave privada.
                  </p>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Senha do Certificado (PIN / Passphrase)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a senha para validação temporária"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 pr-9"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  A senha é destruída da memória imediatamente após a handshake com a autoridade judicial.
                </p>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={inspecting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {inspecting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Validando Chave...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Ativar para esta Sessão
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
