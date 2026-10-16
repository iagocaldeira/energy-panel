import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Scale,
  Settings2,
  Trash2,
  Wand2,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  CurveType,
  PanelConfig,
  PanelModule,
  PhaseAssignment,
  RailId,
} from '../types/panel';
import {
  calculateCircuitCurrent,
  calculatePhaseBalance,
  getCircuitsByPhase,
  getRecommendedBreakerRating,
  getRecommendedWireGauge,
  STANDARD_BREAKER_RATINGS,
  validatePanelNBR5410,
  WIRE_AMPACITY_TABLE,
} from '../utils/electrical';

interface InspectorPanelProps {
  config: PanelConfig;
  selectedModule: PanelModule | null;
  onUpdateModule: (id: string, partial: Partial<PanelModule>) => void;
  onMoveModule: (moduleId: string, targetRail: RailId, targetSlot: number) => void;
  onDeleteModule: (id: string) => void;
  onDuplicateModule: (id: string) => void;
  onNudgeModule: (id: string, delta: number) => void;
  onSelectModule: (id: string | null) => void;
  onOpenBalancePreview: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  config,
  selectedModule,
  onUpdateModule,
  onMoveModule,
  onDeleteModule,
  onDuplicateModule,
  onNudgeModule,
  onSelectModule,
  onOpenBalancePreview,
}) => {
  const [expandedPhase, setExpandedPhase] = useState<'R' | 'S' | 'T' | null>(null);

  const balance = calculatePhaseBalance(config);
  const issues = validatePanelNBR5410(config);
  const mainBreaker = config.modules.find((m) => m.category === 'main_breaker');
  const maxRefAmps = mainBreaker?.ratingAmps || 63;

  const availableRailOptions: { id: RailId; label: string }[] =
    config.topology === 'fishbone'
      ? [
          { id: 'top_main', label: 'Trilho Superior' },
          { id: 'left_rail', label: 'Coluna Esquerda' },
          { id: 'right_rail', label: 'Coluna Direita' },
        ]
      : ([
          { id: 'row_1', label: 'Trilho Horizontal 1' },
          { id: 'row_2', label: 'Trilho Horizontal 2' },
          { id: 'row_3', label: 'Trilho Horizontal 3' },
          { id: 'row_4', label: 'Trilho Horizontal 4' },
        ].slice(0, config.horizontalRows) as { id: RailId; label: string }[]);

  const handleAutoSizeModule = (m: PanelModule) => {
    const current = calculateCircuitCurrent(m);
    const recBreaker = getRecommendedBreakerRating(current, m.circuitType);
    const recWire = getRecommendedWireGauge(current, recBreaker, m.circuitType, m.poles);
    onUpdateModule(m.id, {
      ratingAmps: recBreaker,
      wireGaugeMm2: recWire,
    });
  };

  const phaseRows: {
    phase: 'R' | 'S' | 'T';
    label: string;
    amps: number;
    watts: number;
    textColor: string;
    barColor: string;
  }[] = [
    {
      phase: 'R',
      label: 'Fase R',
      amps: balance.ampsR,
      watts: balance.wattsR,
      textColor: 'text-red-400',
      barColor: 'bg-red-500',
    },
    ...(config.supplyType !== 'mono'
      ? [
          {
            phase: 'S' as const,
            label: 'Fase S',
            amps: balance.ampsS,
            watts: balance.wattsS,
            textColor: 'text-yellow-400',
            barColor: 'bg-yellow-400',
          },
        ]
      : []),
    ...(config.supplyType === 'tri'
      ? [
          {
            phase: 'T' as const,
            label: 'Fase T',
            amps: balance.ampsT,
            watts: balance.wattsT,
            textColor: 'text-slate-200',
            barColor: 'bg-slate-200',
          },
        ]
      : []),
  ];

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-y-auto select-none">
      {/* Selected Component Editor */}
      {selectedModule ? (
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Settings2 className="w-3.5 h-3.5" />
              Propriedades
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onNudgeModule(selectedModule.id, -1)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Mover para posição anterior"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNudgeModule(selectedModule.id, 1)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Mover para próxima posição"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDuplicateModule(selectedModule.id)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Duplicar componente"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDeleteModule(selectedModule.id)}
                className="p-1 rounded bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white transition"
                title="Excluir componente"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[10px] text-slate-400 mb-1">
                Nome do Componente
              </label>
              <input
                type="text"
                value={selectedModule.name}
                onChange={(e) =>
                  onUpdateModule(selectedModule.id, { name: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Nº Circuito</label>
              <input
                type="number"
                min={1}
                max={99}
                value={selectedModule.circuitNumber || ''}
                onChange={(e) =>
                  onUpdateModule(selectedModule.id, {
                    circuitNumber: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="-"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-100 font-mono"
              />
            </div>
          </div>

          {selectedModule.category === 'breaker' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Ambiente</label>
                <input
                  type="text"
                  value={selectedModule.room || ''}
                  onChange={(e) =>
                    onUpdateModule(selectedModule.id, { room: e.target.value })
                  }
                  placeholder="Ex: Cozinha, Suíte"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Finalidade</label>
                <select
                  value={selectedModule.circuitType}
                  onChange={(e) =>
                    onUpdateModule(selectedModule.id, {
                      circuitType: e.target.value as PanelModule['circuitType'],
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-100"
                >
                  <option value="lighting">Iluminação</option>
                  <option value="tug">Tomadas Uso Geral</option>
                  <option value="tue">Uso Específico</option>
                </select>
              </div>
            </div>
          )}

          {/* Poles, Amperage, Curve (or DPS Connection) */}
          {selectedModule.category === 'dps' ? (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Ligação DPS
                </label>
                <select
                  value={selectedModule.phases}
                  onChange={(e) =>
                    onUpdateModule(selectedModule.id, {
                      phases: e.target.value as PhaseAssignment,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-100 font-semibold"
                >
                  <option value="R">Fase R</option>
                  <option value="S">Fase S</option>
                  <option value="T">Fase T</option>
                  <option value="N">Neutro (N)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Tensão Máx.
                </label>
                <select
                  value={selectedModule.dpsVoltage || 275}
                  onChange={(e) =>
                    onUpdateModule(selectedModule.id, {
                      dpsVoltage: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-100 font-mono"
                >
                  <option value={275}>275V</option>
                  <option value={175}>175V</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Capacidade
                </label>
                <select
                  value={selectedModule.dpsKa || 20}
                  onChange={(e) =>
                    onUpdateModule(selectedModule.id, {
                      dpsKa: Number(e.target.value),
                      ratingAmps: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-100 font-mono"
                >
                  <option value={20}>20kA</option>
                  <option value={45}>45kA</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Polos</label>
                <select
                  value={selectedModule.poles}
                  onChange={(e) => {
                    const poles = Number(e.target.value) as 1 | 2 | 3 | 4;
                    const defaultPhase: PhaseAssignment =
                      poles === 1 ? 'R' : poles === 2 ? 'RS' : 'RST';
                    const defaultVolt = poles === 1 ? 127 : 220;
                    onUpdateModule(selectedModule.id, {
                      poles,
                      phases: defaultPhase,
                      voltage: defaultVolt,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-100"
                >
                  <option value={1}>1 Polo</option>
                  <option value={2}>2 Polos</option>
                  <option value={3}>3 Polos</option>
                  {selectedModule.category === 'idr' && <option value={4}>4 Polos</option>}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Corrente</label>
                <select
                  value={selectedModule.ratingAmps}
                  onChange={(e) =>
                    onUpdateModule(selectedModule.id, { ratingAmps: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-100 font-mono"
                >
                  {STANDARD_BREAKER_RATINGS.map((r) => (
                    <option key={r} value={r}>
                      {r}A
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Curva</label>
                <select
                  value={selectedModule.curve || 'C'}
                  onChange={(e) =>
                    onUpdateModule(selectedModule.id, { curve: e.target.value as CurveType })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-100"
                >
                  <option value="B">Curva B</option>
                  <option value="C">Curva C</option>
                  <option value="D">Curva D</option>
                </select>
              </div>
            </div>
          )}

          {/* Electrical Load, Voltage, Phase & Wire Gauge */}
          {selectedModule.category === 'breaker' && (
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Potência W</label>
                  <input
                    type="number"
                    step={100}
                    min={0}
                    value={selectedModule.powerWatts}
                    onChange={(e) =>
                      onUpdateModule(selectedModule.id, {
                        powerWatts: Math.max(0, Number(e.target.value)),
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Tensão</label>
                  <select
                    value={selectedModule.voltage}
                    onChange={(e) =>
                      onUpdateModule(selectedModule.id, {
                        voltage: Number(e.target.value) as 127 | 220 | 380,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                  >
                    <option value={127}>127V</option>
                    <option value={220}>220V</option>
                    <option value={380}>380V</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Fase</label>
                  <select
                    value={selectedModule.phases}
                    onChange={(e) =>
                      onUpdateModule(selectedModule.id, {
                        phases: e.target.value as PhaseAssignment,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                  >
                    {selectedModule.poles === 1 && (
                      <>
                        <option value="R">Fase R</option>
                        <option value="S">Fase S</option>
                        <option value="T">Fase T</option>
                      </>
                    )}
                    {selectedModule.poles === 2 && (
                      <>
                        <option value="RS">Fases RS</option>
                        <option value="ST">Fases ST</option>
                        <option value="RT">Fases RT</option>
                      </>
                    )}
                    {selectedModule.poles >= 3 && <option value="RST">Trifásico RST</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Bitola do Cabo
                </label>
                <select
                  value={selectedModule.wireGaugeMm2}
                  onChange={(e) =>
                    onUpdateModule(selectedModule.id, {
                      wireGaugeMm2: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                >
                  {WIRE_AMPACITY_TABLE.map((w) => (
                    <option key={w.gaugeMm2} value={w.gaugeMm2}>
                      {w.label} — máx {w.maxAmps2P}A
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                <span className="text-slate-400">
                  Corrente:{' '}
                  <strong className="text-slate-100 font-mono">
                    {calculateCircuitCurrent(selectedModule)} A
                  </strong>
                </span>
                <button
                  onClick={() => handleAutoSizeModule(selectedModule)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-medium transition"
                >
                  <Wand2 className="w-3 h-3" />
                  Auto-Dimensionar
                </button>
              </div>
            </div>
          )}

          {/* Rail & Position selector */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[10px] text-slate-400 mb-1">Trilho</label>
              <select
                value={selectedModule.railId}
                onChange={(e) =>
                  onMoveModule(
                    selectedModule.id,
                    e.target.value as RailId,
                    selectedModule.position
                  )
                }
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
              >
                {availableRailOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Posição</label>
              <input
                type="number"
                min={1}
                max={16}
                value={selectedModule.position + 1}
                onChange={(e) =>
                  onMoveModule(
                    selectedModule.id,
                    selectedModule.railId,
                    Math.max(0, Number(e.target.value) - 1)
                  )
                }
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-slate-800 text-xs text-slate-400 bg-slate-950/40">
          Clique em qualquer componente para editar ou arraste-o diretamente com o mouse para outra posição.
        </div>
      )}

      {/* Phase Load Balancing Section + Automatic Circuit Breakdown when Max Current Reached */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Equilíbrio de Fases
          </div>
          {config.supplyType !== 'mono' && (
            <button
              onClick={onOpenBalancePreview}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition"
            >
              <Scale className="w-3 h-3" />
              Balancear
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {phaseRows.map((row) => {
            const isOverMax = row.amps >= maxRefAmps;
            const isExpanded = isOverMax || expandedPhase === row.phase;
            const phaseCircuits = getCircuitsByPhase(config, row.phase);

            return (
              <div
                key={row.phase}
                className={`p-2 rounded-lg border transition ${
                  isOverMax
                    ? 'bg-rose-500/10 border-rose-500/40'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <div
                  onClick={() =>
                    setExpandedPhase((prev) => (prev === row.phase ? null : row.phase))
                  }
                  className="flex justify-between items-center text-xs mb-1.5 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold ${row.textColor}`}>{row.label}</span>
                    {isOverMax && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase">
                        Limite {maxRefAmps}A Excedido
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 font-mono text-slate-200">
                    <span className={isOverMax ? 'text-rose-400 font-bold' : ''}>
                      {row.amps}A / {maxRefAmps}A
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </div>

                <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full ${
                      isOverMax ? 'bg-rose-500' : row.barColor
                    } transition-all`}
                    style={{
                      width: `${Math.min(100, (row.amps / maxRefAmps) * 100)}%`,
                    }}
                  />
                </div>

                {/* Automatically shown when max current is reached on this phase (or clicked) */}
                {isExpanded && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex justify-between">
                      <span>Circuitos na {row.label} ({phaseCircuits.length})</span>
                      <span>Corrente / Potência</span>
                    </div>
                    {phaseCircuits.length === 0 ? (
                      <div className="text-[11px] text-slate-500">
                        Nenhum circuito ativo nesta fase.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {phaseCircuits.map((item) => (
                          <div
                            key={item.module.id}
                            onClick={() => onSelectModule(item.module.id)}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800/90 flex items-center justify-between text-[11px] cursor-pointer transition"
                          >
                            <span className="text-slate-200 truncate pr-2">
                              <strong className="text-amber-400 font-mono">
                                C{item.module.circuitNumber || '?'}
                              </strong>{' '}
                              • {item.module.name}
                            </span>
                            <span className="font-mono text-slate-300 shrink-0">
                              <strong>{item.ampsOnPhase}A</strong>{' '}
                              <span className="text-slate-500">({item.wattsOnPhase}W)</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2 rounded bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400">Potência Total</div>
            <div className="text-sm font-bold font-mono text-slate-100">
              {(balance.totalWatts / 1000).toFixed(2)} kW
            </div>
          </div>
          <div className="p-2 rounded bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400">Desequilíbrio</div>
            <div
              className={`text-sm font-bold font-mono ${
                balance.imbalancePercent <= 15
                  ? 'text-emerald-400'
                  : balance.imbalancePercent <= 25
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {balance.imbalancePercent}%
            </div>
          </div>
        </div>
      </div>

      {/* NBR 5410 Safety & Engineering Diagnostics */}
      <div className="p-4 flex-1 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Diagnóstico NBR 5410
          </div>
        </div>

        {issues.length === 0 ? (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Projeto em Conformidade</div>
              <div className="text-[11px] opacity-85 mt-0.5">
                Disjuntores, cabos, equilíbrio de fases e proteções dimensionados corretamente.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {issues.map((iss) => (
              <div
                key={iss.id}
                onClick={() => iss.moduleId && onSelectModule(iss.moduleId)}
                className={`p-2.5 rounded-lg border text-xs transition ${
                  iss.moduleId ? 'cursor-pointer' : ''
                } ${
                  iss.severity === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200 hover:bg-rose-500/15'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/15'
                }`}
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>{iss.title}</span>
                  {iss.moduleId && (
                    <span className="text-[10px] underline opacity-80">Ver</span>
                  )}
                </div>
                <div className="text-[11px] opacity-85 mt-1 leading-relaxed">
                  {iss.message}
                </div>

                {/* If this alert is for an overloaded phase, list all circuits on that phase */}
                {iss.phaseCircuits && iss.phaseCircuits.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-rose-500/30 space-y-1">
                    <div className="text-[10px] font-bold uppercase text-rose-300">
                      Circuitos conectados na Fase {iss.overloadedPhase}:
                    </div>
                    {iss.phaseCircuits.map((c) => (
                      <div
                        key={c.module.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectModule(c.module.id);
                        }}
                        className="flex items-center justify-between px-2 py-1 rounded bg-slate-950/70 hover:bg-slate-950 text-[11px] text-slate-200"
                      >
                        <span className="truncate pr-2">
                          C{c.module.circuitNumber || '?'} • {c.module.name}
                        </span>
                        <span className="font-mono font-bold text-rose-300 shrink-0">
                          {c.ampsOnPhase}A ({c.wattsOnPhase}W)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
