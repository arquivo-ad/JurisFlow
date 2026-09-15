import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Link as LinkIcon, Check, Sparkles, Image as ImageIcon } from 'lucide-react';

interface AvatarPickerProps {
  value?: string;
  onChange: (newUrl: string) => void;
  name?: string;
  className?: string;
}

// Curated high-resolution professional legal executive avatars
const PRESET_AVATARS = [
  {
    label: 'Advogada Executiva 1',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&auto=format&fit=crop&q=80',
  },
  {
    label: 'Advogado Executivo 1',
    url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=256&auto=format&fit=crop&q=80',
  },
  {
    label: 'Advogada Executiva 2',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=256&auto=format&fit=crop&q=80',
  },
  {
    label: 'Advogado Executivo 2',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=256&auto=format&fit=crop&q=80',
  },
  {
    label: 'Advogada Executiva 3',
    url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=256&auto=format&fit=crop&q=80',
  },
  {
    label: 'Advogado Executivo 3',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&auto=format&fit=crop&q=80',
  },
  {
    label: 'Advogada Executiva 4',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&auto=format&fit=crop&q=80',
  },
  {
    label: 'Advogado Executivo 4',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&auto=format&fit=crop&q=80',
  },
];

/**
 * Compresses an image file in-browser using HTML5 Canvas
 * Resizes to max 256x256 px and produces a lightweight JPEG data URL (~25-45 KB)
 */
function compressImage(file: File, maxDim = 256, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Falha ao processar a imagem selecionada.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  value,
  onChange,
  name = 'Usuário',
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'UPLOAD' | 'PRESETS' | 'URL'>('UPLOAD');
  const [urlInput, setUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (str: string) => {
    const parts = str.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return 'US';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WebP).');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      const compressedDataUrl = await compressImage(file, 256, 0.85);
      onChange(compressedDataUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar a imagem.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput('');
    setErrorMsg(null);
  };

  const handleRemovePhoto = () => {
    onChange('');
    setErrorMsg(null);
  };

  return (
    <div className={`p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-indigo-600" />
          Foto de Perfil & Avatar
        </label>
        {value && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            Remover foto
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* Avatar Preview */}
        <div className="relative group shrink-0">
          <div className="w-20 h-20 rounded-2xl ring-2 ring-indigo-500/30 overflow-hidden bg-indigo-100 flex items-center justify-center shadow-xs">
            {value ? (
              <img
                src={value}
                alt={name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                }}
              />
            ) : (
              <span className="text-xl font-bold text-indigo-700 font-mono tracking-wider">
                {getInitials(name)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Alterar foto"
            className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex-1 w-full space-y-2.5">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('UPLOAD')}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-center transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'UPLOAD'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Upload className="w-3 h-3" />
              <span>Upload Local</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PRESETS')}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-center transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'PRESETS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Avatares Prontos</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('URL')}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-center transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'URL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LinkIcon className="w-3 h-3" />
              <span>URL Externa</span>
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Tab 1: Upload */}
          {activeTab === 'UPLOAD' && (
            <div className="space-y-2">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-4 px-3 border-2 border-dashed rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/80 text-indigo-800 scale-[1.01]'
                    : 'border-indigo-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/40 text-indigo-700'
                } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <Upload className="w-5 h-5 text-indigo-600 mb-0.5" />
                <span>
                  {isProcessing ? 'Otimizando e processando foto...' : isDragging ? 'Solte a foto aqui' : 'Clique ou arraste sua foto aqui'}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  PNG, JPG ou WebP • Salvo permanentemente no banco
                </span>
              </div>
            </div>
          )}

          {/* Tab 2: Presets */}
          {activeTab === 'PRESETS' && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PRESET_AVATARS.map((p, idx) => {
                  const isSelected = value === p.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onChange(p.url);
                        setErrorMsg(null);
                      }}
                      title={p.label}
                      className={`relative w-10 h-10 rounded-xl overflow-hidden transition-all border-2 ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/40 scale-105'
                          : 'border-transparent hover:border-slate-300 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center text-white">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400">
                Selecione uma persona institucional para seu perfil jurídico
              </p>
            </div>
          )}

          {/* Tab 3: URL */}
          {activeTab === 'URL' && (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://exemplo.com/sua-foto.jpg"
                className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                disabled={!urlInput.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          )}

          {errorMsg && (
            <p className="text-[11px] text-rose-600 font-medium">
              {errorMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
