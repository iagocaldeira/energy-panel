import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  ShieldAlert,
  ShieldCheck,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { BreakerRecalculatePreview } from '../utils/electrical';

interface BreakerRecalculateModalProps {
  preview: BreakerRecalculatePreview;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BreakerRecalculateModal: React.FC<BreakerRecalculateModalProps> = ({
  preview,
  onConfirm,
  onCancel,
}) => {
  const {
    totalCircuits,
    changedCount,
    unchangedCount,
    overloadedCount,
    changes,
  } = preview;

  const [activeFilter, setActiveFilter] = useState<'changed' | 'all'>(
    changedCount > 0 ? 'changed' : 'all'
  );

  const displayedChanges =
    activeFilter === 'changed'
      ? changes.filter((c) => c.hasChanged)
      : changes;

  const getCircuitTypeLabel = (type: string) => {
    switch (type) {
      case 'lighting':
        return 'Iluminação';
      case 'tug':
        return 'Tomadas (TUG)';
      case 'tue':
        return 'Uso Específico (TUE)';
      default:
        return 'Circuito de Carga';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl mx-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
              <Wand2 className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5 sm:gap-2">
                Recálculo Automático de Disjuntores
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-medium">
                  NBR 5410
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Confira o redimensionamento de disjuntores e cabos com base nas cargas nominais
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition shrink-0"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4 text-xs">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Circuitos
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono text-slate-100 mt-0.5">
                {totalCircuits}
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Analisados no QDC
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold">
                Ajustes
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono text-amber-400 mt-0.5">
                {changedCount}
              </div>
              <div className="text-[10px] sm:text-[11px] text-amber-200/80 truncate">
                Disjuntores a mudar
              </div>
            </div>

            <div
              className={`p-2.5 sm:p-3 rounded-xl border ${
                overloadedCount > 0
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div
                className={`text-[10px] uppercase tracking-wider ${
                  overloadedCount > 0 ? 'text-rose-300 font-bold' : 'text-slate-400 font-semibold'
                }`}
              >
                Sobrecargas
              </div>
              <div
                className={`text-base sm:text-lg font-extrabold font-mono mt-0.5 ${
                  overloadedCount > 0 ? 'text-rose-400' : 'text-slate-100'
                }`}
              >
                {overloadedCount}
              </div>
              <div className="text-[10px] sm:text-[11px] opacity-80 truncate">
                {overloadedCount > 0 ? 'Corrigidas agora' : 'Nenhuma'}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">
                Conformes
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono text-emerald-400 mt-0.5">
                {unchangedCount}
              </div>
              <div className="text-[10px] sm:text-[11px] text-emerald-200/80 truncate">
                Já adequados
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Detalhamento dos Circuitos
            </span>

            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] w-full sm:w-auto">
              <button
                onClick={() => setActiveFilter('changed')}
                className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-md transition font-medium text-center ${
                  activeFilter === 'changed'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Com Alterações ({changedCount})
              </button>
              <button
                onClick={() => setActiveFilter('all')}
                className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-md transition font-medium text-center ${
                  activeFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({totalCircuits})
              </button>
            </div>
          </div>

          {/* Circuit Cards List */}
          {displayedChanges.length === 0 ? (
            <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3.5 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400" />
              <div>
                <div className="font-bold text-sm text-emerald-200">
                  {changedCount === 0
                    ? 'Todos os disjuntores estão devidamente dimensionados!'
                    : 'Nenhuma alteração com o filtro selecionado.'}
                </div>
                <div className="text-[11px] opacity-85 mt-0.5">
                  Os valores nominais dos disjuntores e as bitolas dos cabos atendem perfeitamente aos critérios de proteção da NBR 5410.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedChanges.map((item) => (
                <div
                  key={item.moduleId}
                  className={`p-3.5 rounded-xl border transition space-y-2.5 ${
                    item.isOverloaded
                      ? 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50'
                      : item.hasChanged
                      ? 'bg-slate-950 border-amber-500/30 hover:border-amber-500/50'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  {/* Top Header Row of Circuit */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono font-bold text-[10px] border border-slate-700">
                          {item.circuitNumber ? `C${item.circuitNumber}` : 'CKT'}
                        </span>
                        <span className="font-bold text-slate-100 truncate text-xs">
                          {item.name}
                        </span>
                        {item.room && (
                          <span className="text-[11px] text-slate-400 truncate">
                            • {item.room}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                          {getCircuitTypeLabel(item.circuitType)}
                        </span>
                        <span>•</span>
                        <span>{item.poles}P</span>
                        <span>•</span>
                        <span>{item.voltage}V</span>
                        <span>•</span>
                        <span className="font-mono text-slate-300">
                          {item.powerWatts} W
                        </span>
                        <span>•</span>
                        <span className="font-mono font-semibold text-slate-200">
                          Ib = {item.currentAmps} A
                        </span>
                      </div>
                    </div>

                    {/* Status Pill Badge */}
                    <div className="shrink-0">
                      {item.isOverloaded ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                          Sobrecarga Corrigida
                        </span>
                      ) : item.breakerChanged ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                          <Wand2 className="w-3 h-3 text-amber-400" />
                          Ajuste Recomendado
                        </span>
                      ) : item.wireChanged ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold">
                          <Zap className="w-3 h-3 text-sky-400" />
                          Ajuste de Cabo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          Conforme
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Comparison Grid (Disjuntor & Cabo) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                    {/* Disjuntor Box */}
                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        Disjuntor Termomagnético (In)
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 sm:gap-2 font-mono flex-wrap">
                        {item.breakerChanged ? (
                          <>
                            <span className="text-slate-400 line-through text-xs">
                              {item.fromRatingAmps} A
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-xs sm:text-sm font-extrabold text-amber-300">
                              {item.toRatingAmps} A
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans">
                              (Curva {item.curve})
                            </span>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-extrabold text-slate-200">
                              {item.fromRatingAmps} A
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans">
                              (Curva {item.curve} • Inalterado)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Wire Gauge Box */}
                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        Cabo do Circuito (Iz ≥ In)
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 sm:gap-2 font-mono flex-wrap">
                        {item.wireChanged ? (
                          <>
                            <span className="text-slate-400 line-through text-xs">
                              {item.fromWireGaugeMm2} mm²
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="text-xs sm:text-sm font-extrabold text-sky-300">
                              {item.toWireGaugeMm2} mm²
                            </span>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-extrabold text-slate-200">
                              {item.fromWireGaugeMm2} mm²
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans">
                              (Inalterado)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Justification Note */}
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800/60 text-[11px] text-slate-300 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-950 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
            Critério NBR 5410: <span className="font-mono text-slate-300">Ib ≤ In ≤ Iz</span> e queda de tensão ≤ 4%
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto ml-auto">
            <button
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold text-center transition min-h-[40px] sm:min-h-0 flex items-center justify-center"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-lg flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-0"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>
                {changedCount > 0
                  ? `Confirmar e Aplicar (${changedCount} ${
                      changedCount === 1 ? 'alteração' : 'alterações'
                    })`
                  : 'Concluir'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
