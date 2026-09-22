import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileKey2, Loader2, Lock, Usb, X } from 'lucide-react';
import { LawyerDigitalCertificateInfo } from '../../types';
import {
  CertificateBridgeHealth,
  getCertificateBridgeHealth,
  inspectA1CertificateLocally,
} from '../../services/certificateBridge';

interface DigitalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCertificate: LawyerDigitalCertificateInfo | null;
  onCertificateLoaded: (cert: LawyerDigitalCertificateInfo) => void;
  onShowToast: (msg: string) => void;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
}

export const DigitalCertificateModal: React.FC<DigitalCertificateModalProps> = ({
  isOpen,
  onClose,
  activeCertificate,
  onCertificateLoaded,
  onShowToast,
}) => {
  const [health, setHealth] = useState<CertificateBridgeHealth | null>(null);
  const [healthError, setHealthError] = useState('');
  const [checking, setChecking] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setChecking(true);
    setHealthError('');
    getCertificateBridgeHealth()
      .then((result) => {
        if (alive) setHealth(result);
      })
      .catch(() => {
        if (alive) {
          setHealth(null);
          setHealthError('Ponte local não encontrada em 127.0.0.1:43119.');
        }
      })
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInspectA1 = async () => {
    if (!selectedFile) {
      onShowToast('Selecione um certificado A1 (.p12 ou .pfx).');
      return;
    }
    if (!health?.capabilities.a1.available) {
      onShowToast('OpenSSL local não está disponível para leitura segura do certificado A1.');
      return;
    }

    setInspecting(true);
    try {
      const certificate = await inspectA1CertificateLocally(selectedFile, password);
      setPassword('');
      onCertificateLoaded(certificate);
      onShowToast(`Certificado A1 validado localmente: ${certificate.subjectName}`);
    } catch (error: any) {
      const code = String(error?.message || error);
      const message = code === 'INVALID_PASSWORD_OR_PKCS12'
        ? 'Senha incorreta ou arquivo PKCS#12 inválido.'
        : code === 'CERTIFICATE_BRIDGE_PAIRING_FAILED'
          ? 'Não foi possível parear com a ponte local.'
          : 'Não foi possível ler o certificado A1 localmente.';
      onShowToast(message);
    } finally {
      setInspecting(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Lock className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Certificado digital</h2>
              <p className="text-xs text-slate-500">
                Ponte local ICP-Brasil — chave privada permanece neste computador
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className={`p-3.5 rounded-xl border text-xs ${health
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
            <div className="flex items-center gap-2 font-semibold">
              {checking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : health ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-700" />
              )}
              {checking
                ? 'Verificando ponte local...'
                : health
                  ? `Ponte local v${health.version} conectada em 127.0.0.1:${health.port}`
                  : healthError}
            </div>
          </div>

          {activeCertificate && (
            <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50 text-xs text-sky-950 space-y-1">
              <div className="font-semibold flex items-center gap-2">
                <FileKey2 className="w-4 h-4" />
                Certificado ativo — {activeCertificate.type}
              </div>
              <div>{activeCertificate.subjectName}</div>
              <div className="text-sky-800">
                Validade: {formatDate(activeCertificate.validFrom)} até {formatDate(activeCertificate.validTo)}
              </div>
              <div className="font-mono text-[10px] break-all text-sky-700">
                SHA-256: {activeCertificate.thumbprintSha256}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-slate-800">Certificado A1</div>
                <div className="text-[11px] text-slate-500">Arquivo .p12/.pfx processado somente no localhost</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${health?.capabilities.a1.available
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                {health?.capabilities.a1.available ? 'DISPONÍVEL' : 'INDISPONÍVEL'}
              </span>
            </div>

            <input
              type="file"
              accept=".p12,.pfx,application/x-pkcs12"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700"
              disabled={!health?.capabilities.a1.available || inspecting}
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Senha do certificado A1"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-sky-400"
              disabled={!health?.capabilities.a1.available || inspecting}
            />
            <button
              type="button"
              onClick={handleInspectA1}
              disabled={!selectedFile || !health?.capabilities.a1.available || inspecting}
              className="w-full px-4 py-2.5 rounded-lg bg-sky-600 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {inspecting && <Loader2 className="w-4 h-4 animate-spin" />}
              Inspecionar A1 localmente
            </button>
            <p className="text-[10px] leading-relaxed text-slate-500">
              O arquivo e a senha não são enviados à API do JurisFlow. A ponte cria um arquivo temporário com permissão 0600,
              passa a senha ao OpenSSL por stdin e remove o arquivo após a inspeção.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <Usb className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm text-slate-800">Certificado A3 / Token OAB</div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Requer middleware OpenSC/PKCS#11 e leitor/token detectável pelo sistema operacional.
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${health?.capabilities.a3.available
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {health?.capabilities.a3.available ? 'MIDDLEWARE OK' : 'OPENSC AUSENTE'}
              </span>
            </div>
            {!health?.capabilities.a3.available && health && (
              <div className="mt-3 text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                A ponte continuará fail-closed para A3 até pkcs11-tool/OpenSC estarem instalados. Nenhum PIN será solicitado antes disso.
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
