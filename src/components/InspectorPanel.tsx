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
  ShieldCheck,
  ShieldAlert,
  Zap,
  RefreshCw,
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
  calculateVoltageDrop,
  checkDrRequirement,
  getCircuitPowerFactor,
  getCircuitsByPhase,
  getRecommendedBreakerRating,
  getRecommendedWireGauge,
  getTable59ReserveStatus,
  GROUPING_FACTORS_TABLE,
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
  onOpenBreakerRecalculatePreview?: () => void;
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
  onOpenBreakerRecalculatePreview,
}) => {
  const [expandedPhase, setExpandedPhase] = useState<'R' | 'S' | 'T' | null>(null);

  const balance = calculatePhaseBalance(config);
  const issues = validatePanelNBR5410(config);
  const reserveStatus = getTable59ReserveStatus(config);
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
    const recWire = getRecommendedWireGauge(current, recBreaker, m.circuitType, m.poles, {
      lengthMeters: m.lengthMeters,
      voltage: m.voltage,
      groupingFactor: m.groupingFactor,
    });
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

          {(selectedModule.category === 'breaker' || (selectedModule as any).category === 'rcbo') && (
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

          {/* RCBO (Disjuntor DR Combinado) Dedicated Section */}
          {(selectedModule as any).category === 'rcbo' && (
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Disjuntor DR (RCBO / DDR)
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                  NBR NM 61009-1
                </span>
              </div>
              <p className="text-[10px] text-emerald-200/80 leading-tight">
                Proteção combinada no mesmo dispositivo: sobrecorrente (termomagnética) + fuga à terra (diferencial residual com botão <strong>"T"</strong> de teste). Não requer IDR setorial a montante.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-500/20">
                <div>
                  <label className="block text-[10px] text-emerald-300 mb-1">Sensibilidade (IΔn)</label>
                  <select
                    value={selectedModule.sensitivityMa || 30}
                    onChange={(e) =>
                      onUpdateModule(selectedModule.id, {
                        sensitivityMa: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-emerald-500/40 rounded px-2 py-1 text-xs text-emerald-200 font-mono"
                  >
                    <option value={10}>10mA (Banheiras/Hidro)</option>
                    <option value={30}>30mA (Proteção Pessoas)</option>
                    <option value={300}>300mA (Patrimonial)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateModule(selectedModule.id, {
                        category: 'breaker',
                        drProtected: false,
                        idrId: undefined,
                      })
                    }
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition"
                    title="Converter de volta para disjuntor termomagnético comum"
                  >
                    <RefreshCw className="w-3 h-3" />
                    P/ Disjuntor Comum
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Breaker DR Protection (IDR Setorial ou Geral) per NBR 5410 */}
          {selectedModule.category === 'breaker' && (() => {
            const drReq = checkDrRequirement(selectedModule);
            const availableIdrs = config.modules.filter((m) => m.category === 'idr');
            const isProtected = Boolean(selectedModule.drProtected || selectedModule.idrId);

            return (
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className={`w-3.5 h-3.5 ${isProtected ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold text-slate-200">Proteção Diferencial (DR)</span>
                  </div>
                  {drReq.mandatory ? (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        isProtected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                      title={drReq.reason}
                    >
                      {isProtected ? 'DR Conforme' : 'DR Obrigatório'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Opcional</span>
                  )}
                </div>

                {availableIdrs.length > 0 ? (
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      IDR Setorial Responsável:
                    </label>
                    <select
                      value={selectedModule.idrId || (selectedModule.drProtected && availableIdrs.length === 1 ? availableIdrs[0].id : '')}
                      onChange={(e) => {
                        const chosenIdrId = e.target.value;
                        if (!chosenIdrId) {
                          onUpdateModule(selectedModule.id, {
                            drProtected: false,
                            idrId: undefined,
                          });
                        } else {
                          onUpdateModule(selectedModule.id, {
                            drProtected: true,
                            idrId: chosenIdrId,
                          });
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="">Sem Proteção por IDR</option>
                      {availableIdrs.map((idr) => (
                        <option key={idr.id} value={idr.id}>
                          {idr.name} ({idr.ratingAmps}A • {idr.sensitivityMa || 30}mA)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedModule.drProtected)}
                      onChange={(e) =>
                        onUpdateModule(selectedModule.id, { drProtected: e.target.checked })
                      }
                      className="rounded accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="font-medium">Protegido por IDR</span>
                  </label>
                )}

                {drReq.mandatory && !isProtected && (
                  <div className="text-[10px] text-rose-300 leading-tight pt-0.5">
                    ⚠️ NBR 5410 item 5.1.3.2.2: {drReq.reason}
                  </div>
                )}

                <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Proteção individual sem IDR?</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateModule(selectedModule.id, {
                        category: 'rcbo',
                        drProtected: true,
                        idrId: undefined,
                        sensitivityMa: 30,
                      })
                    }
                    className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium transition"
                    title="Converter este circuito em Disjuntor DR (RCBO / DDR individual)"
                  >
                    <Zap className="w-3 h-3 text-emerald-400" />
                    Converter em RCBO (DDR)
                  </button>
                </div>
              </div>
            );
          })()}

          {/* IDR Sectoral Protection & Circuits Overview */}
          {selectedModule.category === 'idr' && (() => {
            const assignedBreakers = config.modules.filter(
              (m) =>
                m.category === 'breaker' &&
                (m.idrId === selectedModule.id ||
                  (!m.idrId && config.modules.filter((x) => x.category === 'idr').length === 1 && m.drProtected))
            );
            const assignedCurrentSum = +assignedBreakers
              .reduce((sum, b) => sum + calculateCircuitCurrent(b), 0)
              .toFixed(1);
            const upstreamRating = mainBreaker?.ratingAmps || 63;
            const isProtectedByUpstream = upstreamRating <= selectedModule.ratingAmps;
            const isOverloaded = !isProtectedByUpstream && assignedCurrentSum > selectedModule.ratingAmps;

            const candidateCircuits = config.modules.filter((m) => m.category === 'breaker');

            return (
              <div className="p-2.5 rounded-lg bg-sky-950/30 border border-sky-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sky-300 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    IDR Setorial / Geral
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      isOverloaded
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : isProtectedByUpstream
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    }`}
                  >
                    {isOverloaded
                      ? 'Sobrecarga'
                      : isProtectedByUpstream
                      ? 'Coordenação OK'
                      : 'Carga Monitorada'}
                  </span>
                </div>

                {/* Sizing & Sensitivity inputs for IDR */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Polos</label>
                    <select
                      value={selectedModule.poles}
                      onChange={(e) => {
                        const poles = Number(e.target.value) as 2 | 4;
                        onUpdateModule(selectedModule.id, {
                          poles,
                          phases: poles === 2 ? 'RS' : 'RST',
                          voltage: poles === 2 ? 220 : 380,
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-100"
                    >
                      <option value={2}>2 Polos (F+N)</option>
                      <option value={4}>4 Polos (3F+N)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Corrente In</label>
                    <select
                      value={selectedModule.ratingAmps}
                      onChange={(e) =>
                        onUpdateModule(selectedModule.id, {
                          ratingAmps: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-100 font-mono"
                    >
                      {[25, 40, 63, 80, 100].map((r) => (
                        <option key={r} value={r}>
                          {r}A
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Sensibilidade</label>
                    <select
                      value={selectedModule.sensitivityMa || 30}
                      onChange={(e) =>
                        onUpdateModule(selectedModule.id, {
                          sensitivityMa: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-100 font-mono"
                    >
                      <option value={10}>10mA</option>
                      <option value={30}>30mA</option>
                      <option value={300}>300mA</option>
                    </select>
                  </div>
                </div>

                {/* Quick sector name suggestions */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Sugestões de Setor:</label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'IDR Cozinha & Lavanderia',
                      'IDR Banheiros & Suíte',
                      'IDR Área Externa & Lazer',
                      'IDR Geral QDC',
                    ].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onUpdateModule(selectedModule.id, { name: s })}
                        className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Circuit Load Assessment vs IDR Capacity */}
                <div className="p-2 rounded bg-slate-900/90 border border-slate-800 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Circuitos Protegidos:</span>
                    <strong className="text-slate-100 font-mono">
                      {assignedBreakers.length} circuito(s)
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Carga Ativa Total (Σ Ib):</span>
                    <strong
                      className={`font-mono ${
                        isOverloaded ? 'text-rose-400 font-bold' : 'text-slate-100'
                      }`}
                    >
                      {assignedCurrentSum} A / {selectedModule.ratingAmps} A
                    </strong>
                  </div>

                  {isProtectedByUpstream ? (
                    <div className="text-[10px] text-emerald-300">
                      ✓ Protegido contra sobrecorrente pelo Disjuntor Geral ({upstreamRating}A ≤ {selectedModule.ratingAmps}A).
                    </div>
                  ) : (
                    <div
                      className={`text-[10px] leading-tight ${
                        isOverloaded ? 'text-rose-300 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {isOverloaded
                        ? `⚠️ Carga ativa (${assignedCurrentSum}A) supera a corrente nominal do IDR (${selectedModule.ratingAmps}A) sem limitador a montante (${upstreamRating}A)!`
                        : `ℹ️ Monitorado pela soma de cargas (${assignedCurrentSum}A ≤ ${selectedModule.ratingAmps}A). Disjuntor geral é ${upstreamRating}A.`}
                    </div>
                  )}
                </div>

                {/* Quick Checkbox List of Circuits to Assign to this IDR */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Atribuir Circuitos a este IDR:</span>
                    <span className="font-mono text-slate-500">{assignedBreakers.length} marcados</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 bg-slate-950/80 p-1.5 rounded border border-slate-800 text-xs">
                    {candidateCircuits.length === 0 ? (
                      <div className="text-[10px] text-slate-500 py-1 text-center">
                        Nenhum circuito disjuntor disponível.
                      </div>
                    ) : (
                      candidateCircuits.map((ckt) => {
                        const isAssigned =
                          ckt.idrId === selectedModule.id ||
                          (!ckt.idrId && config.modules.filter((m) => m.category === 'idr').length === 1 && ckt.drProtected);
                        const cktCurrent = calculateCircuitCurrent(ckt);

                        return (
                          <label
                            key={ckt.id}
                            className={`flex items-center justify-between p-1 rounded cursor-pointer transition text-[11px] ${
                              isAssigned ? 'bg-sky-500/15 text-sky-200' : 'hover:bg-slate-900 text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    onUpdateModule(ckt.id, {
                                      drProtected: true,
                                      idrId: selectedModule.id,
                                    });
                                  } else {
                                    onUpdateModule(ckt.id, {
                                      drProtected: false,
                                      idrId: undefined,
                                    });
                                  }
                                }}
                                className="rounded accent-sky-500 w-3 h-3 cursor-pointer shrink-0"
                              />
                              <span className="font-mono font-bold text-amber-400 shrink-0">
                                C{ckt.circuitNumber || '?'}
                              </span>
                              <span className="truncate">{ckt.name}</span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-1">
                              {cktCurrent}A
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

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
          ) : selectedModule.category !== 'idr' ? (
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
                  <option value={4}>4 Polos</option>
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
          ) : null}

          {/* Electrical Load, Voltage, Phase, Length, Cos phi, FCA & Wire Gauge */}
          {(selectedModule.category === 'breaker' || (selectedModule as any).category === 'rcbo') && (() => {
            const current = calculateCircuitCurrent(selectedModule);
            const pf = getCircuitPowerFactor(selectedModule);
            const fca = selectedModule.groupingFactor && selectedModule.groupingFactor > 0 ? selectedModule.groupingFactor : 1.0;
            const length = selectedModule.lengthMeters !== undefined && selectedModule.lengthMeters > 0 ? selectedModule.lengthMeters : 15;
            const vDrop = calculateVoltageDrop(selectedModule);
            const wireRow = WIRE_AMPACITY_TABLE.find((w) => w.gaugeMm2 === selectedModule.wireGaugeMm2);
            const baseWireAmps = wireRow ? (selectedModule.poles >= 3 ? wireRow.maxAmps3P : wireRow.maxAmps2P) : 24;
            const effectiveWireAmps = +(baseWireAmps * fca).toFixed(1);
            const isWireUnderCapacity = selectedModule.ratingAmps > effectiveWireAmps;

            return (
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

                {/* Comprimento L (m) e Fator de Potência cos φ */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-slate-400">
                        Comprimento <strong className="text-slate-200 font-mono">(L)</strong>
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={300}
                        step={1}
                        value={length}
                        onChange={(e) =>
                          onUpdateModule(selectedModule.id, {
                            lengthMeters: Math.max(1, Number(e.target.value)),
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono pr-6"
                      />
                      <span className="absolute right-2 top-1 text-[10px] text-slate-500 font-medium pointer-events-none">
                        m
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-slate-400">
                        Fator Potência <strong className="text-slate-200 font-mono">(cos φ)</strong>
                      </label>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0.2}
                        max={1.0}
                        step={0.05}
                        value={pf}
                        onChange={(e) =>
                          onUpdateModule(selectedModule.id, {
                            powerFactor: Math.max(0.2, Math.min(1.0, Number(e.target.value))),
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateModule(selectedModule.id, {
                            powerFactor: pf === 1.0 ? 0.85 : 1.0,
                          })
                        }
                        title={pf === 1.0 ? 'Definir 0.85 (Motor/Refrigeração)' : 'Definir 1.0 (Resistivo)'}
                        className="px-1.5 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono whitespace-nowrap shrink-0"
                      >
                        {pf === 1.0 ? '1.0' : '0.85'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Agrupamento FCA (NBR 5410 Tabela 42) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400">
                      Agrupamento <strong className="text-slate-200 font-mono">(FCA - Tab. 42)</strong>
                    </label>
                    <span className="text-[10px] font-mono text-amber-400">
                      FCA = {fca.toFixed(2)}
                    </span>
                  </div>
                  <select
                    value={fca}
                    onChange={(e) =>
                      onUpdateModule(selectedModule.id, {
                        groupingFactor: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                  >
                    {GROUPING_FACTORS_TABLE.map((opt) => (
                      <option key={opt.circuitsCount} value={opt.fca}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bitola do Cabo com Indicação de Iz Efetivo */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400">Bitola do Cabo</label>
                    <span
                      className={`text-[10px] font-mono ${
                        isWireUnderCapacity ? 'text-rose-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      Iz efetivo: <strong>{effectiveWireAmps}A</strong> (base {baseWireAmps}A)
                    </span>
                  </div>
                  <select
                    value={selectedModule.wireGaugeMm2}
                    onChange={(e) =>
                      onUpdateModule(selectedModule.id, {
                        wireGaugeMm2: Number(e.target.value),
                      })
                    }
                    className={`w-full bg-slate-900 border rounded px-2 py-1 text-xs text-slate-200 font-mono ${
                      isWireUnderCapacity ? 'border-rose-500/60 text-rose-200' : 'border-slate-700'
                    }`}
                  >
                    {WIRE_AMPACITY_TABLE.map((w) => {
                      const eff = +( (selectedModule.poles >= 3 ? w.maxAmps3P : w.maxAmps2P) * fca ).toFixed(1);
                      return (
                        <option key={w.gaugeMm2} value={w.gaugeMm2}>
                          {w.label} — máx {eff}A (base {selectedModule.poles >= 3 ? w.maxAmps3P : w.maxAmps2P}A)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Painel de Resultados Técnicos: Queda de Tensão ΔV e Corrente Ib */}
                <div className="p-2 rounded bg-slate-900/90 border border-slate-800/90 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">
                      Corrente <strong className="text-slate-200 font-mono">Ib</strong>:
                    </span>
                    <strong className="text-slate-100 font-mono">
                      {current} A
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">
                      Queda de Tensão <strong className="text-slate-200 font-mono">(ΔV)</strong>:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-slate-300">
                        {vDrop.dropPercent}% ({vDrop.dropVolts}V)
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          vDrop.isExcessive
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {vDrop.isExcessive ? '> 4% Excessiva' : '≤ 4% OK'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-400 text-[10px]">
                    Dimensionamento NBR 5410
                  </span>
                  <button
                    onClick={() => handleAutoSizeModule(selectedModule)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-medium transition"
                  >
                    <Wand2 className="w-3 h-3" />
                    Auto-Dimensionar
                  </button>
                </div>
              </div>
            );
          })()}

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
          {onOpenBreakerRecalculatePreview && (
            <button
              onClick={() => onOpenBreakerRecalculatePreview?.()}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition"
              title="Recalcular automaticamente os disjuntores de todos os circuitos"
            >
              <Wand2 className="w-3 h-3" />
              Recalcular Disjuntores
            </button>
          )}
        </div>

        {/* QDC Modular Capacity & NBR 5410 Table 59 Reserve */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Reserva QDC (Tab. 59 NBR 5410)
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                reserveStatus.isCompliant
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {reserveStatus.isCompliant ? 'Conforme' : 'Reserva Baixa'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>
              Ocupação: <strong className="text-slate-100 font-mono">{reserveStatus.occupiedSlots}/{reserveStatus.totalSlots}</strong>
            </span>
            <span>
              Livres: <strong className={`font-mono ${reserveStatus.freeSlots < reserveStatus.requiredReserve ? 'text-amber-400' : 'text-emerald-400'}`}>{reserveStatus.freeSlots}</strong> (Mín. {reserveStatus.requiredReserve})
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className={`h-full ${
                reserveStatus.isOverflowing
                  ? 'bg-rose-500'
                  : reserveStatus.isCompliant
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              } transition-all`}
              style={{
                width: `${Math.min(100, (reserveStatus.occupiedSlots / Math.max(1, reserveStatus.totalSlots)) * 100)}%`,
              }}
            />
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

                {(iss.id.startsWith('overload-') || iss.id.startsWith('wire-undersized-')) && (
                  <div className="mt-2 pt-1 border-t border-slate-700/50 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBreakerRecalculatePreview?.();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition shadow-sm"
                    >
                      <Wand2 className="w-3 h-3" />
                      Recalcular Disjuntores
                    </button>
                  </div>
                )}

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
