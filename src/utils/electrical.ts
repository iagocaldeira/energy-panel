import {
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

export function calculateCircuitCurrent(module: PanelModule): number {
  if (module.category !== 'breaker' || module.powerWatts <= 0) return 0;
  if (module.poles === 3) {
    return +(module.powerWatts / (Math.sqrt(3) * module.voltage)).toFixed(1);
  }
  return +(module.powerWatts / module.voltage).toFixed(1);
}

export function getRecommendedWireGauge(
  currentAmps: number,
  breakerAmps: number,
  circuitType: PanelModule['circuitType'],
  poles: number
): number {
  const minGauge = circuitType === 'lighting' ? 1.5 : 2.5;
  const targetAmps = Math.max(currentAmps, breakerAmps);
  for (const row of WIRE_AMPACITY_TABLE) {
    if (row.gaugeMm2 < minGauge) continue;
    const capacity = poles >= 3 ? row.maxAmps3P : row.maxAmps2P;
    if (capacity >= targetAmps) {
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

export function getCircuitsByPhase(
  config: PanelConfig,
  phase: 'R' | 'S' | 'T'
): PhaseCircuitContribution[] {
  const is127_220 = config.voltageSystem === '127_220';
  const vFN = is127_220 ? 127 : 220;
  const vFF = is127_220 ? 220 : 380;
  const list: PhaseCircuitContribution[] = [];

  for (const mod of config.modules) {
    if (mod.category !== 'breaker' || !mod.isOn || mod.powerWatts <= 0) continue;
    if (!mod.phases.includes(phase)) continue;

    const numPhasesUsed = mod.phases.length || 1;
    const wattsOnPhase = Math.round(mod.powerWatts / numPhasesUsed);

    let ampsOnPhase = 0;
    if (mod.poles >= 3) {
      ampsOnPhase = +(mod.powerWatts / (Math.sqrt(3) * (mod.voltage || vFF))).toFixed(1);
    } else if (mod.poles === 2) {
      ampsOnPhase = +(mod.powerWatts / (mod.voltage || vFF)).toFixed(1);
    } else {
      ampsOnPhase = +(mod.powerWatts / (mod.voltage || vFN)).toFixed(1);
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
    if (mod.category !== 'breaker' || !mod.isOn || mod.powerWatts <= 0) continue;

    const p = mod.powerWatts;
    const volt = mod.voltage || (mod.poles === 1 ? vFN : vFF);

    if (mod.poles >= 3) {
      const i3P = p / (Math.sqrt(3) * volt);
      wattsR += p / 3;
      wattsS += p / 3;
      wattsT += p / 3;
      ampsRSum += i3P;
      ampsSSum += i3P;
      ampsTSum += i3P;
    } else if (mod.poles === 2) {
      const i2P = p / volt;
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
      const i1P = p / volt;
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

export function validatePanelNBR5410(config: PanelConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mainBreaker = config.modules.find((m) => m.category === 'main_breaker');
  const idrs = config.modules.filter((m) => m.category === 'idr');
  const dpsList = config.modules.filter((m) => m.category === 'dps');
  const breakers = config.modules.filter((m) => m.category === 'breaker');

  if (!mainBreaker) {
    issues.push({
      id: 'no-main-breaker',
      severity: 'error',
      title: 'Ausência de Disjuntor Geral',
      message: 'NBR 5410 exige dispositivo geral de seccionamento e proteção contra sobrecorrente no QDC.',
    });
  }

  if (idrs.length === 0) {
    issues.push({
      id: 'no-idr',
      severity: 'warning',
      title: 'Sem Interruptor Diferencial Residual (IDR)',
      message: 'NBR 5410 torna obrigatório o uso de IDR de alta sensibilidade (≤ 30mA) para áreas molhadas, externas e tomadas.',
    });
  }

  const hasNeutralDps = dpsList.some((d) => d.phases === 'N');
  if (dpsList.length === 0) {
    issues.push({
      id: 'no-dps',
      severity: 'warning',
      title: 'Sem Dispositivo de Proteção contra Surtos (DPS)',
      message: 'Recomenda-se instalar DPS Classe II nas fases de entrada e no neutro.',
    });
  } else if (!hasNeutralDps) {
    issues.push({
      id: 'no-neutral-dps',
      severity: 'warning',
      title: 'Falta DPS para o Neutro',
      message: 'Adicione um módulo DPS conectado ao Neutro para proteção completa em esquemas com IDR.',
    });
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

  for (const b of breakers) {
    const current = calculateCircuitCurrent(b);
    const wireRow = WIRE_AMPACITY_TABLE.find((w) => w.gaugeMm2 === b.wireGaugeMm2);
    const wireMaxAmps = wireRow ? (b.poles >= 3 ? wireRow.maxAmps3P : wireRow.maxAmps2P) : 24;

    if (current > b.ratingAmps) {
      issues.push({
        id: `overload-${b.id}`,
        moduleId: b.id,
        severity: 'error',
        title: `${b.name}: Corrente (${current}A) maior que o Disjuntor (${b.ratingAmps}A)`,
        message: `O circuito consome ${b.powerWatts}W (${current}A em ${b.voltage}V), mas o disjuntor é de ${b.ratingAmps}A. Sugestão: C${getRecommendedBreakerRating(current, b.circuitType)}.`,
      });
    }

    if (b.ratingAmps > wireMaxAmps) {
      issues.push({
        id: `wire-undersized-${b.id}`,
        moduleId: b.id,
        severity: 'error',
        title: `${b.name}: Cabo ${b.wireGaugeMm2}mm² subdimensionado para Disjuntor ${b.ratingAmps}A`,
        message: `Cabo ${b.wireGaugeMm2}mm² suporta até ${wireMaxAmps}A, inferior ao disjuntor de ${b.ratingAmps}A. Use cabo de ${getRecommendedWireGauge(current, b.ratingAmps, b.circuitType, b.poles)}mm².`,
      });
    }
  }

  return issues;
}

export function autoBalancePhases(config: PanelConfig): PanelModule[] {
  if (config.supplyType === 'mono') {
    return config.modules.map((m) =>
      m.category === 'breaker' ? { ...m, phases: 'R' } : m
    );
  }

  const availableSinglePhases: PhaseAssignment[] =
    config.supplyType === 'bi' ? ['R', 'S'] : ['R', 'S', 'T'];
  const availableDoublePhases: PhaseAssignment[] =
    config.supplyType === 'bi' ? ['RS'] : ['RS', 'ST', 'RT'];

  const loads: Record<'R' | 'S' | 'T', number> = { R: 0, S: 0, T: 0 };

  const breakers = config.modules
    .filter((m) => m.category === 'breaker')
    .sort((a, b) => b.powerWatts - a.powerWatts);

  const phaseMap = new Map<string, PhaseAssignment>();

  for (const b of breakers) {
    if (b.poles === 3) {
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
    if (oldMod.category === 'breaker' && oldMod.phases !== newMod.phases) {
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
  const idr = config.modules.find((m) => m.category === 'idr');
  const dpsModules = config.modules
    .filter((m) => m.category === 'dps')
    .sort((a, b) => a.position - b.position);
  const breakers = config.modules
    .filter((m) => m.category === 'breaker')
    .sort((a, b) => a.position - b.position);

  const phaseTypes: WireType[] =
    config.supplyType === 'mono'
      ? ['phase_r']
      : config.supplyType === 'bi'
      ? ['phase_r', 'phase_s']
      : ['phase_r', 'phase_s', 'phase_t'];

  // 1. Incoming Supply (`supply_in`) -> TOP of Main Breaker (Phases) & TOP of IDR (Neutral)
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

  if (idr) {
    const neutralPole = idr.poles - 1;
    wires.push({
      id: `auto-supply-idr-n`,
      fromId: 'supply_in',
      fromPort: `neutral`,
      toId: idr.id,
      toPort: `top_${neutralPole}`,
      wireType: 'neutral',
      gaugeMm2: 16,
      isAutoGenerated: true,
    });
  }

  // 2. BOTTOM of Main Breaker -> TOP of IDR (Phases R, S, T)
  if (mainBreaker && idr) {
    phaseTypes.forEach((wt, idx) => {
      if (idx < mainBreaker.poles && idx < idr.poles - 1) {
        wires.push({
          id: `auto-main-idr-${idx}`,
          fromId: mainBreaker.id,
          fromPort: `bottom_${idx}`,
          toId: idr.id,
          toPort: `top_${idx}`,
          wireType: wt,
          gaugeMm2: 10,
          isAutoGenerated: true,
        });
      }
    });
    // Neutral out from IDR bottom last pole -> Neutral bar
    const neutralPole = idr.poles - 1;
    wires.push({
      id: `auto-idr-neutral-out`,
      fromId: idr.id,
      fromPort: `bottom_${neutralPole}`,
      toId: 'neutral_bar',
      toPort: `term_0`,
      wireType: 'neutral',
      gaugeMm2: 10,
      isAutoGenerated: true,
    });
  }

  // 3. Feed from IDR (or Main Breaker) BOTTOM ports -> Fishbone Busbar or Comb Busbars
  const sourceModule = idr || mainBreaker;
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
        const hasBreakersOnRail = breakers.some((b) => b.railId === railId);
        if (!hasBreakersOnRail) return;
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
      if (idr) {
        const neutralPole = idr.poles - 1;
        wires.push({
          id: `auto-dps-in-${dps.id}`,
          fromId: idr.id,
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

  // 5. Circuit Breaker outgoing Load Wires + Neutral & Ground bar terminal stubs
  const leftBreakers = breakers.filter((b) => b.railId === 'left_rail');
  const rightBreakers = breakers.filter((b) => b.railId !== 'left_rail');

  leftBreakers.forEach((b, bIdx) => {
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

  rightBreakers.forEach((b, bIdx) => {
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

  breakers.forEach((b, bIdx) => {
    // Unique terminal indices that never collide with IDR (term_0) or DPS (term_0..dpsCount-1)
    const neutralTermIndex = bIdx + 1;
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
      const poleLabel = m.poles === 1 ? 'Monopolar' : m.poles === 2 ? 'Bipolar' : 'Tripolar';
      const key = `main-${m.poles}-${m.ratingAmps}-${m.curve || 'C'}`;
      grouped.set(key, {
        cat: 'Proteção e Entrada',
        item: `Disjuntor Geral DIN ${poleLabel} ${m.ratingAmps}A`,
        spec: `Curva ${m.curve || 'C'}`,
        count: (grouped.get(key)?.count || 0) + 1,
      });
    } else if (m.category === 'idr') {
      const key = `idr-${m.poles}-${m.ratingAmps}-${m.sensitivityMa || 30}`;
      grouped.set(key, {
        cat: 'Proteção e Entrada',
        item: `Interruptor Diferencial Residual IDR ${m.poles}P ${m.ratingAmps}A`,
        spec: `Sensibilidade ${m.sensitivityMa || 30}mA Classe AC`,
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
      const poleLabel = m.poles === 1 ? '1P' : m.poles === 2 ? '2P' : '3P';
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
    if (m.category === 'breaker') {
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
    if (m.category === 'breaker') {
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
