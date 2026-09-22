import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as new (props: Props) => {
  props: Props;
  state: State;
  setState: (updater: Partial<State> | ((state: State) => Partial<State>)) => void;
}) {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-white border border-rose-200 shadow-sm max-w-2xl mx-auto my-8 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            {this.props.fallbackTitle || 'Ocorreu um erro inesperado nesta seção'}
          </h3>
          <p className="text-xs text-slate-500 mb-4 font-mono bg-slate-50 p-2 rounded border border-slate-200 overflow-x-auto text-left">
            {this.state.error?.message || 'Erro de renderização do componente'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recarregar Seção
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
