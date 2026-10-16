import {
  CurveType,
  GroundingSystem,
  PanelConfig,
  PanelModule,
  PhaseAssignment,
  RailId,
  WireConnection,
  WireType,
} from '../types/panel';

export const WIRE_AMPACITY_TABLE: {
  gaugeMm2: number;
  maxAmps2P: number;
  maxAmps3P: number;
  label: string;
}[] = [
  { gaugeMm2: 1.5, maxAmps2P: 17.5, maxAmps3P: 15.5, label: '1.5 mm²' },
  { gaugeMm2: 2.5, maxAmps2P: 24, maxAmps3P: 21, label: '2.5 mm²' },
  { gaugeMm2: 4.0, maxAmps2P: 32, maxAmps3P: 28, label: '4.0 mm²' },
  { gaugeMm2: 6.0, maxAmps2P: 41, maxAmps3P: 36, label: '6.0 mm²' },
  { gaugeMm2: 10.0, maxAmps2P: 57, maxAmps3P: 50, label: '10.0 mm²' },
  { gaugeMm2: 16.0, maxAmps2P: 76, maxAmps3P: 68, label: '16.0 mm²' },
  { gaugeMm2: 25.0, maxAmps2P: 101, maxAmps3P: 89, label: '25.0 mm²' },
];

export const STANDARD_BREAKER_RATINGS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100];

// Resistividade do cobre a 20°C segundo a NBR 5410 (ρ = 1/58 = 0.01724 Ω·mm²/m)
export const COPPER_RESISTIVITY = 0.01724;

// Tabela 42 da NBR 5410 — Fatores de Correção por Agrupamento (FCA) em feixe ou eletroduto
export interface GroupingFactorOption {
  circuitsCount: number;
  label: string;
  fca: number;
}

export const GROUPING_FACTORS_TABLE: GroupingFactorOption[] = [
  { circuitsCount: 1, label: '1 circuito (FCA 1,00)', fca: 1.00 },
  { circuitsCount: 2, label: '2 circuitos (FCA 0,80)', fca: 0.80 },
  { circuitsCount: 3, label: '3 circuitos (FCA 0,70)', fca: 0.70 },
  { circuitsCount: 4, label: '4 circuitos (FCA 0,65)', fca: 0.65 },
  { circuitsCount: 5, label: '5 circuitos (FCA 0,60)', fca: 0.60 },
  { circuitsCount: 6, label: '6 circuitos (FCA 0,57)', fca: 0.57 },
  { circuitsCount: 7, label: '7 circuitos (FCA 0,54)', fca: 0.54 },
  { circuitsCount: 8, label: '8 circuitos (FCA 0,52)', fca: 0.52 },
  { circuitsCount: 9, label: '9 a 11 circuitos (FCA 0,50)', fca: 0.50 },
  { circuitsCount: 12, label: '12 a 15 circuitos (FCA 0,45)', fca: 0.45 },
  { circuitsCount: 16, label: '16 a 19 circuitos (FCA 0,41)', fca: 0.41 },
  { circuitsCount: 20, label: '≥ 20 circuitos (FCA 0,38)', fca: 0.38 },
];

export function getFcaFromCircuitsCount(count: number): number {
  if (count <= 1) return 1.00;
  if (count === 2) return 0.80;
  if (count === 3) return 0.70;
  if (count === 4) return 0.65;
  if (count === 5) return 0.60;
  if (count === 6) return 0.57;
  if (count === 7) return 0.54;
  if (count === 8) return 0.52;
  if (count <= 11) return 0.50;
  if (count <= 15) return 0.45;
  if (count <= 19) return 0.41;
  return 0.38;
}

export function getDefaultPowerFactor(name?: string, circuitType?: PanelModule['circuitType']): number {
  const n = (name || '').toLowerCase();
  // Cargas indutoras / motores / ar-condicionado / refrigeração: default 0.85
  if (
    n.includes('ar condicionado') ||
    n.includes('ar-condicionado') ||
    n.includes('a/c') ||
    n.includes('climatiz') ||
    n.includes('geladeira') ||
    n.includes('refrig') ||
    n.includes('motor') ||
    n.includes('bomba') ||
    n.includes('freezer') ||
    n.includes('compressor') ||
    n.includes('ventilador') ||
    n.includes('ventila')
  ) {
    return 0.85;
  }
  return 1.0;
}

export function getCircuitPowerFactor(module: PanelModule): number {
  if (typeof module.powerFactor === 'number' && module.powerFactor > 0) {
    return Math.max(0.2, Math.min(1.0, module.powerFactor));
  }
  return getDefaultPowerFactor(module.name, module.circuitType);
}

export function getEffectiveWireAmpacity(
  wireGaugeMm2: number,
  poles: number,
  groupingFactor: number = 1.0
): number {
  const wireRow = WIRE_AMPACITY_TABLE.find((w) => w.gaugeMm2 === wireGaugeMm2);
  const baseCapacity = wireRow ? (poles >= 3 ? wireRow.maxAmps3P : wireRow.maxAmps2P) : 24;
  const fca = groupingFactor > 0 ? groupingFactor : 1.0;
  return +(baseCapacity * fca).toFixed(1);
}

export interface VoltageDropResult {
  dropVolts: number;
  dropPercent: number;
  isExcessive: boolean; // dropPercent > 4.0%
}

export function calculateVoltageDrop(
  module: PanelModule,
  overrideGauge?: number,
  overrideLength?: number
): VoltageDropResult {
  if ((module.category !== 'breaker' && module.category !== 'rcbo') || module.powerWatts <= 0) {
    return { dropVolts: 0, dropPercent: 0, isExcessive: false };
  }
  const current = calculateCircuitCurrent(module);
  const length =
    overrideLength !== undefined
      ? overrideLength
      : module.lengthMeters !== undefined && module.lengthMeters > 0
      ? module.lengthMeters
      : 15;
  const gauge = overrideGauge ?? module.wireGaugeMm2;
  const volt = module.voltage || (module.poles === 1 ? 127 : 220);

  if (gauge <= 0 || volt <= 0 || current <= 0 || length <= 0) {
    return { dropVolts: 0, dropPercent: 0, isExcessive: false };
  }

  // NBR 5410:
  // Monofásico / Bifásico: ΔV = (2 * ρ * L * I) / S
  // Trifásico equilibrado: ΔV = (√3 * ρ * L * I) / S
  const factor = module.poles >= 3 ? Math.sqrt(3) : 2;
  const dropVolts = +((factor * COPPER_RESISTIVITY * length * current) / gauge).toFixed(2);
  const dropPercent = +((dropVolts / volt) * 100).toFixed(2);
  const isExcessive = dropPercent > 4.0;

  return { dropVolts, dropPercent, isExcessive };
}

export function calculateCircuitCurrent(module: PanelModule): number {
  if ((module.category !== 'breaker' && module.category !== 'rcbo') || module.powerWatts <= 0) return 0;
  const pf = getCircuitPowerFactor(module);
  if (module.poles >= 3) {
    return +(module.powerWatts / (Math.sqrt(3) * module.voltage * pf)).toFixed(1);
  }
  return +(module.powerWatts / (module.voltage * pf)).toFixed(1);
}

export interface WireGaugeOptions {
  lengthMeters?: number;
  voltage?: number;
  groupingFactor?: number;
}

export function getRecommendedWireGauge(
  currentAmps: number,
  breakerAmps: number,
  circuitType: PanelModule['circuitType'],
  poles: number,
  options?: WireGaugeOptions
): number {
  const minGauge = circuitType === 'lighting' ? 1.5 : 2.5;
  const fca = options?.groupingFactor && options.groupingFactor > 0 ? options.groupingFactor : 1.0;
  const targetAmps = Math.max(currentAmps, breakerAmps);

  // Critério de Queda de Tensão máxima de 4% (NBR 5410)
  const length =
    options?.lengthMeters !== undefined && options.lengthMeters > 0 ? options.lengthMeters : 15;
  const volt = options?.voltage ?? (poles === 1 ? 127 : 220);
  const factor = poles >= 3 ? Math.sqrt(3) : 2;
  const minGaugeVoltageDrop =
    currentAmps > 0 && volt > 0
      ? (factor * COPPER_RESISTIVITY * length * currentAmps) / (0.04 * volt)
      : 0;

  for (const row of WIRE_AMPACITY_TABLE) {
    if (row.gaugeMm2 < minGauge) continue;
    if (row.gaugeMm2 < minGaugeVoltageDrop) continue;
    const baseCapacity = poles >= 3 ? row.maxAmps3P : row.maxAmps2P;
    const effectiveCapacity = baseCapacity * fca;
    if (effectiveCapacity >= targetAmps) {
      return row.gaugeMm2;
    }
  }
  return 25.0;
}

export function getRecommendedBreakerRating(
  currentAmps: number,
  circuitType: PanelModule['circuitType']
): number {
  const minRating = circuitType === 'lighting' ? 10 : 16;
  const target = Math.max(minRating, currentAmps * 1.1);
  for (const r of STANDARD_BREAKER_RATINGS) {
    if (r >= target) return r;
  }
  return 63;
}

export function placeModuleWithoutOverlap(
  modules: PanelModule[],
  movingModule: PanelModule,
  targetRail: RailId,
  targetSlot: number,
  maxSlotsOnRail: number
): PanelModule[] {
  const clampedSlot = Math.max(
    0,
    Math.min(maxSlotsOnRail - movingModule.poles, targetSlot)
  );
  const updatedMoving: PanelModule = {
    ...movingModule,
    railId: targetRail,
    position: clampedSlot,
  };

  const otherRails = modules.filter(
    (m) => m.id !== movingModule.id && m.railId !== targetRail
  );

  const sameRailOthers = modules
    .filter((m) => m.id !== movingModule.id && m.railId === targetRail)
    .sort((a, b) => a.position - b.position);

  const overlaps = sameRailOthers.some(
    (m) =>
      clampedSlot < m.position + m.poles &&
      clampedSlot + updatedMoving.poles > m.position
  );

  if (!overlaps) {
    return [...otherRails, ...sameRailOthers, updatedMoving];
  }

  const before: PanelModule[] = [];
  const after: PanelModule[] = [];
  for (const m of sameRailOthers) {
    if (m.position + m.poles / 2 <= clampedSlot + updatedMoving.poles / 2) {
      before.push(m);
    } else {
      after.push(m);
    }
  }

  const ordered = [...before, updatedMoving, ...after];

  const placed: PanelModule[] = [];
  let cursor = 0;
  for (const item of ordered) {
    const desiredPos = item.id === updatedMoving.id ? clampedSlot : item.position;
    const pos = Math.max(cursor, desiredPos);
    placed.push({ ...item, position: pos });
    cursor = pos + item.poles;
  }

  if (cursor > maxSlotsOnRail) {
    let rightLimit = maxSlotsOnRail;
    for (let i = placed.length - 1; i >= 0; i--) {
      const m = placed[i];
      if (m.position + m.poles > rightLimit) {
        placed[i] = { ...m, position: Math.max(0, rightLimit - m.poles) };
      }
      rightLimit = placed[i].position;
    }
  }

  return [...otherRails, ...placed];
}

export interface PhaseCircuitContribution {
  module: PanelModule;
  wattsOnPhase: number;
  ampsOnPhase: number;
}

export function isLoadCircuit(module: PanelModule): boolean {
  return module.category === 'breaker' || module.category === 'rcbo';
}

export function getCircuitsByPhase(
  config: PanelConfig,
  phase: 'R' | 'S' | 'T'
): PhaseCircuitContribution[] {
  const is127_220 = config.voltageSystem === '127_220';
  const vFN = is127_220 ? 127 : 220;
  const vFF = is127_220 ? 220 : 380;
  const list: PhaseCircuitContribution[] = [];

  for (const mod of config.modules) {
    if (!isLoadCircuit(mod) || !mod.isOn || mod.powerWatts <= 0) continue;
    if (!mod.phases.includes(phase)) continue;

    const numPhasesUsed = mod.phases.length || 1;
    const wattsOnPhase = Math.round(mod.powerWatts / numPhasesUsed);

    const pf = getCircuitPowerFactor(mod);
    let ampsOnPhase = 0;
    if (mod.poles >= 3) {
      ampsOnPhase = +(mod.powerWatts / (Math.sqrt(3) * (mod.voltage || vFF) * pf)).toFixed(1);
    } else if (mod.poles === 2) {
      ampsOnPhase = +(mod.powerWatts / ((mod.voltage || vFF) * pf)).toFixed(1);
    } else {
      ampsOnPhase = +(mod.powerWatts / ((mod.voltage || vFN) * pf)).toFixed(1);
    }

    list.push({
      module: mod,
      wattsOnPhase,
      ampsOnPhase,
    });
  }

  return list.sort((a, b) => b.ampsOnPhase - a.ampsOnPhase);
}

export interface PhaseLoadSummary {
  wattsR: number;
  wattsS: number;
  wattsT: number;
  ampsR: number;
  ampsS: number;
  ampsT: number;
  totalWatts: number;
  maxPhaseAmps: number;
  imbalancePercent: number;
}

export function calculatePhaseBalance(config: PanelConfig): PhaseLoadSummary {
  let wattsR = 0;
  let wattsS = 0;
  let wattsT = 0;

  let ampsRSum = 0;
  let ampsSSum = 0;
  let ampsTSum = 0;

  const is127_220 = config.voltageSystem === '127_220';
  const vFN = is127_220 ? 127 : 220;
  const vFF = is127_220 ? 220 : 380;

  for (const mod of config.modules) {
    if (!isLoadCircuit(mod) || !mod.isOn || mod.powerWatts <= 0) continue;

    const p = mod.powerWatts;
    const volt = mod.voltage || (mod.poles === 1 ? vFN : vFF);
    const pf = getCircuitPowerFactor(mod);

    if (mod.poles >= 3) {
      const i3P = p / (Math.sqrt(3) * volt * pf);
      wattsR += p / 3;
      wattsS += p / 3;
      wattsT += p / 3;
      ampsRSum += i3P;
      ampsSSum += i3P;
      ampsTSum += i3P;
    } else if (mod.poles === 2) {
      const i2P = p / (volt * pf);
      if (mod.phases === 'RS') {
        wattsR += p / 2;
        wattsS += p / 2;
        ampsRSum += i2P;
        ampsSSum += i2P;
      } else if (mod.phases === 'RT') {
        wattsR += p / 2;
        wattsT += p / 2;
        ampsRSum += i2P;
        ampsTSum += i2P;
      } else if (mod.phases === 'ST') {
        wattsS += p / 2;
        wattsT += p / 2;
        ampsSSum += i2P;
        ampsTSum += i2P;
      } else {
        // Fallback default RS
        wattsR += p / 2;
        wattsS += p / 2;
        ampsRSum += i2P;
        ampsSSum += i2P;
      }
    } else {
      // 1P
      const i1P = p / (volt * pf);
      if (mod.phases === 'S') {
        wattsS += p;
        ampsSSum += i1P;
      } else if (mod.phases === 'T') {
        wattsT += p;
        ampsTSum += i1P;
      } else {
        wattsR += p;
        ampsRSum += i1P;
      }
    }
  }

  const ampsR = +ampsRSum.toFixed(1);
  const ampsS = +ampsSSum.toFixed(1);
  const ampsT = +ampsTSum.toFixed(1);

  const activePhases =
    config.supplyType === 'mono'
      ? [ampsR]
      : config.supplyType === 'bi'
      ? [ampsR, ampsS]
      : [ampsR, ampsS, ampsT];

  const maxPhaseAmps = activePhases.length > 0 ? Math.max(...activePhases) : 0;
  const minPhaseAmps = activePhases.length > 0 ? Math.min(...activePhases) : 0;
  const avgPhaseAmps =
    activePhases.length > 0
      ? activePhases.reduce((a, b) => a + b, 0) / activePhases.length
      : 0;

  const imbalancePercent =
    avgPhaseAmps > 0 && activePhases.length > 1
      ? Math.round(((maxPhaseAmps - minPhaseAmps) / avgPhaseAmps) * 100)
      : 0;

  return {
    wattsR: Math.round(wattsR),
    wattsS: Math.round(wattsS),
    wattsT: Math.round(wattsT),
    ampsR,
    ampsS,
    ampsT,
    totalWatts: Math.round(wattsR + wattsS + wattsT),
    maxPhaseAmps,
    imbalancePercent,
  };
}

export interface ValidationIssue {
  id: string;
  moduleId?: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  overloadedPhase?: 'R' | 'S' | 'T';
  phaseCircuits?: PhaseCircuitContribution[];
}

export interface Table59ReserveStatus {
  circuitCount: number;
  totalSlots: number;
  occupiedSlots: number;
  freeSlots: number;
  requiredReserve: number;
  isCompliant: boolean;
  isOverflowing: boolean;
}

/**
 * Calculates total available DIN module slots based on panel topology.
 * - Horizontal: horizontalRows * modulesPerRow
 * - Fishbone: 12 slots (top main rail) + 2 * fishboneSlotsPerSide (left & right rails)
 */
export function getPanelTotalSlots(config: PanelConfig): number {
  if (config.topology === 'fishbone') {
    return 12 + config.fishboneSlotsPerSide * 2;
  }
  return config.horizontalRows * config.modulesPerRow;
}

/**
 * Calculates the total number of occupied slots (poles) by all installed modules in the panel.
 */
export function getPanelOccupiedSlots(config: PanelConfig): number {
  return config.modules.reduce((sum, m) => sum + m.poles, 0);
}

/**
 * NBR 5410 Tabela 59 - Espaço de reserva nos quadros de distribuição:
 * - Até 6 circuitos: reserva mínima de 2 espaços/módulos
 * - De 7 a 12 circuitos: reserva mínima de 3 espaços/módulos
 * - De 13 a 30 circuitos: reserva mínima de 4 espaços/módulos
 * - Mais de 30 circuitos: reserva mínima de 0,15 * N (arredondado para cima)
 */
export function getRequiredReserveSlotsNBR5410(circuitCount: number): number {
  if (circuitCount <= 0) return 0;
  if (circuitCount <= 6) return 2;
  if (circuitCount <= 12) return 3;
  if (circuitCount <= 30) return 4;
  return Math.ceil(circuitCount * 0.15);
}

export function getTable59ReserveStatus(config: PanelConfig): Table59ReserveStatus {
  const circuitCount = config.modules.filter(isLoadCircuit).length;
  const totalSlots = getPanelTotalSlots(config);
  const occupiedSlots = getPanelOccupiedSlots(config);
  const freeSlots = totalSlots - occupiedSlots;
  const requiredReserve = getRequiredReserveSlotsNBR5410(circuitCount);
  const isOverflowing = occupiedSlots > totalSlots;
  const isCompliant = !isOverflowing && freeSlots >= requiredReserve;

  return {
    circuitCount,
    totalSlots,
    occupiedSlots,
    freeSlots,
    requiredReserve,
    isCompliant,
    isOverflowing,
  };
}

export interface DrRequirementResult {
  mandatory: boolean;
  reason?: string;
  matchedLocation?: string;
}

/**
 * Checks if a circuit is required by NBR 5410 (item 5.1.3.2.2) to have high-sensitivity DR (IDR <= 30mA).
 * Mandatory cases:
 * - Bathrooms, showers, bathtubs (item 5.1.3.2.2.a)
 * - Kitchens, pantries, wet areas subject to cleaning (item 5.1.3.2.2.d)
 * - Laundries, service areas, garages (item 5.1.3.2.2.d)
 * - External circuits, gardens, outdoor outlets, porches (item 5.1.3.2.2.b/c)
 */
export function checkDrRequirement(module: PanelModule): DrRequirementResult {
  if (module.category !== 'breaker') {
    return { mandatory: false };
  }

  const norm = (s?: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const room = norm(module.room);
  const name = norm(module.name);

  // 1. Bathrooms / Shower areas (item 5.1.3.2.2.a)
  const bathroomKeywords = [
    'banheiro',
    'banho',
    'suite',
    'lavabo',
    'bwc',
    'sanitario',
    'vestiario',
  ];
  const showerKeywords = [
    'chuveiro',
    'ducha',
    'hidro',
    'banheira',
    'jacuzzi',
  ];

  for (const kw of bathroomKeywords) {
    if (room.includes(kw) || name.includes(kw)) {
      return {
        mandatory: true,
        reason: 'Locais contendo banheira ou chuveiro (NBR 5410 item 5.1.3.2.2.a)',
        matchedLocation: module.room || 'Banheiro',
      };
    }
  }

  for (const kw of showerKeywords) {
    if (name.includes(kw) || room.includes(kw)) {
      return {
        mandatory: true,
        reason: 'Ponto de utilização com chuveiro/banheira (NBR 5410 item 5.1.3.2.2.a)',
        matchedLocation: module.room || 'Chuveiro/Banho',
      };
    }
  }

  // 2. Kitchen / Pantry areas (item 5.1.3.2.2.d)
  const kitchenKeywords = [
    'cozinha',
    'copa',
    'gourmet',
    'churrasqueira',
  ];
  for (const kw of kitchenKeywords) {
    if (room.includes(kw) || name.includes(kw)) {
      return {
        mandatory: true,
        reason: 'Cozinha, copa ou área sujeita a lavagem (NBR 5410 item 5.1.3.2.2.d)',
        matchedLocation: module.room || 'Cozinha',
      };
    }
  }

  // 3. Wet / Laundry / Service / Garage areas (item 5.1.3.2.2.d)
  const wetAreaKeywords = [
    'lavanderia',
    'servico',
    'garagem',
    'abrigo',
  ];
  const wetEquipmentKeywords = [
    'torneira eletrica',
    'maquina de lavar',
    'lava e seca',
    'lava loucas',
    'lava-loucas',
  ];

  for (const kw of wetAreaKeywords) {
    if (room.includes(kw) || name.includes(kw)) {
      return {
        mandatory: true,
        reason: 'Área molhada / de serviço sujeita a lavagem (NBR 5410 item 5.1.3.2.2.d)',
        matchedLocation: module.room || 'Área de Serviço/Lavanderia',
      };
    }
  }

  for (const kw of wetEquipmentKeywords) {
    if (name.includes(kw) || room.includes(kw)) {
      return {
        mandatory: true,
        reason: 'Equipamento em área molhada (NBR 5410 item 5.1.3.2.2.d)',
        matchedLocation: module.room || module.name,
      };
    }
  }

  // 4. External areas (item 5.1.3.2.2.b / c)
  const externalKeywords = [
    'extern',
    'jardim',
    'quintal',
    'varanda',
    'sacada',
    'piscina',
    'fachada',
    'pergolado',
  ];
  for (const kw of externalKeywords) {
    if (room.includes(kw) || name.includes(kw)) {
      return {
        mandatory: true,
        reason: 'Ponto externo ou que alimenta área externa (NBR 5410 item 5.1.3.2.2.b/c)',
        matchedLocation: module.room || 'Área Externa',
      };
    }
  }

  return { mandatory: false };
}

export function validatePanelNBR5410(config: PanelConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mainBreaker = config.modules.find((m) => m.category === 'main_breaker');
  const idrs = config.modules.filter((m) => m.category === 'idr');
  const rcbos = config.modules.filter((m) => m.category === 'rcbo');
  const dpsList = config.modules.filter((m) => m.category === 'dps');
  const breakers = config.modules.filter((m) => m.category === 'breaker');
  const loadCircuits = config.modules.filter(isLoadCircuit);

  // 1. Tabela 59 NBR 5410 - Reserva de Espaço no QDC
  const reserveStatus = getTable59ReserveStatus(config);
  if (reserveStatus.isOverflowing) {
    issues.push({
      id: 'qdc-capacity-overflow',
      severity: 'error',
      title: 'Capacidade do QDC Excedida',
      message: `O quadro possui capacidade física para ${reserveStatus.totalSlots} módulos DIN, mas existem ${reserveStatus.occupiedSlots} módulos instalados (${reserveStatus.occupiedSlots - reserveStatus.totalSlots} módulo(s) acima da capacidade). Redimensione o quadro.`,
    });
  } else if (reserveStatus.circuitCount > 0 && !reserveStatus.isCompliant) {
    issues.push({
      id: 'table-59-insufficient-reserve',
      severity: 'warning',
      title: 'Reserva Insuficiente no QDC (NBR 5410 Tabela 59)',
      message: `Com ${reserveStatus.circuitCount} circuito(s) instalado(s), a NBR 5410 (Tabela 59) exige no mínimo ${reserveStatus.requiredReserve} módulo(s) de reserva para expansões futuras. Espaço livre atual: ${reserveStatus.freeSlots} módulo(s) (Capacidade: ${reserveStatus.totalSlots}, Ocupados: ${reserveStatus.occupiedSlots}).`,
    });
  }

  if (!mainBreaker) {
    issues.push({
      id: 'no-main-breaker',
      severity: 'error',
      title: 'Ausência de Disjuntor Geral',
      message: 'NBR 5410 exige dispositivo geral de seccionamento e proteção contra sobrecorrente no QDC.',
    });
  }

  if (config.groundingSystem === 'TN-C') {
    if (idrs.length > 0 || rcbos.length > 0) {
      const firstDr = idrs[0] || rcbos[0];
      issues.push({
        id: 'tn-c-dr-prohibited',
        moduleId: firstDr.id,
        severity: 'error',
        title: 'Dispositivos DR (IDR / RCBO) são PROIBIDOS no esquema TN-C (NBR 5410 item 5.1.3.2.2.4)',
        message:
          'No esquema TN-C, as funções de neutro e proteção são combinadas (PEN). O condutor PEN carrega corrente de carga e não pode passar por DR, pois causará desarmes indevidos. Altere para TN-C-S ou remova os IDRs e RCBOs.',
      });
    }
  } else if (config.groundingSystem === 'TT') {
    const unprotectedInTT = breakers.filter((b) => !b.drProtected);
    if (idrs.length === 0 && rcbos.length === 0) {
      issues.push({
        id: 'tt-idr-mandatory',
        severity: 'error',
        title: 'Proteção DR é OBRIGATÓRIA no esquema TT (NBR 5410 item 5.1.3.2.3.1)',
        message:
          'No esquema TT, as massas são aterradas em eletrodo independente do neutro. A proteção por seccionamento automático exige IDR setorial ou RCBO (DDR) em todos os circuitos para garantir proteção contra choques.',
      });
    } else if (unprotectedInTT.length > 0) {
      issues.push({
        id: 'tt-unprotected-circuits',
        severity: 'error',
        title: `${unprotectedInTT.length} circuito(s) sem proteção DR no esquema TT`,
        message:
          'No esquema TT, todos os circuitos sem exceção devem estar sob IDR setorial ou possuir RCBO (DDR) individual.',
      });
    }
  } else if (idrs.length === 0 && rcbos.length === 0) {
    issues.push({
      id: 'no-dr',
      severity: 'warning',
      title: 'Sem Dispositivo Diferencial Residual (IDR / RCBO)',
      message:
        'NBR 5410 torna obrigatório o uso de proteção DR de alta sensibilidade (≤ 30mA) para áreas molhadas, externas e tomadas.',
    });
  }

  // Validação de sobrecorrente em múltiplos IDRs setoriais (NBR 5410)
  for (const idr of idrs) {
    const assignedBreakers = breakers.filter((b) => {
      if (b.idrId) return b.idrId === idr.id;
      return idrs.length === 1 && b.drProtected;
    });

    const assignedCurrentSum = +assignedBreakers
      .reduce((sum, b) => sum + calculateCircuitCurrent(b), 0)
      .toFixed(1);
    const assignedRatingsSum = assignedBreakers.reduce((sum, b) => sum + b.ratingAmps, 0);

    const upstreamRating = mainBreaker?.ratingAmps || 63;
    if (upstreamRating > idr.ratingAmps && assignedCurrentSum > idr.ratingAmps) {
      issues.push({
        id: `idr-overload-${idr.id}`,
        moduleId: idr.id,
        severity: 'error',
        title: `${idr.name}: Carga ativa (${assignedCurrentSum}A) excede capacidade do IDR (${idr.ratingAmps}A)`,
        message: `A soma das cargas ativas dos circuitos atribuídos a este IDR é de ${assignedCurrentSum}A (disjuntores somam ${assignedRatingsSum}A), superando o limite nominal de ${idr.ratingAmps}A sem proteção limitadora a montante (${upstreamRating}A). NBR 5410 exige proteção do IDR contra sobrecorrente.`,
      });
    }
  }

  if (config.groundingSystem === 'IT') {
    issues.push({
      id: 'it-dsi-requirement',
      severity: 'info',
      title: 'Esquema IT: Requer DSI (NBR 5410)',
      message:
        'Instalações no esquema IT mantêm a continuidade do serviço na primeira falta à terra, mas exigem um Dispositivo Supervisor de Isolamento (DSI) com sinalização acústica e visual.',
    });
  }

  // 2. Proteção contra Surtos (DPS) e Neutro (NBR 5410 item 6.3.5.2)
  const isTnC = config.groundingSystem === 'TN-C';
  const isTnCsWithPenGrounded =
    config.groundingSystem === 'TN-C-S' && config.penGroundedAtPanel !== false;
  const neutralDpsExempt = isTnC || isTnCsWithPenGrounded;

  const hasNeutralDps = dpsList.some((d) => d.phases === 'N');
  if (dpsList.length === 0) {
    if (neutralDpsExempt) {
      issues.push({
        id: 'no-dps',
        severity: 'warning',
        title: 'Sem Dispositivo de Proteção contra Surtos (DPS)',
        message: `Recomenda-se instalar DPS Classe II nas fases de entrada conectadas ao barramento de proteção (PE/PEN). No esquema ${config.groundingSystem}${
          isTnCsWithPenGrounded ? ' com PEN aterrado no quadro' : ''
        }, o DPS no neutro é dispensado pela NBR 5410 (item 6.3.5.2.4).`,
      });
    } else {
      issues.push({
        id: 'no-dps',
        severity: 'warning',
        title: 'Sem Dispositivo de Proteção contra Surtos (DPS)',
        message: 'Recomenda-se instalar DPS Classe II nas fases de entrada e no neutro conforme NBR 5410.',
      });
    }
  } else if (!hasNeutralDps && !neutralDpsExempt) {
    issues.push({
      id: 'no-neutral-dps',
      severity: 'warning',
      title: 'Falta DPS para o Neutro',
      message: `No esquema ${config.groundingSystem}, os condutores de neutro e proteção são separados. Conforme a NBR 5410 (item 6.3.5.2), adicione um módulo DPS conectado entre Neutro e Terra para proteção completa contra sobretensões transitórias.`,
    });
  } else if (hasNeutralDps && isTnC) {
    issues.push({
      id: 'tn-c-neutral-dps-redundant',
      severity: 'info',
      title: 'DPS no Neutro dispensável em TN-C',
      message: 'No esquema TN-C, as funções de neutro e proteção são combinadas no condutor PEN diretamente aterrado. O DPS no neutro é dispensado pela NBR 5410.',
    });
  }

  // 3. Validação de DR obrigatório por tipo/ambiente (NBR 5410 item 5.1.3.2.2)
  if (config.groundingSystem !== 'TN-C') {
    for (const b of breakers) {
      const drReq = checkDrRequirement(b);
      if (drReq.mandatory && !b.drProtected) {
        issues.push({
          id: `missing-dr-${b.id}`,
          moduleId: b.id,
          severity: 'error',
          title: `${b.name}: Proteção DR Obrigatória Ausente (NBR 5410)`,
          message: `Circuito C${b.circuitNumber || '?'} (${b.name}) no ambiente "${b.room || drReq.matchedLocation || 'Área molhada'}" exige proteção por dispositivo DR (IDR ≤ 30mA) conforme NBR 5410 item 5.1.3.2.2 (${drReq.reason}). Marque a proteção DR neste circuito.`,
        });
      }
    }
  } else {
    const wetCircuits = breakers.filter((b) => checkDrRequirement(b).mandatory);
    if (wetCircuits.length > 0) {
      issues.push({
        id: 'tn-c-wet-circuits-dr-conflict',
        severity: 'warning',
        title: 'Circuitos em Áreas Molhadas no Esquema TN-C',
        message: `Existem circuitos em áreas molhadas (${wetCircuits.map((c) => c.name).join(', ')}) que exigem DR pela NBR 5410 item 5.1.3.2.2. Como o esquema TN-C proíbe o uso de DR no condutor PEN (item 5.1.3.2.2.4), converta o quadro para TN-C-S para permitir a proteção por IDR.`,
      });
    }
  }

  const balance = calculatePhaseBalance(config);
  if (config.supplyType !== 'mono' && balance.imbalancePercent > 25) {
    issues.push({
      id: 'phase-imbalance',
      severity: 'warning',
      title: `Desequilíbrio entre fases elevado (${balance.imbalancePercent}%)`,
      message: 'As cargas estão concentradas de forma desigual nas fases. Clique em "Balancear" para redistribuir.',
    });
  }

  if (mainBreaker) {
    const phaseChecks: { ph: 'R' | 'S' | 'T'; amps: number }[] = [
      { ph: 'R', amps: balance.ampsR },
      ...(config.supplyType !== 'mono' ? [{ ph: 'S' as const, amps: balance.ampsS }] : []),
      ...(config.supplyType === 'tri' ? [{ ph: 'T' as const, amps: balance.ampsT }] : []),
    ];

    for (const check of phaseChecks) {
      if (check.amps >= mainBreaker.ratingAmps) {
        const phaseCircuits = getCircuitsByPhase(config, check.ph);
        issues.push({
          id: `main-overload-${check.ph}`,
          moduleId: mainBreaker.id,
          severity: 'error',
          overloadedPhase: check.ph,
          phaseCircuits,
          title: `Fase ${check.ph} atingiu a corrente máxima (${check.amps}A / ${mainBreaker.ratingAmps}A)`,
          message: `A soma dos circuitos ativos na Fase ${check.ph} (${check.amps}A) atingiu ou superou o limite do Disjuntor Geral (${mainBreaker.ratingAmps}A).`,
        });
      }
    }
  }

  for (const b of loadCircuits) {
    const current = calculateCircuitCurrent(b);
    const fca = b.groupingFactor && b.groupingFactor > 0 ? b.groupingFactor : 1.0;
    const wireRow = WIRE_AMPACITY_TABLE.find((w) => w.gaugeMm2 === b.wireGaugeMm2);
    const baseWireMaxAmps = wireRow ? (b.poles >= 3 ? wireRow.maxAmps3P : wireRow.maxAmps2P) : 24;
    const effectiveWireMaxAmps = +(baseWireMaxAmps * fca).toFixed(1);
    const vDrop = calculateVoltageDrop(b);
    const recWire = getRecommendedWireGauge(current, b.ratingAmps, b.circuitType, b.poles, {
      lengthMeters: b.lengthMeters,
      voltage: b.voltage,
      groupingFactor: fca,
    });

    if (current > b.ratingAmps) {
      issues.push({
        id: `overload-${b.id}`,
        moduleId: b.id,
        severity: 'error',
        title: `${b.name}: Corrente (${current}A) maior que o Disjuntor (${b.ratingAmps}A)`,
        message: `O circuito consome ${b.powerWatts}W (${current}A em ${b.voltage}V, cos φ ${getCircuitPowerFactor(b)}), mas o disjuntor é de ${b.ratingAmps}A. Sugestão: C${getRecommendedBreakerRating(current, b.circuitType)}.`,
      });
    }

    if (b.ratingAmps > effectiveWireMaxAmps) {
      const isFcaCulprit = b.ratingAmps <= baseWireMaxAmps && fca < 1.0;
      issues.push({
        id: `wire-undersized-${b.id}`,
        moduleId: b.id,
        severity: 'error',
        title: `${b.name}: Cabo ${b.wireGaugeMm2}mm² subdimensionado para Disjuntor ${b.ratingAmps}A${isFcaCulprit ? ` (FCA ${fca})` : ''}`,
        message: `Cabo ${b.wireGaugeMm2}mm² suporta até ${effectiveWireMaxAmps}A com fator de agrupamento FCA ${fca} (tabela base ${baseWireMaxAmps}A), inferior ao disjuntor de ${b.ratingAmps}A. Recomendado: cabo de ${recWire}mm².`,
      });
    }

    if (vDrop.isExcessive) {
      const recDrop = calculateVoltageDrop(b, recWire);
      issues.push({
        id: `voltage-drop-${b.id}`,
        moduleId: b.id,
        severity: 'error',
        title: `${b.name}: Queda de tensão excessiva (${vDrop.dropPercent}% > 4.0%)`,
        message: `Com comprimento L = ${b.lengthMeters ?? 15}m e cabo ${b.wireGaugeMm2}mm², a queda de tensão é de ${vDrop.dropPercent}% (${vDrop.dropVolts}V), superando o limite normativo de 4% da NBR 5410. Sugestão: aumente para cabo de ${recWire}mm² (queda de ${recDrop.dropPercent}%).`,
      });
    }
  }

  return issues;
}

export function autoBalancePhases(config: PanelConfig): PanelModule[] {
  if (config.supplyType === 'mono') {
    return config.modules.map((m) =>
      isLoadCircuit(m) ? { ...m, phases: 'R' } : m
    );
  }

  const availableSinglePhases: PhaseAssignment[] =
    config.supplyType === 'bi' ? ['R', 'S'] : ['R', 'S', 'T'];
  const availableDoublePhases: PhaseAssignment[] =
    config.supplyType === 'bi' ? ['RS'] : ['RS', 'ST', 'RT'];

  const loads: Record<'R' | 'S' | 'T', number> = { R: 0, S: 0, T: 0 };

  const loadCircuits = config.modules
    .filter(isLoadCircuit)
    .sort((a, b) => b.powerWatts - a.powerWatts);

  const phaseMap = new Map<string, PhaseAssignment>();

  for (const b of loadCircuits) {
    if (b.poles >= 3) {
      phaseMap.set(b.id, 'RST');
      loads.R += b.powerWatts / 3;
      loads.S += b.powerWatts / 3;
      loads.T += b.powerWatts / 3;
    } else if (b.poles === 2) {
      let bestPair: PhaseAssignment = availableDoublePhases[0];
      let bestSum = Infinity;
      for (const pair of availableDoublePhases) {
        const p1 = pair[0] as 'R' | 'S' | 'T';
        const p2 = pair[1] as 'R' | 'S' | 'T';
        const sum = loads[p1] + loads[p2];
        if (sum < bestSum) {
          bestSum = sum;
          bestPair = pair;
        }
      }
      phaseMap.set(b.id, bestPair);
      const p1 = bestPair[0] as 'R' | 'S' | 'T';
      const p2 = bestPair[1] as 'R' | 'S' | 'T';
      loads[p1] += b.powerWatts / 2;
      loads[p2] += b.powerWatts / 2;
    } else {
      let bestPhase: PhaseAssignment = availableSinglePhases[0];
      let bestVal = Infinity;
      for (const ph of availableSinglePhases) {
        const key = ph as 'R' | 'S' | 'T';
        if (loads[key] < bestVal) {
          bestVal = loads[key];
          bestPhase = ph;
        }
      }
      phaseMap.set(b.id, bestPhase);
      loads[bestPhase as 'R' | 'S' | 'T'] += b.powerWatts;
    }
  }

  return config.modules.map((m) => {
    const newPh = phaseMap.get(m.id);
    return newPh ? { ...m, phases: newPh } : m;
  });
}

export interface PhaseBalanceChangeItem {
  moduleId: string;
  circuitNumber?: number;
  name: string;
  poles: number;
  powerWatts: number;
  amps: number;
  fromPhase: PhaseAssignment;
  toPhase: PhaseAssignment;
}

export interface PhaseBalancePreview {
  before: PhaseLoadSummary;
  after: PhaseLoadSummary;
  changes: PhaseBalanceChangeItem[];
  proposedModules: PanelModule[];
}

export function previewPhaseBalanceChanges(config: PanelConfig): PhaseBalancePreview {
  const before = calculatePhaseBalance(config);
  const proposedModules = autoBalancePhases(config);
  const after = calculatePhaseBalance({ ...config, modules: proposedModules });

  const changes: PhaseBalanceChangeItem[] = [];
  for (let i = 0; i < config.modules.length; i++) {
    const oldMod = config.modules[i];
    const newMod = proposedModules[i];
    if (isLoadCircuit(oldMod) && oldMod.phases !== newMod.phases) {
      changes.push({
        moduleId: oldMod.id,
        circuitNumber: oldMod.circuitNumber,
        name: oldMod.name,
        poles: oldMod.poles,
        powerWatts: oldMod.powerWatts,
        amps: calculateCircuitCurrent(oldMod),
        fromPhase: oldMod.phases,
        toPhase: newMod.phases,
      });
    }
  }

  return {
    before,
    after,
    changes,
    proposedModules,
  };
}

export interface BreakerRecalculateChangeItem {
  moduleId: string;
  circuitNumber?: number;
  name: string;
  room?: string;
  circuitType: PanelModule['circuitType'];
  poles: number;
  voltage: number;
  powerWatts: number;
  currentAmps: number;
  fromRatingAmps: number;
  toRatingAmps: number;
  fromWireGaugeMm2: number;
  toWireGaugeMm2: number;
  curve: CurveType;
  reason: string;
  isOverloaded: boolean;
  hasChanged: boolean;
  breakerChanged: boolean;
  wireChanged: boolean;
}

export interface BreakerRecalculatePreview {
  totalCircuits: number;
  changedCount: number;
  unchangedCount: number;
  overloadedCount: number;
  changes: BreakerRecalculateChangeItem[];
  proposedModules: PanelModule[];
}

export function previewBreakerRecalculation(config: PanelConfig): BreakerRecalculatePreview {
  const changes: BreakerRecalculateChangeItem[] = [];
  const proposedModules = config.modules.map((m) => {
    if (!isLoadCircuit(m)) return m;

    const currentAmps = calculateCircuitCurrent(m);
    let toRatingAmps: number;
    if (m.powerWatts > 0) {
      toRatingAmps = getRecommendedBreakerRating(currentAmps, m.circuitType);
    } else {
      const minRating = m.circuitType === 'lighting' ? 10 : 16;
      toRatingAmps = Math.max(m.ratingAmps, minRating);
    }

    const toWireGaugeMm2 = getRecommendedWireGauge(
      currentAmps,
      toRatingAmps,
      m.circuitType,
      m.poles,
      {
        lengthMeters: m.lengthMeters,
        voltage: m.voltage,
        groupingFactor: m.groupingFactor,
      }
    );

    const breakerChanged = m.ratingAmps !== toRatingAmps;
    const wireChanged = m.wireGaugeMm2 !== toWireGaugeMm2;
    const hasChanged = breakerChanged || wireChanged;
    const isOverloaded = currentAmps > m.ratingAmps;

    let reason = '';
    if (isOverloaded) {
      reason = `Sobrecarga crítica: corrente de projeto (${currentAmps}A) excede a capacidade do disjuntor atual (${m.ratingAmps}A). Ajustado para ${toRatingAmps}A para evitar desarmes e aquecimento.`;
    } else if (breakerChanged && toRatingAmps > m.ratingAmps) {
      reason = `Critério normativo NBR 5410: margem de 10% sobre corrente de projeto (${(currentAmps * 1.1).toFixed(1)}A) requer disjuntor de ${toRatingAmps}A.`;
    } else if (breakerChanged && toRatingAmps < m.ratingAmps) {
      reason = `Otimização de proteção: disjuntor superdimensionado reduzido de ${m.ratingAmps}A para ${toRatingAmps}A para melhor sensibilidade térmica.`;
    } else if (wireChanged) {
      reason = `Disjuntor mantido em ${m.ratingAmps}A. Cabo ajustado de ${m.wireGaugeMm2}mm² para ${toWireGaugeMm2}mm² para garantir capacidade de condução (Iz ≥ In).`;
    } else {
      reason = `Em perfeita conformidade: Ib (${currentAmps}A) ≤ In (${m.ratingAmps}A) ≤ Iz (${toWireGaugeMm2}mm²).`;
    }

    changes.push({
      moduleId: m.id,
      circuitNumber: m.circuitNumber,
      name: m.name,
      room: m.room,
      circuitType: m.circuitType,
      poles: m.poles,
      voltage: m.voltage,
      powerWatts: m.powerWatts,
      currentAmps,
      fromRatingAmps: m.ratingAmps,
      toRatingAmps,
      fromWireGaugeMm2: m.wireGaugeMm2,
      toWireGaugeMm2,
      curve: m.curve || 'C',
      reason,
      isOverloaded,
      hasChanged,
      breakerChanged,
      wireChanged,
    });

    return {
      ...m,
      ratingAmps: toRatingAmps,
      wireGaugeMm2: toWireGaugeMm2,
    };
  });

  const changedCount = changes.filter((c) => c.hasChanged).length;
  const unchangedCount = changes.filter((c) => !c.hasChanged).length;
  const overloadedCount = changes.filter((c) => c.isOverloaded).length;

  return {
    totalCircuits: changes.length,
    changedCount,
    unchangedCount,
    overloadedCount,
    changes,
    proposedModules,
  };
}


export function getWireColorHex(
  wireType: WireType,
  scheme: PanelConfig['phaseColorScheme'] = 'classic_br'
): string {
  switch (wireType) {
    case 'neutral':
      return '#38bdf8'; // Light Blue
    case 'ground':
      return '#22c55e'; // Green
    case 'phase_r':
      return '#ef4444'; // Red (Fase R)
    case 'phase_s':
      return scheme === 'classic_br' ? '#eab308' : '#f8fafc'; // Yellow or White
    case 'phase_t':
      return scheme === 'classic_br' ? '#f8fafc' : '#b45309'; // White or Brown
  }
}

export function getPhaseToWireType(phaseChar: string): WireType {
  if (phaseChar === 'N') return 'neutral';
  if (phaseChar === 'S') return 'phase_s';
  if (phaseChar === 'T') return 'phase_t';
  return 'phase_r';
}

/**
 * Generates complete, realistic, non-overlapping wiring:
 * 1. Incoming Utility Supply (`supply_in`) -> TOP of Main Breaker (R, S, T) & TOP of IDR (N)
 * 2. BOTTOM of Main Breaker (R, S, T) -> TOP of IDR (R, S, T) & TOP of Phase DPS (R, S, T) via pass-through channel
 * 3. TOP of IDR (N) -> TOP of Neutral DPS (N)
 * 4. BOTTOM of IDR (R, S, T) -> Fishbone Busbar or Comb Busbars
 * 5. BOTTOM of IDR (N) -> Neutral Bar
 * 6. BOTTOM of all DPS (R, S, T, N) -> Ground Bar
 * 7. Breakers -> Outgoing Cable Ducts
 */
export function generateAutomaticWires(config: PanelConfig): WireConnection[] {
  const wires: WireConnection[] = [];
  const mainBreaker = config.modules.find((m) => m.category === 'main_breaker');
  const idrs = config.modules
    .filter((m) => m.category === 'idr')
    .sort((a, b) => a.position - b.position);
  const idr = idrs[0];
  const dpsModules = config.modules
    .filter((m) => m.category === 'dps')
    .sort((a, b) => a.position - b.position);
  const loadCircuits = config.modules
    .filter(isLoadCircuit)
    .sort((a, b) => a.position - b.position);
  const breakers = loadCircuits;

  const phaseTypes: WireType[] =
    config.supplyType === 'mono'
      ? ['phase_r']
      : config.supplyType === 'bi'
      ? ['phase_r', 'phase_s']
      : ['phase_r', 'phase_s', 'phase_t'];

  // 1. Incoming Supply (`supply_in`) -> TOP of Main Breaker (Phases) & TOP of IDRs (Neutral)
  if (mainBreaker) {
    phaseTypes.forEach((wt, idx) => {
      if (idx < mainBreaker.poles) {
        wires.push({
          id: `auto-supply-main-${idx}`,
          fromId: 'supply_in',
          fromPort: `phase_${idx}`,
          toId: mainBreaker.id,
          toPort: `top_${idx}`,
          wireType: wt,
          gaugeMm2: 16,
          isAutoGenerated: true,
        });
      }
    });
  }

  // Supply neutral to each IDR top neutral terminal
  idrs.forEach((idrMod, idrIdx) => {
    const neutralPole = idrMod.poles - 1;
    wires.push({
      id: `auto-supply-idr-${idrMod.id}-n`,
      fromId: 'supply_in',
      fromPort: `neutral`,
      toId: idrMod.id,
      toPort: `top_${neutralPole}`,
      wireType: 'neutral',
      gaugeMm2: 16,
      label: idrs.length > 1 ? `N ${idrMod.name}` : undefined,
      isAutoGenerated: true,
    });
  });

  // 1b. TN-C-S Grounding: Equipotential bonding bridge from supply PEN to PE ground bar
  if (config.groundingSystem === 'TN-C-S') {
    wires.push({
      id: 'auto-pen-bonding-jumper',
      fromId: 'supply_in',
      fromPort: 'neutral',
      toId: 'ground_bar',
      toPort: 'term_0',
      wireType: 'ground',
      gaugeMm2: 16,
      label: 'Jumper PEN (TN-C-S)',
      isAutoGenerated: true,
    });
  }

  // 2. BOTTOM of Main Breaker -> TOP of each IDR (Phases R, S, T) & IDR Neutral Out -> Neutral Bar
  if (mainBreaker) {
    idrs.forEach((idrMod, idrIdx) => {
      const idrPhaseChars = (idrMod.phases || 'RST').split('');
      const phasePolesCount =
        idrMod.poles >= 4
          ? Math.min(3, mainBreaker.poles)
          : Math.min(idrMod.poles - 1, mainBreaker.poles);

      for (let pIdx = 0; pIdx < phasePolesCount; pIdx++) {
        const pChar = idrPhaseChars[pIdx] || (pIdx === 0 ? 'R' : pIdx === 1 ? 'S' : 'T');
        const mainPortIdx = pChar === 'R' ? 0 : pChar === 'S' ? 1 : pChar === 'T' ? 2 : pIdx;
        const wt = getPhaseToWireType(pChar);

        wires.push({
          id: `auto-main-idr-${idrMod.id}-${pIdx}`,
          fromId: mainBreaker.id,
          fromPort: `bottom_${mainPortIdx}`,
          toId: idrMod.id,
          toPort: `top_${pIdx}`,
          wireType: wt,
          gaugeMm2: 10,
          isAutoGenerated: true,
        });
      }

      // Neutral out from IDR bottom last pole -> Neutral bar
      const neutralPole = idrMod.poles - 1;
      wires.push({
        id: `auto-idr-neutral-out-${idrMod.id}`,
        fromId: idrMod.id,
        fromPort: `bottom_${neutralPole}`,
        toId: 'neutral_bar',
        toPort: `term_${idrIdx}`,
        wireType: 'neutral',
        gaugeMm2: 10,
        label: idrs.length > 1 ? `N ${idrMod.name}` : undefined,
        isAutoGenerated: true,
      });
    });
  }

  // 3. Feed from first IDR (or Main Breaker) BOTTOM ports -> Fishbone Busbar or Comb Busbars
  const sourceModule = idrs[0] || mainBreaker;
  if (sourceModule) {
    if (config.topology === 'fishbone') {
      phaseTypes.forEach((wt, idx) => {
        if (idx < sourceModule.poles) {
          wires.push({
            id: `auto-feed-fishbone-${idx}`,
            fromId: sourceModule.id,
            fromPort: `bottom_${idx}`,
            toId: 'fishbone_bus',
            toPort: `feed_${idx}`,
            wireType: wt,
            gaugeMm2: 10,
            isAutoGenerated: true,
          });
        }
      });
    } else {
      const targetRails = ['row_2', 'row_3', 'row_4'].slice(
        0,
        config.horizontalRows - 1
      );
      targetRails.forEach((railId) => {
        const hasCircuitsOnRail = loadCircuits.some((b) => b.railId === railId);
        if (!hasCircuitsOnRail) return;
        phaseTypes.forEach((wt, pIdx) => {
          if (pIdx < sourceModule.poles) {
            wires.push({
              id: `auto-feed-${railId}-${pIdx}`,
              fromId: sourceModule.id,
              fromPort: `bottom_${pIdx}`,
              toId: `comb_${railId}`,
              toPort: `feed_${pIdx}`,
              wireType: wt,
              gaugeMm2: 10,
              isAutoGenerated: true,
            });
          }
        });
      });
    }
  }

  // 4. DPS connections (Phase DPS R, S, T + Neutral DPS N)
  dpsModules.forEach((dps, idx) => {
    const isNeutralDps = dps.phases === 'N';
    const wt: WireType = isNeutralDps
      ? 'neutral'
      : getPhaseToWireType(dps.phases[0] || 'R');

    if (isNeutralDps) {
      if (idrs.length > 0) {
        const neutralPole = idrs[0].poles - 1;
        wires.push({
          id: `auto-dps-in-${dps.id}`,
          fromId: idrs[0].id,
          fromPort: `top_${neutralPole}`,
          toId: dps.id,
          toPort: 'top_0',
          wireType: 'neutral',
          gaugeMm2: 4,
          isAutoGenerated: true,
        });
      } else {
        wires.push({
          id: `auto-dps-in-${dps.id}`,
          fromId: 'supply_in',
          fromPort: 'neutral',
          toId: dps.id,
          toPort: 'top_0',
          wireType: 'neutral',
          gaugeMm2: 4,
          isAutoGenerated: true,
        });
      }
    } else if (mainBreaker) {
      const phaseIdx = dps.phases === 'S' ? 1 : dps.phases === 'T' ? 2 : 0;
      wires.push({
        id: `auto-dps-in-${dps.id}`,
        fromId: mainBreaker.id,
        fromPort: `bottom_${Math.min(phaseIdx, mainBreaker.poles - 1)}`,
        toId: dps.id,
        toPort: 'top_0',
        wireType: wt,
        gaugeMm2: 4,
        isAutoGenerated: true,
      });
    }

    wires.push({
      id: `auto-dps-out-${dps.id}`,
      fromId: dps.id,
      fromPort: 'bottom_0',
      toId: 'ground_bar',
      toPort: `term_${idx}`,
      wireType: 'ground',
      gaugeMm2: 4,
      isAutoGenerated: true,
    });
  });

  // 5. Circuit Breaker & RCBO outgoing Load Wires + Neutral & Ground bar terminal stubs
  const leftCircuits = loadCircuits.filter((b) => b.railId === 'left_rail');
  const rightCircuits = loadCircuits.filter((b) => b.railId !== 'left_rail');

  leftCircuits.forEach((b, bIdx) => {
    for (let p = 0; p < b.poles; p++) {
      const phChar = b.phases[p] || b.phases[0] || 'R';
      const wt = getPhaseToWireType(phChar);
      wires.push({
        id: `auto-breaker-load-${b.id}-${p}`,
        fromId: b.id,
        fromPort: `out_${p}`,
        toId: 'left_duct',
        toPort: `slot_${b.position + p}`,
        wireType: wt,
        gaugeMm2: b.wireGaugeMm2,
        label: `C${b.circuitNumber || bIdx + 1}`,
        isAutoGenerated: true,
      });
    }
  });

  rightCircuits.forEach((b, bIdx) => {
    for (let p = 0; p < b.poles; p++) {
      const phChar = b.phases[p] || b.phases[0] || 'R';
      const wt = getPhaseToWireType(phChar);
      wires.push({
        id: `auto-breaker-load-${b.id}-${p}`,
        fromId: b.id,
        fromPort: `out_${p}`,
        toId: 'right_duct',
        toPort: `slot_${b.railId}_${b.position + p}`,
        wireType: wt,
        gaugeMm2: b.wireGaugeMm2,
        label: `C${b.circuitNumber || bIdx + 1}`,
        isAutoGenerated: true,
      });
    }
  });

  loadCircuits.forEach((b, bIdx) => {
    // Unique terminal indices that never collide with IDR (term_0) or DPS (term_0..dpsCount-1)
    const neutralTermIndex = bIdx + idrs.length;
    const groundTermIndex = bIdx + dpsModules.length;

    if (b.poles === 1 || b.voltage === 127) {
      wires.push({
        id: `auto-neutral-ckt-${b.id}`,
        fromId: 'neutral_bar',
        fromPort: `term_${neutralTermIndex}`,
        toId: 'neutral_bar',
        toPort: `duct_${neutralTermIndex}`,
        wireType: 'neutral',
        gaugeMm2: b.wireGaugeMm2,
        isAutoGenerated: true,
      });
    }
    wires.push({
      id: `auto-ground-ckt-${b.id}`,
      fromId: 'ground_bar',
      fromPort: `term_${groundTermIndex}`,
      toId: 'ground_bar',
      toPort: `duct_${groundTermIndex}`,
      wireType: 'ground',
      gaugeMm2: b.wireGaugeMm2,
      isAutoGenerated: true,
    });
  });

  return wires;
}

export interface BomItem {
  category: string;
  item: string;
  specification: string;
  quantity: number;
  unit: string;
}

export function generateBillOfMaterials(config: PanelConfig): BomItem[] {
  const items: BomItem[] = [];

  const totalDinModules = config.modules.reduce((acc, m) => acc + m.poles, 0);
  items.push({
    category: 'Quadro e Barramentos',
    item:
      config.topology === 'fishbone'
        ? `Quadro de Distribuição Espinha de Peixe ${config.fishboneSlotsPerSide * 2} vias`
        : `Quadro de Distribuição DIN ${config.horizontalRows} fileiras / ${config.horizontalRows * config.modulesPerRow} módulos`,
    specification:
      config.topology === 'fishbone'
        ? `Barramento central em cobre ${config.supplyType === 'tri' ? 'Trifásico' : 'Bifásico'} + Trilhos DIN`
        : `${config.horizontalRows}x Trilhos DIN 35mm + Barramentos Neutro/Terra`,
    quantity: 1,
    unit: 'un',
  });

  const groundingSpecMap: Record<GroundingSystem, { item: string; spec: string }> = {
    'TN-S': {
      item: 'Sistema de Aterramento TN-S (NBR 5410)',
      spec: 'Condutores Neutro (N) e Proteção (PE) separados em toda a instalação',
    },
    'TN-C-S': {
      item: 'Sistema de Aterramento TN-C-S (NBR 5410)',
      spec: 'Ponte de Equipotencialização PEN (Cabo 16mm² verde/amarelo antes do IDR)',
    },
    'TN-C': {
      item: 'Sistema de Aterramento TN-C (NBR 5410)',
      spec: 'Barramento Combinado PEN (Cobre para condutor PEN único - sem IDR)',
    },
    'TT': {
      item: 'Sistema de Aterramento TT (NBR 5410)',
      spec: 'Eletrodo de Aterramento Local Independente (Hastes de Cobre + Caixa de Inspeção)',
    },
    'IT': {
      item: 'Sistema de Aterramento IT (NBR 5410)',
      spec: 'Dispositivo Supervisor de Isolamento (DSI) para neutro isolado/impedante',
    },
  };
  const gInfo = groundingSpecMap[config.groundingSystem || 'TN-S'];
  items.push({
    category: 'Aterramento NBR 5410',
    item: gInfo.item,
    specification: gInfo.spec,
    quantity: 1,
    unit: 'cj',
  });

  if (config.topology === 'horizontal') {
    const busbarTypeLabel =
      config.supplyType === 'tri'
        ? 'Trifásico 63A'
        : config.supplyType === 'bi'
        ? 'Bifásico 63A'
        : 'Monofásico 63A';
    items.push({
      category: 'Quadro e Barramentos',
      item: `Barramento Pente DIN ${busbarTypeLabel}`,
      specification: `${config.modulesPerRow} polos isolado em cobre eletrolítico`,
      quantity: Math.max(1, config.horizontalRows - 1),
      unit: 'un',
    });
    const connectorCount =
      (config.supplyType === 'tri' ? 3 : config.supplyType === 'bi' ? 2 : 1) *
      Math.max(1, config.horizontalRows - 1);
    items.push({
      category: 'Quadro e Barramentos',
      item: 'Conector Genérico de Alimentação para Barramento Pente',
      specification: 'Cabo até 25mm²',
      quantity: connectorCount,
      unit: 'un',
    });
  }

  const grouped = new Map<string, { item: string; spec: string; cat: string; count: number }>();

  for (const m of config.modules) {
    if (m.category === 'main_breaker') {
      const poleLabel = m.poles === 1 ? 'Monopolar' : m.poles === 2 ? 'Bipolar' : m.poles === 3 ? 'Tripolar' : 'Tetrapolar';
      const key = `main-${m.poles}-${m.ratingAmps}-${m.curve || 'C'}`;
      grouped.set(key, {
        cat: 'Proteção e Entrada',
        item: `Disjuntor Geral DIN ${poleLabel} ${m.ratingAmps}A`,
        spec: `Curva ${m.curve || 'C'}`,
        count: (grouped.get(key)?.count || 0) + 1,
      });
    } else if (m.category === 'idr') {
      const key = `idr-${m.name}-${m.poles}-${m.ratingAmps}-${m.sensitivityMa || 30}`;
      grouped.set(key, {
        cat: 'Proteção e IDRs Setoriais',
        item: `IDR Setorial (${m.name}) ${m.poles}P ${m.ratingAmps}A`,
        spec: `Sensibilidade ${m.sensitivityMa || 30}mA Classe AC`,
        count: (grouped.get(key)?.count || 0) + 1,
      });
    } else if (m.category === 'rcbo') {
      const poleLabel = m.poles === 1 ? '1P+N' : m.poles === 2 ? '2P' : m.poles === 3 ? '3P' : '4P (3P+N)';
      const key = `rcbo-${m.poles}-${m.ratingAmps}-${m.curve || 'C'}-${m.sensitivityMa || 30}`;
      grouped.set(key, {
        cat: 'Disjuntores DR (RCBO / DDR)',
        item: `Disjuntor DR (RCBO/DDR) ${poleLabel} ${m.ratingAmps}A`,
        spec: `Curva ${m.curve || 'C'} • Sensibilidade ${m.sensitivityMa || 30}mA (NBR NM 61009-1)`,
        count: (grouped.get(key)?.count || 0) + 1,
      });
    } else if (m.category === 'dps') {
      const key = `dps-${m.dpsVoltage || 275}-${m.dpsKa || 20}`;
      grouped.set(key, {
        cat: 'Proteção e Entrada',
        item: `Dispositivo de Proteção contra Surtos DPS Classe II`,
        spec: `${m.dpsVoltage || 275}V ${m.dpsKa || 20}kA (Fase / Neutro)`,
        count: (grouped.get(key)?.count || 0) + 1,
      });
    } else {
      const poleLabel = m.poles === 1 ? '1P' : m.poles === 2 ? '2P' : m.poles === 3 ? '3P' : `${m.poles}P`;
      const key = `brk-${m.poles}-${m.ratingAmps}-${m.curve || 'C'}`;
      grouped.set(key, {
        cat: 'Disjuntores dos Circuitos',
        item: `Disjuntor DIN ${poleLabel} ${m.ratingAmps}A`,
        spec: `Curva ${m.curve || 'C'}`,
        count: (grouped.get(key)?.count || 0) + 1,
      });
    }
  }

  for (const g of grouped.values()) {
    items.push({
      category: g.cat,
      item: g.item,
      specification: g.spec,
      quantity: g.count,
      unit: 'un',
    });
  }

  // Estimativa de cabos internos do QDC por bitola
  const cableEstimates = new Map<number, number>();
  // Cabos de entrada / interligação geral
  const mainMod = config.modules.find((m) => m.category === 'main_breaker');
  if (mainMod) {
    cableEstimates.set(16, (cableEstimates.get(16) || 0) + 4);
    cableEstimates.set(10, (cableEstimates.get(10) || 0) + 3);
    cableEstimates.set(4, (cableEstimates.get(4) || 0) + 2); // Cabos DPS
  }
  for (const m of config.modules) {
    if (isLoadCircuit(m)) {
      const meters = 1.5 * (m.poles + (m.poles === 1 ? 2 : 1));
      cableEstimates.set(m.wireGaugeMm2, (cableEstimates.get(m.wireGaugeMm2) || 0) + meters);
    }
  }
  for (const [gauge, meters] of Array.from(cableEstimates.entries()).sort((a, b) => a[0] - b[0])) {
    items.push({
      category: 'Condutores e Cabos Elétricos',
      item: `Cabo de Cobre Flexível ${gauge} mm² 750V`,
      specification: 'Norma NBR NM 247-3 (Fases / Neutro / Terra)',
      quantity: Math.ceil(meters / 5) * 5,
      unit: 'm',
    });
  }

  const gaugeCounts = new Map<number, number>();
  for (const m of config.modules) {
    if (isLoadCircuit(m)) {
      const count = m.poles + (m.poles === 1 ? 2 : 1);
      gaugeCounts.set(m.wireGaugeMm2, (gaugeCounts.get(m.wireGaugeMm2) || 0) + count * 2);
    }
  }
  for (const [gauge, qty] of Array.from(gaugeCounts.entries()).sort((a, b) => a[0] - b[0])) {
    items.push({
      category: 'Terminais e Acabamento',
      item: `Terminal Tubular Ilhós Isolado ${gauge} mm²`,
      specification: 'Pino de cobre estanhado com isolação padrão DIN',
      quantity: Math.ceil(qty / 10) * 10,
      unit: 'un',
    });
  }

  items.push({
    category: 'Terminais e Acabamento',
    item: 'Kit Etiquetas de Identificação de Circuitos + Abraçadeiras Nylon',
    specification: `Para ${totalDinModules} polos instalados`,
    quantity: 1,
    unit: 'kit',
  });

  return items;
}
