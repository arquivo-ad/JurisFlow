import React, { useState } from 'react';
import { X, Camera, Check, User } from 'lucide-react';
import { AvatarPicker } from './AvatarPicker';

interface ChangeProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
  userName: string;
  onSave: (newAvatarUrl: string) => Promise<void>;
}

export const ChangeProfilePhotoModal: React.FC<ChangeProfilePhotoModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl = '',
  userName,
  onSave,
}) => {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with prop when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setAvatarUrl(currentAvatarUrl);
    }
  }, [isOpen, currentAvatarUrl]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onSave(avatarUrl);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar foto de perfil:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Alterar Foto de Perfil</h2>
              <p className="text-xs text-slate-500 font-medium">{userName}</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <AvatarPicker
            value={avatarUrl}
            onChange={(url) => setAvatarUrl(url)}
            name={userName}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Salvando Foto...' : 'Salvar Foto de Perfil'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
