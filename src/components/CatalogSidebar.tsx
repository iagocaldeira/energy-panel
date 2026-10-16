import React, { useState } from 'react';
import {
  Plus,
  Zap,
  Sliders,
  Cable,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { PanelConfig, WireType } from '../types/panel';

export interface CatalogItemTemplate {
  key: string;
  group: 'protection' | 'breaker_1p' | 'breaker_2p' | 'breaker_3p';
  label: string;
  sublabel: string;
  defaultName: string;
  category: 'main_breaker' | 'idr' | 'dps' | 'breaker';
  poles: 1 | 2 | 3 | 4;
  ratingAmps: number;
  curve?: 'B' | 'C';
  circuitType: 'lighting' | 'tug' | 'tue' | 'protection';
  powerWatts: number;
  wireGaugeMm2: number;
}

export const CATALOG_GROUPS: {
  id: CatalogItemTemplate['group'];
  title: string;
}[] = [
  { id: 'protection', title: 'Proteção e Entrada' },
  { id: 'breaker_1p', title: 'Disjuntores Unipolares 1P' },
  { id: 'breaker_2p', title: 'Disjuntores Bipolares 2P' },
  { id: 'breaker_3p', title: 'Disjuntores Tripolares 3P' },
];

export const CATALOG_ITEMS: CatalogItemTemplate[] = [
  // Proteção e Entrada
  {
    key: 'prot_main_2p_50',
    group: 'protection',
    label: 'Disjuntor Geral 2P 50A',
    sublabel: 'Bipolar • Cabo 10 mm²',
    defaultName: 'Disjuntor Geral',
    category: 'main_breaker',
    poles: 2,
    ratingAmps: 50,
    curve: 'C',
    circuitType: 'protection',
    powerWatts: 0,
    wireGaugeMm2: 10,
  },
  {
    key: 'prot_main_3p_63',
    group: 'protection',
    label: 'Disjuntor Geral 3P 63A',
    sublabel: 'Tripolar • Cabo 16 mm²',
    defaultName: 'Disjuntor Geral',
    category: 'main_breaker',
    poles: 3,
    ratingAmps: 63,
    curve: 'C',
    circuitType: 'protection',
    powerWatts: 0,
    wireGaugeMm2: 16,
  },
  {
    key: 'prot_idr_2p_63',
    group: 'protection',
    label: 'IDR 2 Polos 63A 30mA',
    sublabel: 'Diferencial Residual • 2P',
    defaultName: 'IDR Geral',
    category: 'idr',
    poles: 2,
    ratingAmps: 63,
    circuitType: 'protection',
    powerWatts: 0,
    wireGaugeMm2: 10,
  },
  {
    key: 'prot_idr_4p_63',
    group: 'protection',
    label: 'IDR 4 Polos 63A 30mA',
    sublabel: 'Diferencial Residual • 4P',
    defaultName: 'IDR Geral',
    category: 'idr',
    poles: 4,
    ratingAmps: 63,
    circuitType: 'protection',
    powerWatts: 0,
    wireGaugeMm2: 16,
  },
  {
    key: 'prot_dps_275',
    group: 'protection',
    label: 'DPS 275V 20kA',
    sublabel: 'Proteção contra Surtos • Fase ou Neutro',
    defaultName: 'DPS',
    category: 'dps',
    poles: 1,
    ratingAmps: 20,
    circuitType: 'protection',
    powerWatts: 0,
    wireGaugeMm2: 4,
  },

  // Disjuntores Unipolares 1P
  {
    key: 'brk_1p_10',
    group: 'breaker_1p',
    label: 'Disjuntor 1P 10A',
    sublabel: 'Curva B • Cabo 1.5 mm² • 127V',
    defaultName: 'Iluminação',
    category: 'breaker',
    poles: 1,
    ratingAmps: 10,
    curve: 'B',
    circuitType: 'lighting',
    powerWatts: 800,
    wireGaugeMm2: 1.5,
  },
  {
    key: 'brk_1p_16',
    group: 'breaker_1p',
    label: 'Disjuntor 1P 16A',
    sublabel: 'Curva C • Cabo 2.5 mm² • 127V',
    defaultName: 'Tomadas',
    category: 'breaker',
    poles: 1,
    ratingAmps: 16,
    curve: 'C',
    circuitType: 'tug',
    powerWatts: 1400,
    wireGaugeMm2: 2.5,
  },
  {
    key: 'brk_1p_20',
    group: 'breaker_1p',
    label: 'Disjuntor 1P 20A',
    sublabel: 'Curva C • Cabo 2.5 mm² • 127V',
    defaultName: 'Tomadas Cozinha',
    category: 'breaker',
    poles: 1,
    ratingAmps: 20,
    curve: 'C',
    circuitType: 'tug',
    powerWatts: 2000,
    wireGaugeMm2: 2.5,
  },
  {
    key: 'brk_1p_25',
    group: 'breaker_1p',
    label: 'Disjuntor 1P 25A',
    sublabel: 'Curva C • Cabo 4.0 mm² • 127V',
    defaultName: 'Circuito Especial',
    category: 'breaker',
    poles: 1,
    ratingAmps: 25,
    curve: 'C',
    circuitType: 'tue',
    powerWatts: 2500,
    wireGaugeMm2: 4.0,
  },
  {
    key: 'brk_1p_32',
    group: 'breaker_1p',
    label: 'Disjuntor 1P 32A',
    sublabel: 'Curva C • Cabo 6.0 mm² • 127V',
    defaultName: 'Carga Alta 127V',
    category: 'breaker',
    poles: 1,
    ratingAmps: 32,
    curve: 'C',
    circuitType: 'tue',
    powerWatts: 3500,
    wireGaugeMm2: 6.0,
  },

  // Disjuntores Bipolares 2P
  {
    key: 'brk_2p_16',
    group: 'breaker_2p',
    label: 'Disjuntor 2P 16A',
    sublabel: 'Curva C • Cabo 2.5 mm² • 220V',
    defaultName: 'Ar-Condicionado',
    category: 'breaker',
    poles: 2,
    ratingAmps: 16,
    curve: 'C',
    circuitType: 'tue',
    powerWatts: 1500,
    wireGaugeMm2: 2.5,
  },
  {
    key: 'brk_2p_20',
    group: 'breaker_2p',
    label: 'Disjuntor 2P 20A',
    sublabel: 'Curva C • Cabo 2.5 mm² • 220V',
    defaultName: 'Equipamento 220V',
    category: 'breaker',
    poles: 2,
    ratingAmps: 20,
    curve: 'C',
    circuitType: 'tue',
    powerWatts: 2400,
    wireGaugeMm2: 2.5,
  },
  {
    key: 'brk_2p_25',
    group: 'breaker_2p',
    label: 'Disjuntor 2P 25A',
    sublabel: 'Curva C • Cabo 4.0 mm² • 220V',
    defaultName: 'Forno Elétrico',
    category: 'breaker',
    poles: 2,
    ratingAmps: 25,
    curve: 'C',
    circuitType: 'tue',
    powerWatts: 4000,
    wireGaugeMm2: 4.0,
  },
  {
    key: 'brk_2p_32',
    group: 'breaker_2p',
    label: 'Disjuntor 2P 32A',
    sublabel: 'Curva C • Cabo 6.0 mm² • 220V',
    defaultName: 'Chuveiro',
    category: 'breaker',
    poles: 2,
    ratingAmps: 32,
    curve: 'C',
    circuitType: 'tue',
    powerWatts: 5500,
    wireGaugeMm2: 6.0,
  },
  {
    key: 'brk_2p_40',
    group: 'breaker_2p',
    label: 'Disjuntor 2P 40A',
    sublabel: 'Curva C • Cabo 6.0 mm² • 220V',
    defaultName: 'Chuveiro Suíte',
    category: 'breaker',
    poles: 2,
    ratingAmps: 40,
    curve: 'C',
    circuitType: 'tue',
    powerWatts: 6800,
    wireGaugeMm2: 6.0,
  },

  // Disjuntores Tripolares 3P
  {
    key: 'brk_3p_32',
    group: 'breaker_3p',
    label: 'Disjuntor 3P 32A',
    sublabel: 'Curva C • Cabo 6.0 mm² • 220V',
    defaultName: 'Motor Trifásico',
    category: 'breaker',
    poles: 3,
    ratingAmps: 32,
    curve: 'C',
    circuitType: 'tue',
    powerWatts: 7500,
    wireGaugeMm2: 6.0,
  },
  {
    key: 'brk_3p_40',
    group: 'breaker_3p',
    label: 'Disjuntor 3P 40A',
    sublabel: 'Curva C • Cabo 6.0 mm² • 220V',
    defaultName: 'Carga Trifásica',
    category: 'breaker',
    poles: 3,
    ratingAmps: 40,
    curve: 'C',
    circuitType: 'tue',
    powerWatts: 9500,
    wireGaugeMm2: 6.0,
  },
  {
    key: 'brk_3p_50',
    group: 'breaker_3p',
    label: 'Disjuntor 3P 50A',
    sublabel: 'Curva C • Cabo 10.0 mm² • 220V',
    defaultName: 'Subquadro Trifásico',
    category: 'breaker',
    poles: 3,
    ratingAmps: 50,
    curve: 'C',
    circuitType: 'tue',
    powerWatts: 12000,
    wireGaugeMm2: 10.0,
  },
];

interface CatalogSidebarProps {
  config: PanelConfig;
  onUpdateConfig: (partial: Partial<PanelConfig>) => void;
  onQuickAddCatalogItem: (key: string) => void;
  onAutoWire: () => void;
  onClearWires: () => void;
  wireToolActive: boolean;
  onToggleWireTool: () => void;
  activeWireType: WireType;
  onSelectWireType: (wt: WireType) => void;
  activeWireGauge: number;
  onSelectWireGauge: (g: number) => void;
}

export const CatalogSidebar: React.FC<CatalogSidebarProps> = ({
  config,
  onUpdateConfig,
  onQuickAddCatalogItem,
  onAutoWire,
  onClearWires,
  wireToolActive,
  onToggleWireTool,
  activeWireType,
  onSelectWireType,
  activeWireGauge,
  onSelectWireGauge,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    protection: true,
    breaker_1p: true,
    breaker_2p: true,
    breaker_3p: false,
  });

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-y-auto select-none">
      {/* Section 1: Panel Architecture & Topology */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          Modelo do Quadro
        </div>

        {/* Topology Switcher: Only 2 Models */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onUpdateConfig({ topology: 'fishbone' })}
            className={`px-2.5 py-2 rounded-md text-xs font-medium transition text-center ${
              config.topology === 'fishbone'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Espinha de Peixe
          </button>
          <button
            onClick={() => onUpdateConfig({ topology: 'horizontal' })}
            className={`px-2.5 py-2 rounded-md text-xs font-medium transition text-center ${
              config.topology === 'horizontal'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DIN Horizontal
          </button>
        </div>

        {/* Supply Type & Voltage */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Fornecimento</label>
            <select
              value={config.supplyType}
              onChange={(e) =>
                onUpdateConfig({ supplyType: e.target.value as PanelConfig['supplyType'] })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-200"
            >
              <option value="mono">Monofásico</option>
              <option value="bi">Bifásico</option>
              <option value="tri">Trifásico</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Tensão Nominal</label>
            <select
              value={config.voltageSystem}
              onChange={(e) =>
                onUpdateConfig({
                  voltageSystem: e.target.value as PanelConfig['voltageSystem'],
                })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-200"
            >
              <option value="127_220">127V / 220V</option>
              <option value="220_380">220V / 380V</option>
            </select>
          </div>
        </div>

        {/* Panel Dimension / Sizing Controls */}
        {config.topology === 'fishbone' ? (
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Capacidade do Barramento Central
            </label>
            <select
              value={config.fishboneSlotsPerSide}
              onChange={(e) =>
                onUpdateConfig({ fishboneSlotsPerSide: Number(e.target.value) })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-200"
            >
              <option value={8}>8 posições / lado (16 disjuntores DIN)</option>
              <option value={10}>10 posições / lado (20 disjuntores DIN)</option>
              <option value={12}>12 posições / lado (24 disjuntores DIN)</option>
              <option value={14}>14 posições / lado (28 disjuntores DIN)</option>
              <option value={16}>16 posições / lado (32 disjuntores DIN)</option>
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Fileiras DIN</label>
              <select
                value={config.horizontalRows}
                onChange={(e) =>
                  onUpdateConfig({ horizontalRows: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-200"
              >
                <option value={2}>2 Fileiras</option>
                <option value={3}>3 Fileiras</option>
                <option value={4}>4 Fileiras</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Módulos/Fileira</label>
              <select
                value={config.modulesPerRow}
                onChange={(e) =>
                  onUpdateConfig({ modulesPerRow: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-200"
              >
                <option value={12}>12 módulos</option>
                <option value={14}>14 módulos</option>
                <option value={16}>16 módulos</option>
                <option value={18}>18 módulos</option>
                <option value={24}>24 módulos</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Wiring & Cable Controls */}
      <div className="p-4 border-b border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Cable className="w-3.5 h-3.5 text-sky-400" />
            Cabeamento e Fios
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showWires}
              onChange={(e) => onUpdateConfig({ showWires: e.target.checked })}
              className="rounded accent-amber-500"
            />
            Exibir Fios
          </label>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={onToggleWireTool}
            className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium border transition ${
              wireToolActive
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            {wireToolActive ? 'Sair Fio' : 'Fio Manual'}
          </button>
          <button
            onClick={onAutoWire}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-medium transition"
            title="Gerar fiação automática mantendo fios manuais"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto-Fios
          </button>
          <button
            onClick={onClearWires}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-slate-950 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs font-medium transition"
            title="Remover todos os fios para conectar do zero"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar
          </button>
        </div>

        {wireToolActive && (
          <div className="p-2.5 rounded-lg bg-slate-950 border border-emerald-500/30 space-y-2">
            <div className="text-[11px] text-emerald-300 font-medium">
              Escolha o condutor e clique em dois bornes:
            </div>
            <div className="grid grid-cols-5 gap-1">
              {(
                [
                  { id: 'phase_r', label: 'Fase R', color: 'bg-red-500 text-white' },
                  { id: 'phase_s', label: 'Fase S', color: 'bg-yellow-400 text-slate-950' },
                  { id: 'phase_t', label: 'Fase T', color: 'bg-slate-100 text-slate-950' },
                  { id: 'neutral', label: 'Neutro', color: 'bg-sky-400 text-slate-950' },
                  { id: 'ground', label: 'Terra', color: 'bg-green-500 text-slate-950' },
                ] as const
              ).map((wt) => (
                <button
                  key={wt.id}
                  onClick={() => onSelectWireType(wt.id)}
                  className={`py-1 rounded text-[10px] font-bold ${wt.color} ${
                    activeWireType === wt.id ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {wt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Bitola:</span>
              <select
                value={activeWireGauge}
                onChange={(e) => onSelectWireGauge(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs"
              >
                {[1.5, 2.5, 4, 6, 10, 16].map((g) => (
                  <option key={g} value={g}>
                    {g} mm²
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-[10px] text-slate-400 mb-1">Filtrar Visualização de Cabos</label>
          <select
            value={config.wireFilter}
            onChange={(e) =>
              onUpdateConfig({ wireFilter: e.target.value as PanelConfig['wireFilter'] })
            }
            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="all">Todos os Cabos</option>
            <option value="phases">Apenas Fases R, S, T</option>
            <option value="neutral">Apenas Neutro</option>
            <option value="ground">Apenas Terra</option>
          </select>
        </div>
      </div>

      {/* Section 3: Categorized Component Catalog */}
      <div className="p-4 flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Categorias de Componentes
          </div>
          <span className="text-[10px] text-slate-500">Arraste ou clique +</span>
        </div>

        <div className="space-y-2.5">
          {CATALOG_GROUPS.map((grp) => {
            const isOpen = openGroups[grp.id];
            const items = CATALOG_ITEMS.filter((i) => i.group === grp.id);

            return (
              <div
                key={grp.id}
                className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden"
              >
                <button
                  onClick={() => toggleGroup(grp.id)}
                  className="w-full px-3 py-2 bg-slate-900/90 hover:bg-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-200 transition"
                >
                  <span>{grp.title}</span>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="text-[10px] font-mono">{items.length}</span>
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="p-2 space-y-1.5 border-t border-slate-800/80">
                    {items.map((item) => (
                      <div
                        key={item.key}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/catalog-item', item.key);
                          e.dataTransfer.setData('text/catalog-poles', String(item.poles));
                          (window as any).__draggedCatalogPoles = item.poles;
                        }}
                        onDragEnd={() => {
                          (window as any).__draggedCatalogPoles = 1;
                        }}
                        className="p-2 rounded-md bg-slate-900 hover:bg-slate-800/90 border border-slate-800/90 hover:border-slate-700 transition flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-800 text-slate-200 border border-slate-700 shrink-0">
                              {item.poles}P
                            </span>
                            <span className="text-xs font-medium text-slate-100 truncate">
                              {item.label}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-slate-400 mt-0.5 pl-0.5">
                            {item.sublabel}
                          </div>
                        </div>

                        <button
                          onClick={() => onQuickAddCatalogItem(item.key)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition shrink-0"
                          title="Adicionar ao quadro"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
