import React from 'react';
import {
  Plus,
  Scale,
  Trash2,
  Wand2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  CurveType,
  PanelConfig,
  PanelModule,
  PhaseAssignment,
} from '../types/panel';
import {
  calculateCircuitCurrent,
  calculatePhaseBalance,
  getRecommendedBreakerRating,
  getRecommendedWireGauge,
  STANDARD_BREAKER_RATINGS,
  WIRE_AMPACITY_TABLE,
} from '../utils/electrical';

interface CircuitScheduleViewProps {
  config: PanelConfig;
  onUpdateModule: (id: string, partial: Partial<PanelModule>) => void;
  onDeleteModule: (id: string) => void;
  onQuickAddCircuit: () => void;
  onOpenBalancePreview: () => void;
  onAutoDimensionAll: () => void;
}

export const CircuitScheduleView: React.FC<CircuitScheduleViewProps> = ({
  config,
  onUpdateModule,
  onDeleteModule,
  onQuickAddCircuit,
  onOpenBalancePreview,
  onAutoDimensionAll,
}) => {
  const circuits = config.modules
    .filter((m) => m.category === 'breaker')
    .sort((a, b) => (a.circuitNumber || 99) - (b.circuitNumber || 99));

  const balance = calculatePhaseBalance(config);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-6">
      {/* Header & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100">
            Quadro de Cargas e Dimensionamento NBR 5410
          </h2>
          <p className="text-xs text-slate-400">
            Edite potências, tensões, fases e bitolas diretamente na planilha — o diagrama do QDC é atualizado em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAutoDimensionAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-medium transition"
          >
            <Wand2 className="w-4 h-4" />
            Auto-Dimensionar Todos (Cabos + Disjuntores)
          </button>
          <button
            onClick={onOpenBalancePreview}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
          >
            <Scale className="w-4 h-4" />
            Balancear Fases R/S/T
          </button>
          <button
            onClick={onQuickAddCircuit}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
          >
            <Plus className="w-4 h-4" />
            Novo Circuito
          </button>
        </div>
      </div>

      {/* Interactive Circuit Schedule Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Circ.</th>
                <th className="py-3 px-3">Descrição do Circuito</th>
                <th className="py-3 px-3">Ambiente</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Tensão</th>
                <th className="py-3 px-3">Potência (W)</th>
                <th className="py-3 px-3">Corrente (I_B)</th>
                <th className="py-3 px-3">Polos</th>
                <th className="py-3 px-3">Fase(s)</th>
                <th className="py-3 px-3">Cabo (mm²)</th>
                <th className="py-3 px-3">Disjuntor</th>
                <th className="py-3 px-3">Status NBR</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {circuits.map((ckt, idx) => {
                const current = calculateCircuitCurrent(ckt);
                const wireRow = WIRE_AMPACITY_TABLE.find(
                  (w) => w.gaugeMm2 === ckt.wireGaugeMm2
                );
                const maxWireAmps = wireRow
                  ? ckt.poles >= 3
                    ? wireRow.maxAmps3P
                    : wireRow.maxAmps2P
                  : 24;
                const isOverloaded = current > ckt.ratingAmps;
                const isWireUndersized = ckt.ratingAmps > maxWireAmps;
                const hasError = isOverloaded || isWireUndersized;

                return (
                  <tr
                    key={ckt.id}
                    className="hover:bg-slate-800/40 transition"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                      C{ckt.circuitNumber || idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={ckt.name}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, { name: e.target.value })
                        }
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 w-44"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={ckt.room || ''}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, { room: e.target.value })
                        }
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 w-32"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={ckt.circuitType}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, {
                            circuitType: e.target.value as PanelModule['circuitType'],
                          })
                        }
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                      >
                        <option value="lighting">Ilum.</option>
                        <option value="tug">TUG</option>
                        <option value="tue">TUE</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={ckt.voltage}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, {
                            voltage: Number(e.target.value) as 127 | 220 | 380,
                          })
                        }
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-slate-200"
                      >
                        <option value={127}>127V</option>
                        <option value={220}>220V</option>
                        <option value={380}>380V</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step={100}
                        min={0}
                        value={ckt.powerWatts}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, {
                            powerWatts: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-amber-300 w-24"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">
                      {current} A
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={ckt.poles}
                        onChange={(e) => {
                          const poles = Number(e.target.value) as 1 | 2 | 3;
                          const phases: PhaseAssignment =
                            poles === 1 ? 'R' : poles === 2 ? 'RS' : 'RST';
                          onUpdateModule(ckt.id, {
                            poles,
                            phases,
                            voltage: poles === 1 ? 127 : 220,
                          });
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-slate-200"
                      >
                        <option value={1}>1P</option>
                        <option value={2}>2P</option>
                        <option value={3}>3P</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={ckt.phases}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, {
                            phases: e.target.value as PhaseAssignment,
                          })
                        }
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono font-bold text-slate-100"
                      >
                        {ckt.poles === 1 && (
                          <>
                            <option value="R">R</option>
                            <option value="S">S</option>
                            <option value="T">T</option>
                          </>
                        )}
                        {ckt.poles === 2 && (
                          <>
                            <option value="RS">R+S</option>
                            <option value="ST">S+T</option>
                            <option value="RT">R+T</option>
                          </>
                        )}
                        {ckt.poles >= 3 && <option value="RST">R+S+T</option>}
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={ckt.wireGaugeMm2}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, {
                            wireGaugeMm2: Number(e.target.value),
                          })
                        }
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-slate-200"
                      >
                        {WIRE_AMPACITY_TABLE.map((w) => (
                          <option key={w.gaugeMm2} value={w.gaugeMm2}>
                            {w.gaugeMm2} mm²
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <select
                          value={ckt.curve || 'C'}
                          onChange={(e) =>
                            onUpdateModule(ckt.id, {
                              curve: e.target.value as CurveType,
                            })
                          }
                          className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 font-mono text-slate-200"
                        >
                          <option value="B">B</option>
                          <option value="C">C</option>
                        </select>
                        <select
                          value={ckt.ratingAmps}
                          onChange={(e) =>
                            onUpdateModule(ckt.id, {
                              ratingAmps: Number(e.target.value),
                            })
                          }
                          className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 font-mono text-slate-200"
                        >
                          {STANDARD_BREAKER_RATINGS.map((r) => (
                            <option key={r} value={r}>
                              {r}A
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {hasError ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px]"
                          title={
                            isOverloaded
                              ? `Corrente (${current}A) > Disjuntor (${ckt.ratingAmps}A)`
                              : `Disjuntor (${ckt.ratingAmps}A) > Capacidade do Cabo (${maxWireAmps}A)`
                          }
                        >
                          <AlertCircle className="w-3 h-3" />
                          {isOverloaded ? 'Sobrecarga' : 'Cabo Fino'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          OK ({maxWireAmps}A)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onDeleteModule(ckt.id)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white transition"
                        title="Remover circuito"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-950 font-bold text-slate-200 border-t border-slate-800">
                <td colSpan={5} className="py-3 px-3 text-right uppercase text-[11px] text-slate-400">
                  Totais Instalados no Quadro:
                </td>
                <td className="py-3 px-3 font-mono text-amber-400">
                  {balance.totalWatts} W
                </td>
                <td colSpan={7} className="py-3 px-3 font-mono text-xs text-slate-300">
                  Fase R: {balance.ampsR}A ({balance.wattsR}W) &nbsp;|&nbsp; Fase S: {balance.ampsS}A ({balance.wattsS}W)
                  {config.supplyType === 'tri' &&
                    `  |  Fase T: ${balance.ampsT}A (${balance.wattsT}W)`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
