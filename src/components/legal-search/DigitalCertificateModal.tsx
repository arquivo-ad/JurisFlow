import React from 'react';
import { AlertTriangle, Lock, X } from 'lucide-react';
import { LawyerDigitalCertificateInfo } from '../../types';

interface DigitalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCertificate: LawyerDigitalCertificateInfo | null;
  onCertificateLoaded: (cert: LawyerDigitalCertificateInfo) => void;
  onShowToast: (msg: string) => void;
}

export const DigitalCertificateModal: React.FC<DigitalCertificateModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Certificado digital</h2>
              <p className="text-xs text-slate-500">Ponte local ainda não instalada</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-950">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <AlertTriangle className="w-4 h-4" />
              Recurso não implementado
            </div>
            <p className="text-xs leading-relaxed">
              O JurisFlow ainda não possui uma ponte local Web PKI/PKCS#11 capaz de usar A1 ou A3 com segurança.
              Por isso, esta versão não solicita arquivo, PIN ou senha e não afirma autenticação em tribunais.
            </p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            A consulta pública pelo número CNJ usa o DataJud e não exige certificado. A consulta autenticada será
            liberada somente após instalação e auditoria de um componente local que mantenha a chave privada fora do servidor.
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold">
              Entendi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
