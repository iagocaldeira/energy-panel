import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary capturou uma falha não tratada:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleRestoreDefault = (): void => {
    try {
      localStorage.removeItem('qdc_studio_saved_config_v3');
      localStorage.removeItem('qdc_studio_saved_config_v2');
      localStorage.removeItem('qdc_studio_saved_config');
    } catch (err) {
      console.error('Erro ao limpar localStorage no ErrorBoundary:', err);
    }
    if (this.props.onReset) {
      this.props.onReset();
    }
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[420px] h-full w-full flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 select-none">
          <div className="max-w-xl w-full bg-slate-900/90 border border-rose-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-rose-950/20 backdrop-blur text-center">
            {/* Warning Icon with Amber/Rose Ring */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Error Title and Description */}
            <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-2">
              Falha de Renderização ou Cálculo
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              A aplicação encontrou um erro inesperado durante o cálculo elétrico ou renderização de elementos SVG do quadro.
              Os dados foram preservados para evitar corrupção adicional.
            </p>

            {/* Error Details Box */}
            {this.state.error && (
              <div className="mb-6 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left overflow-hidden">
                <div className="text-[11px] font-mono font-semibold text-rose-400 truncate mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </div>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] font-mono text-slate-500 whitespace-pre-wrap max-h-32 overflow-y-auto leading-tight custom-scrollbar">
                    {this.state.errorInfo.componentStack.trim()}
                  </pre>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/10 active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Aplicação
              </button>
              <button
                type="button"
                onClick={this.handleRestoreDefault}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-200 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar Projeto Padrão
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
