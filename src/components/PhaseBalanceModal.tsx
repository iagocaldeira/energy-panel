import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Scale,
  X,
} from 'lucide-react';
import { SupplyType } from '../types/panel';
import { PhaseBalancePreview } from '../utils/electrical';

interface PhaseBalanceModalProps {
  preview: PhaseBalancePreview;
  supplyType: SupplyType;
  maxRefAmps: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PhaseBalanceModal: React.FC<PhaseBalanceModalProps> = ({
  preview,
  supplyType,
  maxRefAmps,
  onConfirm,
  onCancel,
}) => {
  const { before, after, changes } = preview;

  const phases: {
    key: 'R' | 'S' | 'T';
    label: string;
    colorText: string;
    colorBar: string;
    beforeAmps: number;
    beforeWatts: number;
    afterAmps: number;
    afterWatts: number;
  }[] = [
    {
      key: 'R',
      label: 'Fase R',
      colorText: 'text-red-400',
      colorBar: 'bg-red-500',
      beforeAmps: before.ampsR,
      beforeWatts: before.wattsR,
      afterAmps: after.ampsR,
      afterWatts: after.wattsR,
    },
    ...(supplyType !== 'mono'
      ? [
          {
            key: 'S' as const,
            label: 'Fase S',
            colorText: 'text-yellow-400',
            colorBar: 'bg-yellow-400',
            beforeAmps: before.ampsS,
            beforeWatts: before.wattsS,
            afterAmps: after.ampsS,
            afterWatts: after.wattsS,
          },
        ]
      : []),
    ...(supplyType === 'tri'
      ? [
          {
            key: 'T' as const,
            label: 'Fase T',
            colorText: 'text-slate-200',
            colorBar: 'bg-slate-200',
            beforeAmps: before.ampsT,
            beforeWatts: before.wattsT,
            afterAmps: after.ampsT,
            afterWatts: after.wattsT,
          },
        ]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Simulação de Balanceamento de Fases
              </h3>
              <p className="text-[11px] text-slate-400">
                Confira abaixo como as cargas serão redistribuídas antes de confirmar
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Summary Banner: Imbalance Before vs After */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Desequilíbrio Atual
              </div>
              <div className="text-lg font-extrabold font-mono text-amber-400 mt-0.5">
                {before.imbalancePercent}%
              </div>
              <div className="text-[11px] text-slate-400">
                Pico por fase: {before.maxPhaseAmps} A
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-[10px] uppercase tracking-wider text-emerald-300">
                Após Balanceamento
              </div>
              <div className="text-lg font-extrabold font-mono text-emerald-400 mt-0.5">
                {after.imbalancePercent}%
              </div>
              <div className="text-[11px] text-emerald-200/80">
                Pico por fase: {after.maxPhaseAmps} A
              </div>
            </div>
          </div>

          {/* Phase Comparison Table (Antes -> Depois) */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Comparativo de Carga por Fase
            </div>
            <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              {phases.map((p) => (
                <div key={p.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${p.colorText}`}>{p.label}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-400">
                        {p.beforeAmps}A ({p.beforeWatts}W)
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-bold text-emerald-400">
                        {p.afterAmps}A ({p.afterWatts}W)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className={`h-full ${p.colorBar} transition-all`}
                      style={{
                        width: `${Math.min(100, (p.afterAmps / maxRefAmps) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* List of Circuit Changes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Circuitos que Mudarão de Fase ({changes.length})
              </span>
            </div>

            {changes.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div>
                  <div className="font-semibold">
                    O quadro já está com o melhor equilíbrio possível!
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Nenhum circuito precisa mudar de fase com as cargas atuais.
                  </div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                {changes.map((ch) => (
                  <div
                    key={ch.moduleId}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-900/60"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-100 truncate">
                        {ch.circuitNumber ? `C${ch.circuitNumber} • ` : ''}
                        {ch.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {ch.poles}P • {ch.powerWatts} W ({ch.amps} A)
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono shrink-0">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                        Fase {ch.fromPhase}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                        Fase {ch.toPhase}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg"
          >
            {changes.length > 0 ? 'Confirmar e Aplicar Balanceamento' : 'Concluir'}
          </button>
        </div>
      </div>
    </div>
  );
};
