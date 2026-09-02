import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastNotificationProps {
  message: string | null;
  onClose: () => void;
  durationMs?: number;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  onClose,
  durationMs = 3500,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-4 h-4" />
      </div>
      <p className="text-xs font-semibold max-w-sm">{message}</p>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 ml-2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
