import React, { useState } from 'react';
import {
  Plus,
  Scale,
  Trash2,
  Wand2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  LayoutGrid,
  Table as TableIcon,
  Lightbulb,
  Zap,
  Flame,
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
  calculateVoltageDrop,
  checkDrRequirement,
  getCircuitPowerFactor,
  getTable59ReserveStatus,
  isLoadCircuit,
  GROUPING_FACTORS_TABLE,
  STANDARD_BREAKER_RATINGS,
  WIRE_AMPACITY_TABLE,
} from '../utils/electrical';

interface CircuitScheduleViewProps {
  config: PanelConfig;
  onUpdateModule: (id: string, partial: Partial<PanelModule>) => void;
  onDeleteModule: (id: string) => void;
  onQuickAddCircuit: () => void;
  onQuickAddRcbo?: () => void;
  onOpenBalancePreview: () => void;
  onAutoDimensionAll: () => void;
  onOpenBreakerRecalculatePreview?: () => void;
}

export const CircuitScheduleView: React.FC<CircuitScheduleViewProps> = ({
  config,
  onUpdateModule,
  onDeleteModule,
  onQuickAddCircuit,
  onQuickAddRcbo,
  onOpenBalancePreview,
  onAutoDimensionAll,
  onOpenBreakerRecalculatePreview,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'cards';
    }
    return 'table';
  });

  const circuits = config.modules
    .filter(isLoadCircuit)
    .sort((a, b) => (a.circuitNumber || 99) - (b.circuitNumber || 99));

  const idrs = config.modules.filter((m) => m.category === 'idr');
  const mainBreaker = config.modules.find((m) => m.category === 'main_breaker');
  const upstreamRating = mainBreaker?.ratingAmps || 63;

  const balance = calculatePhaseBalance(config);
  const reserveStatus = getTable59ReserveStatus(config);

  return (
    <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-slate-950 space-y-4 sm:space-y-6">
      {/* Header & Bulk Actions */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              Quadro de Cargas e Dimensionamento NBR 5410
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Aterramento: {config.groundingSystem || 'TN-S'}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                reserveStatus.isCompliant
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
              title={`NBR 5410 Tabela 59: ${reserveStatus.requiredReserve} módulos de reserva exigidos para ${reserveStatus.circuitCount} circuitos`}
            >
              Reserva Tab. 59: {reserveStatus.freeSlots} livres / {reserveStatus.requiredReserve} mín.
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Edite potências, tensões, fases e bitolas diretamente na planilha — o diagrama do QDC é atualizado em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle (Cards vs Tabela) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs w-full sm:w-auto justify-center">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                viewMode === 'cards'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Visualização em Cards compactos (Ideal para telas de celular)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                viewMode === 'table'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tabela técnica completa NBR 5410"
            >
              <TableIcon className="w-3.5 h-3.5" />
              Tabela
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                if (onOpenBreakerRecalculatePreview) {
                  onOpenBreakerRecalculatePreview();
                } else if (onAutoDimensionAll) {
                  onAutoDimensionAll();
                }
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-medium transition"
              title="Recalcular automaticamente os disjuntores de todos os circuitos"
            >
              <Wand2 className="w-4 h-4 shrink-0" />
              <span>Recalcular</span>
            </button>
            <button
              onClick={onOpenBalancePreview}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
            >
              <Scale className="w-4 h-4 shrink-0" />
              <span>Balancear</span>
            </button>
            <button
              onClick={onQuickAddCircuit}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Circuito</span>
            </button>
            {onQuickAddRcbo && (
              <button
                onClick={onQuickAddRcbo}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-sm"
                title="Adicionar novo circuito com Disjuntor DR individual (RCBO)"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>DR</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sectoral IDRs Overview */}
      {idrs.length > 0 && (
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
              <ShieldCheck className="w-4 h-4" />
              IDRs Setoriais & Coordenação NBR 5410 ({idrs.length} {idrs.length === 1 ? 'dispositivo' : 'dispositivos'})
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {idrs.map((idr) => {
              const assigned = circuits.filter(
                (c) =>
                  c.category === 'breaker' &&
                  (c.idrId === idr.id || (!c.idrId && idrs.length === 1 && c.drProtected))
              );
              const sumIb = +assigned
                .reduce((acc, c) => acc + calculateCircuitCurrent(c), 0)
                .toFixed(1);
              const isProtectedByMain = upstreamRating <= idr.ratingAmps;
              const isOver = !isProtectedByMain && sumIb > idr.ratingAmps;

              return (
                <div
                  key={idr.id}
                  className={`p-3 rounded-lg border text-xs space-y-2 ${
                    isOver
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{idr.name}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                      {idr.ratingAmps}A • {idr.sensitivityMa || 30}mA
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Circuitos ({assigned.length}):</span>
                    <span className="font-mono text-slate-200">
                      {assigned.length > 0
                        ? assigned.map((c) => `C${c.circuitNumber || '?'}`).join(', ')
                        : 'Nenhum'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Carga Ativa Σ Ib:</span>
                    <span
                      className={`font-mono font-bold ${
                        isOver ? 'text-rose-400' : 'text-slate-200'
                      }`}
                    >
                      {sumIb} A / {idr.ratingAmps} A
                    </span>
                  </div>
                  <div className="text-[10px]">
                    {isProtectedByMain ? (
                      <span className="text-emerald-400">
                        ✓ Protegido pelo Disjuntor Geral ({upstreamRating}A)
                      </span>
                    ) : isOver ? (
                      <span className="text-rose-400 font-bold">
                        ⚠️ Sobrecarga! Excede {idr.ratingAmps}A
                      </span>
                    ) : (
                      <span className="text-sky-300">
                        ✓ Carga dentro da capacidade nominal
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area: Cards Mode OR Table Mode */}
      {viewMode === 'cards' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {circuits.map((ckt, idx) => {
              const current = calculateCircuitCurrent(ckt);
              const pf = getCircuitPowerFactor(ckt);
              const fca = ckt.groupingFactor && ckt.groupingFactor > 0 ? ckt.groupingFactor : 1.0;
              const length = ckt.lengthMeters !== undefined && ckt.lengthMeters > 0 ? ckt.lengthMeters : 15;
              const vDrop = calculateVoltageDrop(ckt);
              const wireRow = WIRE_AMPACITY_TABLE.find((w) => w.gaugeMm2 === ckt.wireGaugeMm2);
              const baseWireAmps = wireRow ? (ckt.poles >= 3 ? wireRow.maxAmps3P : wireRow.maxAmps2P) : 24;
              const effectiveWireAmps = +(baseWireAmps * fca).toFixed(1);
              const isOverloaded = current > ckt.ratingAmps;
              const isWireUndersized = ckt.ratingAmps > effectiveWireAmps;
              const isDropExcessive = vDrop.isExcessive;
              const isRcbo = ckt.category === 'rcbo';
              const isDrProtected = isRcbo || ckt.drProtected || Boolean(ckt.idrId);
              const drReq = checkDrRequirement(ckt);
              const hasDrError = drReq.mandatory && !isDrProtected && config.groundingSystem !== 'TN-C';
              const hasError = isOverloaded || isWireUndersized || isDropExcessive || hasDrError;

              return (
                <div
                  key={ckt.id}
                  className={`bg-slate-900 border rounded-xl p-3.5 sm:p-4 space-y-3 shadow-lg transition ${
                    hasError
                      ? 'border-rose-500/40 bg-slate-900/95 ring-1 ring-rose-500/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top row: Circuit ID, Name, and Trash */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-extrabold text-xs shrink-0 ${
                          isRcbo
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        {isRcbo ? `DDR C${ckt.circuitNumber || idx + 1}` : `C${ckt.circuitNumber || idx + 1}`}
                      </span>
                      <input
                        type="text"
                        value={ckt.name}
                        onChange={(e) => onUpdateModule(ckt.id, { name: e.target.value })}
                        placeholder="Nome do circuito"
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-bold text-xs w-full focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={() => onDeleteModule(ckt.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white transition shrink-0"
                      title="Remover circuito"
                      aria-label="Remover circuito"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Room & Load Type with Icon */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ckt.room || ''}
                      onChange={(e) => onUpdateModule(ckt.id, { room: e.target.value })}
                      placeholder="Ambiente / Cômodo"
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-[11px] flex-1 focus:border-amber-500 focus:outline-none"
                    />

                    <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2 py-1 shrink-0">
                      {ckt.circuitType === 'lighting' ? (
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : ckt.circuitType === 'tue' ? (
                        <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      )}
                      <select
                        value={ckt.circuitType}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, {
                            circuitType: e.target.value as PanelModule['circuitType'],
                          })
                        }
                        className="bg-transparent text-[11px] font-medium text-slate-200 focus:outline-none cursor-pointer"
                      >
                        <option value="lighting" className="bg-slate-900">Ilum.</option>
                        <option value="tug" className="bg-slate-900">TUG</option>
                        <option value="tue" className="bg-slate-900">TUE</option>
                      </select>
                    </div>
                  </div>

                  {/* Electrical Parameters Grid */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block">Potência</label>
                      <div className="flex items-center gap-0.5 mt-0.5">
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
                          className="bg-slate-900 border border-slate-800 rounded px-1.5 py-1 font-mono text-amber-300 font-bold text-xs w-full focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-500 font-mono">W</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block">Tensão</label>
                      <select
                        value={ckt.voltage}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, {
                            voltage: Number(e.target.value) as 127 | 220 | 380,
                          })
                        }
                        className="mt-0.5 bg-slate-900 border border-slate-800 rounded px-1.5 py-1 font-mono text-slate-200 text-xs w-full focus:border-amber-500 focus:outline-none"
                      >
                        <option value={127}>127V</option>
                        <option value={220}>220V</option>
                        <option value={380}>380V</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block">Corrente Ib</label>
                      <div className="mt-0.5 py-1 px-1.5 rounded bg-slate-900/90 border border-slate-800/80 text-center">
                        <span className="font-mono font-bold text-slate-100 text-xs">{current} A</span>
                      </div>
                    </div>
                  </div>

                  {/* Protection, Wire & Phases Quick Controls */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Disjuntor */}
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block">Disjuntor</label>
                      <div className="flex items-center gap-1 mt-0.5">
                        <select
                          value={ckt.curve || 'C'}
                          onChange={(e) => onUpdateModule(ckt.id, { curve: e.target.value as CurveType })}
                          className="bg-slate-950 border border-slate-800 rounded px-1 py-1 font-mono text-[11px] text-slate-200 w-8 text-center focus:border-amber-500 focus:outline-none"
                        >
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                        <select
                          value={ckt.ratingAmps}
                          onChange={(e) => onUpdateModule(ckt.id, { ratingAmps: Number(e.target.value) })}
                          className={`bg-slate-950 border rounded px-1 py-1 font-mono text-[11px] font-bold flex-1 text-center focus:outline-none ${
                            isOverloaded ? 'border-rose-500 text-rose-300' : 'border-slate-800 text-slate-200 focus:border-amber-500'
                          }`}
                        >
                          {STANDARD_BREAKER_RATINGS.map((r) => (
                            <option key={r} value={r}>
                              {r}A
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Condutor / Cabo */}
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block">Cabo</label>
                      <select
                        value={ckt.wireGaugeMm2}
                        onChange={(e) => onUpdateModule(ckt.id, { wireGaugeMm2: Number(e.target.value) })}
                        className={`mt-0.5 bg-slate-950 border rounded px-1 py-1 font-mono text-[11px] font-bold w-full text-center focus:outline-none ${
                          isWireUndersized ? 'border-rose-500 text-rose-300' : 'border-slate-800 text-slate-200 focus:border-amber-500'
                        }`}
                        title={`Capacidade de corrente (Iz): ${effectiveWireAmps}A`}
                      >
                        {WIRE_AMPACITY_TABLE.map((w) => (
                          <option key={w.gaugeMm2} value={w.gaugeMm2}>
                            {w.gaugeMm2} mm²
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Fases & Polos */}
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block">Fase(s)</label>
                      <div className="flex items-center gap-1 mt-0.5">
                        <select
                          value={ckt.poles}
                          onChange={(e) => {
                            const poles = Number(e.target.value) as 1 | 2 | 3 | 4;
                            const phases: PhaseAssignment =
                              poles === 1 ? 'R' : poles === 2 ? 'RS' : 'RST';
                            onUpdateModule(ckt.id, {
                              poles,
                              phases,
                              voltage: poles === 1 ? 127 : 220,
                            });
                          }}
                          className="bg-slate-950 border border-slate-800 rounded px-1 py-1 font-mono text-[11px] text-slate-200 w-10 text-center focus:border-amber-500 focus:outline-none"
                        >
                          <option value={1}>{isRcbo ? '1P+N' : '1P'}</option>
                          <option value={2}>2P</option>
                          <option value={3}>3P</option>
                          <option value={4}>{isRcbo ? '3P+N' : '4P'}</option>
                        </select>
                        <select
                          value={ckt.phases}
                          onChange={(e) => onUpdateModule(ckt.id, { phases: e.target.value as PhaseAssignment })}
                          className="bg-slate-950 border border-slate-800 rounded px-1 py-1 font-mono font-bold text-[11px] text-slate-100 flex-1 text-center focus:border-amber-500 focus:outline-none"
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
                              <option value="RS">RS</option>
                              <option value="ST">ST</option>
                              <option value="RT">RT</option>
                            </>
                          )}
                          {ckt.poles >= 3 && <option value="RST">RST</option>}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Voltage Drop & DR Protection Row */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs">
                    {/* Voltage Drop */}
                    <div
                      className="flex items-center gap-1 text-[11px]"
                      title={`Queda de tensão calculada: ${vDrop.dropPercent}% (${vDrop.dropVolts}V) - Limite NBR 5410: 4%`}
                    >
                      <span className="text-slate-400">ΔV:</span>
                      <span
                        className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          isDropExcessive
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {vDrop.dropPercent}% ({vDrop.dropVolts}V)
                      </span>
                    </div>

                    {/* DR Protection */}
                    <div className="flex items-center gap-1 text-[11px]">
                      {isRcbo ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={ckt.sensitivityMa || 30}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__convert_breaker__') {
                                onUpdateModule(ckt.id, {
                                  category: 'breaker',
                                  drProtected: false,
                                  idrId: undefined,
                                });
                              } else {
                                onUpdateModule(ckt.id, {
                                  sensitivityMa: Number(val),
                                });
                              }
                            }}
                            className="bg-slate-950 border border-emerald-500/50 rounded px-1.5 py-0.5 font-mono text-emerald-300 text-[10px] font-semibold"
                          >
                            <option value={10}>DDR 10mA</option>
                            <option value={30}>DDR 30mA</option>
                            <option value={300}>DDR 300mA</option>
                            <option value="__convert_breaker__">→ Comum</option>
                          </select>
                        </div>
                      ) : idrs.length > 1 ? (
                        <select
                          value={ckt.idrId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__convert_rcbo__') {
                              onUpdateModule(ckt.id, {
                                category: 'rcbo',
                                drProtected: true,
                                idrId: undefined,
                                sensitivityMa: 30,
                              });
                            } else if (!val) {
                              onUpdateModule(ckt.id, { drProtected: false, idrId: undefined });
                            } else {
                              onUpdateModule(ckt.id, { drProtected: true, idrId: val });
                            }
                          }}
                          className={`bg-slate-950 border rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            isDrProtected
                              ? 'text-emerald-300 border-slate-700'
                              : drReq.mandatory
                              ? 'text-rose-300 border-rose-500/50'
                              : 'text-slate-400 border-slate-800'
                          }`}
                        >
                          <option value="">Sem DR</option>
                          {idrs.map((idr) => (
                            <option key={idr.id} value={idr.id}>
                              {idr.name}
                            </option>
                          ))}
                          <option value="__convert_rcbo__">★ RCBO</option>
                        </select>
                      ) : (
                        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={Boolean(ckt.drProtected || ckt.idrId)}
                            onChange={(e) =>
                              onUpdateModule(ckt.id, {
                                drProtected: e.target.checked,
                                idrId: e.target.checked && idrs.length === 1 ? idrs[0].id : undefined,
                              })
                            }
                            className="rounded accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span
                            className={`text-[11px] font-semibold ${
                              isDrProtected
                                ? 'text-emerald-400'
                                : drReq.mandatory
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {isDrProtected ? 'Com DR' : drReq.mandatory ? 'Falta DR' : 'Sem DR'}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Compliance Alerts Pill */}
                  {hasError ? (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {isOverloaded && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px]">
                          <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                          Sobrecarga ({current}A &gt; {ckt.ratingAmps}A)
                        </span>
                      )}
                      {isWireUndersized && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px]">
                          <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                          Cabo Fino (Iz {effectiveWireAmps}A &lt; {ckt.ratingAmps}A)
                        </span>
                      )}
                      {isDropExcessive && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px]">
                          <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                          Queda ΔV {vDrop.dropPercent}% &gt; 4%
                        </span>
                      )}
                      {hasDrError && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px]">
                          <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                          Falta DR NBR 5410
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Conforme NBR 5410 (Iz = {effectiveWireAmps}A • ΔV = {vDrop.dropPercent}%)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Totals Summary Card in Cards Mode */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total Instalado no Quadro
              </div>
              <div className="text-lg font-mono font-extrabold text-amber-400 mt-0.5">
                {balance.totalWatts} W
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-slate-300 text-xs">
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">
                Fase R: <strong className="text-red-400">{balance.ampsR}A</strong> ({balance.wattsR}W)
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">
                Fase S: <strong className="text-amber-400">{balance.ampsS}A</strong> ({balance.wattsS}W)
              </span>
              {config.supplyType === 'tri' && (
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">
                  Fase T: <strong className="text-sky-400">{balance.ampsT}A</strong> ({balance.wattsT}W)
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Interactive Circuit Schedule Table */
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
          {/* Mobile Table Scroll Helper Banner */}
          <div className="md:hidden flex items-center justify-between px-3.5 py-2 bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400">
            <span>← Deslize para navegar pelas colunas →</span>
            <button
              onClick={() => setViewMode('cards')}
              className="text-amber-400 font-bold hover:underline"
            >
              Mudar p/ Cards
            </button>
          </div>

          <div className="overflow-x-auto scroll-smooth touch-pan-x">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-2 sticky left-0 bg-slate-950 z-20 shadow-[1px_0_0_0_#1e293b]">Circ.</th>
                  <th className="py-3 px-2">Descrição do Circuito</th>
                <th className="py-3 px-2">Ambiente</th>
                <th className="py-3 px-2">Tipo</th>
                <th className="py-3 px-2">Tensão</th>
                <th className="py-3 px-2">Potência (W)</th>
                <th className="py-3 px-2">cos φ</th>
                <th className="py-3 px-2">Corrente (Ib)</th>
                <th className="py-3 px-2">Polos</th>
                <th className="py-3 px-2">Fase(s)</th>
                <th className="py-3 px-2">Compr. (L)</th>
                <th className="py-3 px-2">FCA</th>
                <th className="py-3 px-2">Cabo (mm²)</th>
                <th className="py-3 px-2">Disjuntor</th>
                <th className="py-3 px-2">Queda (ΔV)</th>
                <th className="py-3 px-2">Prot. DR</th>
                <th className="py-3 px-2">Status NBR</th>
                <th className="py-3 px-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {circuits.map((ckt, idx) => {
                const current = calculateCircuitCurrent(ckt);
                const pf = getCircuitPowerFactor(ckt);
                const fca = ckt.groupingFactor && ckt.groupingFactor > 0 ? ckt.groupingFactor : 1.0;
                const length = ckt.lengthMeters !== undefined && ckt.lengthMeters > 0 ? ckt.lengthMeters : 15;
                const vDrop = calculateVoltageDrop(ckt);
                const wireRow = WIRE_AMPACITY_TABLE.find(
                  (w) => w.gaugeMm2 === ckt.wireGaugeMm2
                );
                const baseWireAmps = wireRow
                  ? ckt.poles >= 3
                    ? wireRow.maxAmps3P
                    : wireRow.maxAmps2P
                  : 24;
                const effectiveWireAmps = +(baseWireAmps * fca).toFixed(1);
                const isOverloaded = current > ckt.ratingAmps;
                const isWireUndersized = ckt.ratingAmps > effectiveWireAmps;
                const isDropExcessive = vDrop.isExcessive;
                const isRcbo = ckt.category === 'rcbo';
                const isDrProtected = isRcbo || ckt.drProtected || Boolean(ckt.idrId);
                const drReq = checkDrRequirement(ckt);
                const hasDrError =
                  drReq.mandatory && !isDrProtected && config.groundingSystem !== 'TN-C';
                const hasError = isOverloaded || isWireUndersized || isDropExcessive || hasDrError;

                return (
                  <tr
                    key={ckt.id}
                    className="hover:bg-slate-800/40 transition"
                  >
                    <td className="py-2.5 px-2 font-mono font-bold text-amber-400 sticky left-0 bg-slate-900 z-10 shadow-[1px_0_0_0_#1e293b]">
                      C{ckt.circuitNumber || idx + 1}
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={ckt.name}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, { name: e.target.value })
                        }
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 w-36"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={ckt.room || ''}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, { room: e.target.value })
                        }
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 w-28"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <select
                        value={ckt.circuitType}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, {
                            circuitType: e.target.value as PanelModule['circuitType'],
                          })
                        }
                        className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200"
                      >
                        <option value="lighting">Ilum.</option>
                        <option value="tug">TUG</option>
                        <option value="tue">TUE</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-2">
                      <select
                        value={ckt.voltage}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, {
                            voltage: Number(e.target.value) as 127 | 220 | 380,
                          })
                        }
                        className="bg-slate-950 border border-slate-800 rounded px-1 py-1 font-mono text-slate-200"
                      >
                        <option value={127}>127V</option>
                        <option value={220}>220V</option>
                        <option value={380}>380V</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-2">
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
                        className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 font-mono text-amber-300 w-20"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        min={0.2}
                        max={1.0}
                        step={0.05}
                        value={pf}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, {
                            powerFactor: Math.max(0.2, Math.min(1.0, Number(e.target.value))),
                          })
                        }
                        title="Fator de Potência cos φ (1.0 resistivo, 0.85 motores/refrigeração)"
                        className="bg-slate-950 border border-slate-800 rounded px-1 py-1 font-mono text-slate-200 w-14 text-center"
                      />
                    </td>
                    <td className="py-2.5 px-2 font-mono font-semibold text-slate-200 whitespace-nowrap">
                      {current} A
                    </td>
                    <td className="py-2.5 px-2">
                      <select
                        value={ckt.poles}
                        onChange={(e) => {
                          const poles = Number(e.target.value) as 1 | 2 | 3 | 4;
                          const phases: PhaseAssignment =
                            poles === 1 ? 'R' : poles === 2 ? 'RS' : 'RST';
                          onUpdateModule(ckt.id, {
                            poles,
                            phases,
                            voltage: poles === 1 ? 127 : 220,
                          });
                        }}
                        className="bg-slate-950 border border-slate-800 rounded px-1 py-1 font-mono text-slate-200"
                      >
                        <option value={1}>{isRcbo ? '1P+N' : '1P'}</option>
                        <option value={2}>2P</option>
                        <option value={3}>3P</option>
                        <option value={4}>{isRcbo ? '3P+N' : '4P'}</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-2">
                      <select
                        value={ckt.phases}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, {
                            phases: e.target.value as PhaseAssignment,
                          })
                        }
                        className="bg-slate-950 border border-slate-800 rounded px-1 py-1 font-mono font-bold text-slate-100"
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
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={300}
                          step={1}
                          value={length}
                          onChange={(e) =>
                            onUpdateModule(ckt.id, {
                              lengthMeters: Math.max(1, Number(e.target.value)),
                            })
                          }
                          title="Comprimento linear do circuito em metros (QDC à carga)"
                          className="bg-slate-950 border border-slate-800 rounded px-1 py-1 font-mono text-slate-200 w-12 text-center"
                        />
                        <span className="text-[10px] text-slate-500 font-mono">m</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <select
                        value={fca}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, {
                            groupingFactor: Number(e.target.value),
                          })
                        }
                        title={`Fator de Agrupamento FCA (Tab. 42 NBR 5410) = ${fca.toFixed(2)}`}
                        className="bg-slate-950 border border-slate-800 rounded px-1 py-1 font-mono text-slate-200 text-[11px]"
                      >
                        {GROUPING_FACTORS_TABLE.map((opt) => (
                          <option key={opt.circuitsCount} value={opt.fca}>
                            {opt.circuitsCount} ckt ({opt.fca.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-2">
                      <select
                        value={ckt.wireGaugeMm2}
                        onChange={(e) =>
                          onUpdateModule(ckt.id, {
                            wireGaugeMm2: Number(e.target.value),
                          })
                        }
                        title={`Iz corrigido com FCA ${fca}: ${effectiveWireAmps}A (capacidade base: ${baseWireAmps}A)`}
                        className={`bg-slate-950 border rounded px-1.5 py-1 font-mono text-slate-200 ${
                          isWireUndersized ? 'border-rose-500 text-rose-300' : 'border-slate-800'
                        }`}
                      >
                        {WIRE_AMPACITY_TABLE.map((w) => (
                          <option key={w.gaugeMm2} value={w.gaugeMm2}>
                            {w.gaugeMm2} mm²
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-2">
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
                          <option value="D">D</option>
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
                    <td className="py-2.5 px-2">
                      <div
                        className="flex items-center gap-1 whitespace-nowrap"
                        title={`Queda de tensão no circuito: ${vDrop.dropPercent}% (${vDrop.dropVolts}V) - Limite: 4%`}
                      >
                        <span
                          className={`font-mono font-bold ${
                            isDropExcessive ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {vDrop.dropPercent}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({vDrop.dropVolts}V)
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      {isRcbo ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={ckt.sensitivityMa || 30}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__convert_breaker__') {
                                onUpdateModule(ckt.id, {
                                  category: 'breaker',
                                  drProtected: false,
                                  idrId: undefined,
                                });
                              } else {
                                onUpdateModule(ckt.id, {
                                  sensitivityMa: Number(val),
                                });
                              }
                            }}
                            className="bg-slate-950 border border-emerald-500/50 rounded px-1.5 py-1 font-mono text-emerald-300 text-[11px] font-semibold"
                            title="Disjuntor DR Combinado (RCBO). Altere a sensibilidade ou converta para disjuntor comum."
                          >
                            <option value={10}>DDR 10mA</option>
                            <option value={30}>DDR 30mA</option>
                            <option value={300}>DDR 300mA</option>
                            <option value="__convert_breaker__">→ Mudar p/ Comum</option>
                          </select>
                        </div>
                      ) : idrs.length > 1 ? (
                        <select
                          value={ckt.idrId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__convert_rcbo__') {
                              onUpdateModule(ckt.id, {
                                category: 'rcbo',
                                drProtected: true,
                                idrId: undefined,
                                sensitivityMa: 30,
                              });
                            } else if (!val) {
                              onUpdateModule(ckt.id, { drProtected: false, idrId: undefined });
                            } else {
                              onUpdateModule(ckt.id, { drProtected: true, idrId: val });
                            }
                          }}
                          className={`bg-slate-950 border rounded px-1 py-1 text-[11px] font-medium w-28 ${
                            isDrProtected
                              ? 'text-emerald-300 border-slate-700'
                              : drReq.mandatory
                              ? 'text-rose-300 border-rose-500/50'
                              : 'text-slate-400 border-slate-800'
                          }`}
                        >
                          <option value="">Sem DR</option>
                          {idrs.map((idr) => (
                            <option key={idr.id} value={idr.id}>
                              {idr.name.length > 14 ? idr.name.slice(0, 13) + '…' : idr.name} ({idr.ratingAmps}A)
                            </option>
                          ))}
                          <option value="__convert_rcbo__">★ Disjuntor DR (RCBO)</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(ckt.drProtected || ckt.idrId)}
                              onChange={(e) =>
                                onUpdateModule(ckt.id, {
                                  drProtected: e.target.checked,
                                  idrId: e.target.checked && idrs.length === 1 ? idrs[0].id : undefined,
                                })
                              }
                              className="rounded accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span
                              className={`text-[11px] font-medium whitespace-nowrap ${
                                isDrProtected
                                  ? 'text-emerald-400 font-semibold'
                                  : drReq.mandatory
                                  ? 'text-rose-400 font-bold'
                                  : 'text-slate-400'
                              }`}
                              title={drReq.mandatory ? drReq.reason : 'Proteção por IDR'}
                            >
                              {isDrProtected
                                ? 'Com DR'
                                : drReq.mandatory
                                ? 'Falta DR'
                                : 'Sem DR'}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateModule(ckt.id, {
                                category: 'rcbo',
                                drProtected: true,
                                idrId: undefined,
                                sensitivityMa: 30,
                              })
                            }
                            className="px-1 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                            title="Converter em Disjuntor DR individual (RCBO)"
                          >
                            +RCBO
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      {hasError ? (
                        <div className="flex flex-col gap-1 items-start">
                          {isOverloaded && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] whitespace-nowrap"
                              title={`Corrente (${current}A) > Disjuntor (${ckt.ratingAmps}A)`}
                            >
                              <AlertCircle className="w-3 h-3" />
                              Sobrecarga
                            </span>
                          )}
                          {isWireUndersized && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] whitespace-nowrap"
                              title={`Disjuntor (${ckt.ratingAmps}A) > Capacidade do Cabo com FCA ${fca} (${effectiveWireAmps}A)`}
                            >
                              <AlertCircle className="w-3 h-3" />
                              Cabo Fino (FCA)
                            </span>
                          )}
                          {isDropExcessive && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] whitespace-nowrap"
                              title={`Queda de tensão (${vDrop.dropPercent}%) > Limite de 4% da NBR 5410`}
                            >
                              <AlertCircle className="w-3 h-3" />
                              Queda &gt; 4%
                            </span>
                          )}
                          {hasDrError && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] whitespace-nowrap"
                              title={`NBR 5410: ${drReq.reason}`}
                            >
                              <AlertCircle className="w-3 h-3" />
                              Falta DR
                            </span>
                          )}
                        </div>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] whitespace-nowrap"
                          title={`Em conformidade: Iz = ${effectiveWireAmps}A (com FCA ${fca}), Queda ΔV = ${vDrop.dropPercent}%`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          OK ({vDrop.dropPercent}%)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right">
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
                <td className="py-3 px-2 font-mono text-amber-400">
                  {balance.totalWatts} W
                </td>
                <td colSpan={12} className="py-3 px-3 font-mono text-xs text-slate-300">
                  Fase R: {balance.ampsR}A ({balance.wattsR}W) &nbsp;|&nbsp; Fase S: {balance.ampsS}A ({balance.wattsS}W)
                  {config.supplyType === 'tri' &&
                    `  |  Fase T: ${balance.ampsT}A (${balance.wattsT}W)`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};
