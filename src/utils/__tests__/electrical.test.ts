import { describe, expect, it } from 'vitest';
import { PanelConfig, PanelModule } from '../../types/panel';
import {
  COPPER_RESISTIVITY,
  GROUPING_FACTORS_TABLE,
  WIRE_AMPACITY_TABLE,
  calculateCircuitCurrent,
  calculateVoltageDrop,
  checkDrRequirement,
  getEffectiveWireAmpacity,
  getFcaFromCircuitsCount,
  getPanelOccupiedSlots,
  getPanelTotalSlots,
  getRequiredReserveSlotsNBR5410,
  getTable59ReserveStatus,
  isLoadCircuit,
  previewPhaseBalanceChanges,
  validatePanelNBR5410,
} from '../electrical';

// Helper to create minimal test modules
function createModule(partial: Partial<PanelModule>): PanelModule {
  return {
    id: 'mod-test-1',
    category: 'breaker',
    name: 'Circuito Teste',
    circuitType: 'tug',
    poles: 1,
    ratingAmps: 20,
    railId: 'row_1',
    position: 0,
    phases: 'R',
    voltage: 127,
    powerWatts: 1270,
    wireGaugeMm2: 2.5,
    isOn: true,
    ...partial,
  };
}

// Helper to create minimal test panel configurations
function createPanelConfig(partial: Partial<PanelConfig> = {}): PanelConfig {
  return {
    id: 'panel-test-1',
    title: 'Quadro Principal',
    subtitle: 'QDC Residencial',
    topology: 'horizontal',
    supplyType: 'tri',
    voltageSystem: '127_220',
    groundingSystem: 'TN-S',
    fishboneSlotsPerSide: 12,
    horizontalRows: 2,
    modulesPerRow: 12,
    wireRoutingStyle: 'bundled',
    showWires: false,
    wireFilter: 'all',
    phaseColorScheme: 'nbr_modern',
    modules: [],
    wires: [],
    combBusbars: [],
    ...partial,
  };
}

describe('Electrical Calculations & NBR 5410 Compliance', () => {
  describe('calculateCircuitCurrent', () => {
    describe('1-phase circuits (127V / 220V)', () => {
      it('calculates current correctly for 127V resistive load (pf = 1.0)', () => {
        const mod = createModule({
          poles: 1,
          voltage: 127,
          powerWatts: 1270,
          powerFactor: 1.0,
        });
        // I = P / (V * pf) = 1270 / (127 * 1.0) = 10.0 A
        expect(calculateCircuitCurrent(mod)).toBe(10.0);
      });

      it('calculates current correctly for 220V resistive load (pf = 1.0)', () => {
        const mod = createModule({
          poles: 1,
          voltage: 220,
          powerWatts: 2200,
          powerFactor: 1.0,
        });
        // I = P / (V * pf) = 2200 / (220 * 1.0) = 10.0 A
        expect(calculateCircuitCurrent(mod)).toBe(10.0);
      });

      it('applies inductive default power factor (pf = 0.85) when load name suggests motor/cooling', () => {
        const mod = createModule({
          poles: 1,
          voltage: 220,
          powerWatts: 1870,
          name: 'Ar Condicionado Quarto',
          powerFactor: undefined, // uses getDefaultPowerFactor
        });
        // I = 1870 / (220 * 0.85) = 1870 / 187 = 10.0 A
        expect(calculateCircuitCurrent(mod)).toBe(10.0);
      });

      it('applies explicit custom power factor if provided', () => {
        const mod = createModule({
          poles: 1,
          voltage: 127,
          powerWatts: 1270,
          powerFactor: 0.8,
        });
        // I = 1270 / (127 * 0.8) = 1270 / 101.6 = 12.5 A
        expect(calculateCircuitCurrent(mod)).toBe(12.5);
      });

      it('returns 0 when powerWatts <= 0 or category is not breaker/rcbo', () => {
        const zeroPowerMod = createModule({ powerWatts: 0 });
        expect(calculateCircuitCurrent(zeroPowerMod)).toBe(0);

        const dpsMod = createModule({ category: 'dps', powerWatts: 5000 });
        expect(calculateCircuitCurrent(dpsMod)).toBe(0);

        const mainBreakerMod = createModule({ category: 'main_breaker', powerWatts: 15000 });
        expect(calculateCircuitCurrent(mainBreakerMod)).toBe(0);
      });
    });

    describe('2-phase circuits (220V)', () => {
      it('calculates current for 2-phase 220V resistive shower (5500W)', () => {
        const mod = createModule({
          poles: 2,
          phases: 'RS',
          voltage: 220,
          powerWatts: 5500,
          name: 'Chuveiro Banho',
        });
        // I = 5500 / (220 * 1.0) = 25.0 A
        expect(calculateCircuitCurrent(mod)).toBe(25.0);
      });

      it('calculates current for 2-phase 220V inductive motor (2200W, pf = 0.85)', () => {
        const mod = createModule({
          poles: 2,
          phases: 'RS',
          voltage: 220,
          powerWatts: 2200,
          name: 'Bomba de Piscina',
        });
        // I = 2200 / (220 * 0.85) = 2200 / 187 = 11.764... -> 11.8 A
        expect(calculateCircuitCurrent(mod)).toBe(11.8);
      });

      it('works for RCBO 2-pole device', () => {
        const mod = createModule({
          category: 'rcbo',
          poles: 2,
          phases: 'RT',
          voltage: 220,
          powerWatts: 4400,
          powerFactor: 1.0,
        });
        // I = 4400 / (220 * 1.0) = 20.0 A
        expect(calculateCircuitCurrent(mod)).toBe(20.0);
      });
    });

    describe('3-phase circuits (220V / 380V)', () => {
      it('calculates line current for 3-phase 380V balanced load with sqrt(3)', () => {
        const mod = createModule({
          poles: 3,
          phases: 'RST',
          voltage: 380,
          powerWatts: 10000,
          powerFactor: 1.0,
        });
        // I = 10000 / (sqrt(3) * 380 * 1.0) = 10000 / 658.179 = 15.193 -> 15.2 A
        expect(calculateCircuitCurrent(mod)).toBe(15.2);
      });

      it('calculates line current for 3-phase 220V balanced load with sqrt(3)', () => {
        const mod = createModule({
          poles: 3,
          phases: 'RST',
          voltage: 220,
          powerWatts: 6000,
          powerFactor: 1.0,
        });
        // I = 6000 / (sqrt(3) * 220 * 1.0) = 6000 / 381.051 = 15.745 -> 15.7 A
        expect(calculateCircuitCurrent(mod)).toBe(15.7);
      });

      it('calculates current for 3-phase 380V motor with default inductive pf = 0.85', () => {
        const mod = createModule({
          poles: 3,
          phases: 'RST',
          voltage: 380,
          powerWatts: 5000,
          name: 'Motor Compressor Trifásico',
        });
        // I = 5000 / (sqrt(3) * 380 * 0.85) = 5000 / 559.452 = 8.937 -> 8.9 A
        expect(calculateCircuitCurrent(mod)).toBe(8.9);
      });
    });

    describe('4-pole 3-phase circuits (ensure >= 3 poles calculates line current with sqrt(3))', () => {
      it('calculates line current using sqrt(3) for 4-pole breaker (3P+N)', () => {
        const mod4P = createModule({
          poles: 4,
          phases: 'RST',
          voltage: 380,
          powerWatts: 10000,
          powerFactor: 1.0,
        });
        // I = 10000 / (sqrt(3) * 380 * 1.0) = 15.2 A
        expect(calculateCircuitCurrent(mod4P)).toBe(15.2);
      });

      it('produces identical line current for 3-pole and 4-pole modules with identical load & voltage', () => {
        const mod3P = createModule({
          poles: 3,
          voltage: 380,
          powerWatts: 15000,
          powerFactor: 0.9,
        });
        const mod4P = createModule({
          poles: 4,
          voltage: 380,
          powerWatts: 15000,
          powerFactor: 0.9,
        });

        expect(calculateCircuitCurrent(mod4P)).toBe(calculateCircuitCurrent(mod3P));
        expect(calculateCircuitCurrent(mod4P)).toBe(25.3);
      });

      it('supports 4-pole RCBO device', () => {
        const modRcbo4P = createModule({
          category: 'rcbo',
          poles: 4,
          phases: 'RST',
          voltage: 380,
          powerWatts: 12000,
          powerFactor: 1.0,
        });
        // I = 12000 / (sqrt(3) * 380 * 1.0) = 12000 / 658.179 = 18.232 -> 18.2 A
        expect(calculateCircuitCurrent(modRcbo4P)).toBe(18.2);
      });
    });
  });

  describe('getEffectiveWireAmpacity', () => {
    describe('Base capacity for standard gauges (1.5, 2.5, 4.0, 6.0 mm²)', () => {
      it('returns correct base ampacities for 1-pole and 2-pole conductors (Method B1, 2 conductors loaded)', () => {
        expect(getEffectiveWireAmpacity(1.5, 1)).toBe(17.5);
        expect(getEffectiveWireAmpacity(1.5, 2)).toBe(17.5);

        expect(getEffectiveWireAmpacity(2.5, 1)).toBe(24.0);
        expect(getEffectiveWireAmpacity(2.5, 2)).toBe(24.0);

        expect(getEffectiveWireAmpacity(4.0, 1)).toBe(32.0);
        expect(getEffectiveWireAmpacity(4.0, 2)).toBe(32.0);

        expect(getEffectiveWireAmpacity(6.0, 1)).toBe(41.0);
        expect(getEffectiveWireAmpacity(6.0, 2)).toBe(41.0);
      });

      it('returns correct base ampacities for 3-pole and 4-pole conductors (Method B1, 3 conductors loaded)', () => {
        expect(getEffectiveWireAmpacity(1.5, 3)).toBe(15.5);
        expect(getEffectiveWireAmpacity(1.5, 4)).toBe(15.5);

        expect(getEffectiveWireAmpacity(2.5, 3)).toBe(21.0);
        expect(getEffectiveWireAmpacity(2.5, 4)).toBe(21.0);

        expect(getEffectiveWireAmpacity(4.0, 3)).toBe(28.0);
        expect(getEffectiveWireAmpacity(4.0, 4)).toBe(28.0);

        expect(getEffectiveWireAmpacity(6.0, 3)).toBe(36.0);
        expect(getEffectiveWireAmpacity(6.0, 4)).toBe(36.0);
      });

      it('verifies larger gauges (10.0, 16.0, 25.0 mm²)', () => {
        expect(getEffectiveWireAmpacity(10.0, 2)).toBe(57.0);
        expect(getEffectiveWireAmpacity(10.0, 3)).toBe(50.0);

        expect(getEffectiveWireAmpacity(16.0, 2)).toBe(76.0);
        expect(getEffectiveWireAmpacity(16.0, 3)).toBe(68.0);

        expect(getEffectiveWireAmpacity(25.0, 2)).toBe(101.0);
        expect(getEffectiveWireAmpacity(25.0, 3)).toBe(89.0);
      });
    });

    describe('NBR 5410 Tabela 42 grouping factors (FCA)', () => {
      it('verifies helper getFcaFromCircuitsCount values across all ranges', () => {
        expect(getFcaFromCircuitsCount(1)).toBe(1.00);
        expect(getFcaFromCircuitsCount(2)).toBe(0.80);
        expect(getFcaFromCircuitsCount(3)).toBe(0.70);
        expect(getFcaFromCircuitsCount(4)).toBe(0.65);
        expect(getFcaFromCircuitsCount(5)).toBe(0.60);
        expect(getFcaFromCircuitsCount(6)).toBe(0.57);
        expect(getFcaFromCircuitsCount(7)).toBe(0.54);
        expect(getFcaFromCircuitsCount(8)).toBe(0.52);
        expect(getFcaFromCircuitsCount(9)).toBe(0.50);
        expect(getFcaFromCircuitsCount(11)).toBe(0.50);
        expect(getFcaFromCircuitsCount(12)).toBe(0.45);
        expect(getFcaFromCircuitsCount(15)).toBe(0.45);
        expect(getFcaFromCircuitsCount(16)).toBe(0.41);
        expect(getFcaFromCircuitsCount(19)).toBe(0.41);
        expect(getFcaFromCircuitsCount(20)).toBe(0.38);
        expect(getFcaFromCircuitsCount(30)).toBe(0.38);
      });

      it('applies FCA correctly to calculate effective derated ampacity', () => {
        // 2.5 mm² 2P: base 24A
        // 1 circuit: 24 * 1.0 = 24.0 A
        expect(getEffectiveWireAmpacity(2.5, 2, getFcaFromCircuitsCount(1))).toBe(24.0);

        // 2 circuits: 24 * 0.80 = 19.2 A
        expect(getEffectiveWireAmpacity(2.5, 2, getFcaFromCircuitsCount(2))).toBe(19.2);

        // 3 circuits: 24 * 0.70 = 16.8 A
        expect(getEffectiveWireAmpacity(2.5, 2, getFcaFromCircuitsCount(3))).toBe(16.8);

        // 4 circuits: 24 * 0.65 = 15.6 A
        expect(getEffectiveWireAmpacity(2.5, 2, getFcaFromCircuitsCount(4))).toBe(15.6);

        // 6 circuits: 24 * 0.57 = 13.68 -> 13.7 A
        expect(getEffectiveWireAmpacity(2.5, 2, getFcaFromCircuitsCount(6))).toBe(13.7);

        // 20 circuits: 24 * 0.38 = 9.12 -> 9.1 A
        expect(getEffectiveWireAmpacity(2.5, 2, getFcaFromCircuitsCount(20))).toBe(9.1);
      });

      it('applies FCA correctly to 3-phase conductors (base 21A for 2.5 mm²)', () => {
        // 3 circuits grouping: 21 * 0.70 = 14.7 A
        expect(getEffectiveWireAmpacity(2.5, 3, getFcaFromCircuitsCount(3))).toBe(14.7);
        // 4 circuits grouping on 4.0 mm² (base 28A): 28 * 0.65 = 18.2 A
        expect(getEffectiveWireAmpacity(4.0, 3, getFcaFromCircuitsCount(4))).toBe(18.2);
      });

      it('defaults to 1.0 when groupingFactor is invalid or zero', () => {
        expect(getEffectiveWireAmpacity(2.5, 2, 0)).toBe(24.0);
        expect(getEffectiveWireAmpacity(2.5, 2, -0.5)).toBe(24.0);
      });
    });
  });

  describe('calculateVoltageDrop', () => {
    it('uses COPPER_RESISTIVITY of 0.01724 Ω·mm²/m per NBR 5410', () => {
      expect(COPPER_RESISTIVITY).toBe(0.01724);
    });

    describe('Single-phase and 2-phase calculation (factor 2)', () => {
      it('calculates voltage drop for 1-phase 127V circuit with factor 2: ΔV = (2 * ρ * L * I) / S', () => {
        // L = 20m, I = 10A (1270W at 127V, pf = 1.0), S = 2.5 mm²
        // ΔV = (2 * 0.01724 * 20 * 10) / 2.5 = 6.896 / 2.5 = 2.7584 -> 2.76 V
        // dropPercent = (2.76 / 127) * 100 = 2.17%
        const mod = createModule({
          poles: 1,
          voltage: 127,
          powerWatts: 1270,
          wireGaugeMm2: 2.5,
          lengthMeters: 20,
          powerFactor: 1.0,
        });

        const result = calculateVoltageDrop(mod);
        expect(result.dropVolts).toBe(2.76);
        expect(result.dropPercent).toBe(2.17);
        expect(result.isExcessive).toBe(false);
      });

      it('calculates voltage drop for 2-phase 220V circuit with factor 2', () => {
        // L = 15m, I = 25A (5500W at 220V, pf = 1.0), S = 6.0 mm²
        // ΔV = (2 * 0.01724 * 15 * 25) / 6.0 = 12.93 / 6.0 = 2.155 -> 2.16 V
        // dropPercent = (2.16 / 220) * 100 = 0.98%
        const mod = createModule({
          poles: 2,
          voltage: 220,
          powerWatts: 5500,
          wireGaugeMm2: 6.0,
          lengthMeters: 15,
          powerFactor: 1.0,
        });

        const result = calculateVoltageDrop(mod);
        expect(result.dropVolts).toBe(2.15);
        expect(result.dropPercent).toBe(0.98);
        expect(result.isExcessive).toBe(false);
      });
    });

    describe('3-phase and 4-pole calculation (factor sqrt(3))', () => {
      it('calculates voltage drop for 3-phase 380V circuit with factor sqrt(3): ΔV = (√3 * ρ * L * I) / S', () => {
        // L = 30m, I = 15.2A (10000W at 380V, pf = 1.0), S = 4.0 mm²
        // ΔV = (sqrt(3) * 0.01724 * 30 * 15.2) / 4.0 = 13.6166 / 4.0 = 3.404 -> 3.40 V
        // dropPercent = (3.40 / 380) * 100 = 0.89%
        const mod = createModule({
          poles: 3,
          voltage: 380,
          powerWatts: 10000,
          wireGaugeMm2: 4.0,
          lengthMeters: 30,
          powerFactor: 1.0,
        });

        const result = calculateVoltageDrop(mod);
        expect(result.dropVolts).toBe(3.40);
        expect(result.dropPercent).toBe(0.89);
        expect(result.isExcessive).toBe(false);
      });

      it('uses factor sqrt(3) for 4-pole 3-phase circuits', () => {
        const mod3P = createModule({
          poles: 3,
          voltage: 380,
          powerWatts: 10000,
          wireGaugeMm2: 4.0,
          lengthMeters: 30,
          powerFactor: 1.0,
        });
        const mod4P = createModule({
          poles: 4,
          voltage: 380,
          powerWatts: 10000,
          wireGaugeMm2: 4.0,
          lengthMeters: 30,
          powerFactor: 1.0,
        });

        const res3P = calculateVoltageDrop(mod3P);
        const res4P = calculateVoltageDrop(mod4P);

        expect(res4P.dropVolts).toBe(res3P.dropVolts);
        expect(res4P.dropPercent).toBe(res3P.dropPercent);
        expect(res4P.isExcessive).toBe(false);
      });
    });

    describe('Detection of excessive voltage drop (> 4.0%)', () => {
      it('flags isExcessive = true when drop exceeds 4.0%', () => {
        // L = 40m, I = 15A (1905W at 127V, pf = 1.0), S = 1.5 mm²
        // ΔV = (2 * 0.01724 * 40 * 15) / 1.5 = 20.688 / 1.5 = 13.792 -> 13.79 V
        // dropPercent = (13.79 / 127) * 100 = 10.86% > 4.0%
        const mod = createModule({
          poles: 1,
          voltage: 127,
          powerWatts: 1905,
          wireGaugeMm2: 1.5,
          lengthMeters: 40,
          powerFactor: 1.0,
        });

        const result = calculateVoltageDrop(mod);
        expect(result.dropVolts).toBe(13.79);
        expect(result.dropPercent).toBe(10.86);
        expect(result.isExcessive).toBe(true);
      });

      it('respects parameter overrides for gauge and length', () => {
        const mod = createModule({
          poles: 1,
          voltage: 127,
          powerWatts: 1270,
          wireGaugeMm2: 1.5,
          lengthMeters: 50,
          powerFactor: 1.0,
        });

        // With override gauge = 6.0 mm² and override length = 10 m
        // I = 10A, ΔV = (2 * 0.01724 * 10 * 10) / 6.0 = 3.448 / 6.0 = 0.57 V
        // dropPercent = (0.57 / 127) * 100 = 0.45%
        const overridden = calculateVoltageDrop(mod, 6.0, 10);
        expect(overridden.dropVolts).toBe(0.57);
        expect(overridden.dropPercent).toBe(0.45);
        expect(overridden.isExcessive).toBe(false);
      });

      it('returns zero and non-excessive for non-breaker components or zero power', () => {
        const zeroPower = createModule({ powerWatts: 0 });
        expect(calculateVoltageDrop(zeroPower)).toEqual({
          dropVolts: 0,
          dropPercent: 0,
          isExcessive: false,
        });

        const idr = createModule({ category: 'idr', powerWatts: 5000 });
        expect(calculateVoltageDrop(idr)).toEqual({
          dropVolts: 0,
          dropPercent: 0,
          isExcessive: false,
        });
      });
    });
  });

  describe('getTable59ReserveStatus & NBR 5410 Tabela 59', () => {
    describe('getRequiredReserveSlotsNBR5410', () => {
      it('returns 0 when circuit count is 0', () => {
        expect(getRequiredReserveSlotsNBR5410(0)).toBe(0);
        expect(getRequiredReserveSlotsNBR5410(-1)).toBe(0);
      });

      it('requires 2 reserve slots for <= 6 circuits', () => {
        expect(getRequiredReserveSlotsNBR5410(1)).toBe(2);
        expect(getRequiredReserveSlotsNBR5410(4)).toBe(2);
        expect(getRequiredReserveSlotsNBR5410(6)).toBe(2);
      });

      it('requires 3 reserve slots for 7 to 12 circuits', () => {
        expect(getRequiredReserveSlotsNBR5410(7)).toBe(3);
        expect(getRequiredReserveSlotsNBR5410(10)).toBe(3);
        expect(getRequiredReserveSlotsNBR5410(12)).toBe(3);
      });

      it('requires 4 reserve slots for 13 to 30 circuits', () => {
        expect(getRequiredReserveSlotsNBR5410(13)).toBe(4);
        expect(getRequiredReserveSlotsNBR5410(20)).toBe(4);
        expect(getRequiredReserveSlotsNBR5410(30)).toBe(4);
      });

      it('requires ceil(0.15 * N) reserve slots for > 30 circuits', () => {
        // 31 circuits: 31 * 0.15 = 4.65 -> ceil = 5
        expect(getRequiredReserveSlotsNBR5410(31)).toBe(5);
        // 35 circuits: 35 * 0.15 = 5.25 -> ceil = 6
        expect(getRequiredReserveSlotsNBR5410(35)).toBe(6);
        // 40 circuits: 40 * 0.15 = 6.00 -> ceil = 6
        expect(getRequiredReserveSlotsNBR5410(40)).toBe(6);
      });
    });

    describe('getTable59ReserveStatus panel evaluations', () => {
      it('evaluates compliant status when free slots >= required reserve', () => {
        // Panel: 2 rows x 12 modules = 24 total slots
        // 4 single-pole circuits installed = 4 occupied slots, 20 free slots
        // Required reserve for 4 circuits: 2 slots
        const config = createPanelConfig({
          horizontalRows: 2,
          modulesPerRow: 12,
          modules: [
            createModule({ id: 'c1', poles: 1 }),
            createModule({ id: 'c2', poles: 1 }),
            createModule({ id: 'c3', poles: 1 }),
            createModule({ id: 'c4', poles: 1 }),
          ],
        });

        const status = getTable59ReserveStatus(config);
        expect(status.circuitCount).toBe(4);
        expect(status.totalSlots).toBe(24);
        expect(status.occupiedSlots).toBe(4);
        expect(status.freeSlots).toBe(20);
        expect(status.requiredReserve).toBe(2);
        expect(status.isCompliant).toBe(true);
        expect(status.isOverflowing).toBe(false);
      });

      it('evaluates non-compliant status when free slots < required reserve without overflow', () => {
        // Panel: 1 row x 12 modules = 12 total slots
        // 10 single-pole circuits installed = 10 occupied slots, 2 free slots
        // Required reserve for 10 circuits: 3 slots
        // Free slots (2) < required (3) -> isCompliant = false, isOverflowing = false
        const modules = Array.from({ length: 10 }, (_, i) =>
          createModule({ id: `c-${i + 1}`, poles: 1 })
        );
        const config = createPanelConfig({
          horizontalRows: 1,
          modulesPerRow: 12,
          modules,
        });

        const status = getTable59ReserveStatus(config);
        expect(status.circuitCount).toBe(10);
        expect(status.totalSlots).toBe(12);
        expect(status.occupiedSlots).toBe(10);
        expect(status.freeSlots).toBe(2);
        expect(status.requiredReserve).toBe(3);
        expect(status.isCompliant).toBe(false);
        expect(status.isOverflowing).toBe(false);
      });

      it('evaluates overflow status when occupied slots exceed panel capacity', () => {
        // Panel: 1 row x 12 modules = 12 total slots
        // 7 two-pole circuits installed = 14 occupied slots, -2 free slots
        const modules = Array.from({ length: 7 }, (_, i) =>
          createModule({ id: `c-${i + 1}`, poles: 2 })
        );
        const config = createPanelConfig({
          horizontalRows: 1,
          modulesPerRow: 12,
          modules,
        });

        const status = getTable59ReserveStatus(config);
        expect(status.circuitCount).toBe(7);
        expect(status.totalSlots).toBe(12);
        expect(status.occupiedSlots).toBe(14);
        expect(status.freeSlots).toBe(-2);
        expect(status.isOverflowing).toBe(true);
        expect(status.isCompliant).toBe(false);
      });

      it('calculates total slots correctly for fishbone topology (12 + 2 * sideSlots)', () => {
        // Fishbone: 12 top slots + 2 * 10 side slots = 32 total slots
        const config = createPanelConfig({
          topology: 'fishbone',
          fishboneSlotsPerSide: 10,
          modules: [
            createModule({ id: 'c1', poles: 2 }),
            createModule({ id: 'c2', poles: 3 }),
          ],
        });

        const status = getTable59ReserveStatus(config);
        expect(status.totalSlots).toBe(32);
        expect(status.occupiedSlots).toBe(5);
        expect(status.freeSlots).toBe(27);
      });

      it('counts both breakers and RCBOs as circuits', () => {
        const config = createPanelConfig({
          horizontalRows: 1,
          modulesPerRow: 12,
          modules: [
            createModule({ id: 'b1', category: 'breaker', poles: 1 }),
            createModule({ id: 'r1', category: 'rcbo', poles: 2 }),
            createModule({ id: 'dps1', category: 'dps', poles: 1 }), // Should not count as circuit
          ],
        });

        const status = getTable59ReserveStatus(config);
        expect(status.circuitCount).toBe(2);
        expect(status.occupiedSlots).toBe(4); // 1 + 2 + 1
      });
    });
  });

  describe('checkDrRequirement', () => {
    describe('Mandatory DR detection for Bathrooms & Showers (item 5.1.3.2.2.a)', () => {
      it('detects mandatory DR for bathroom rooms (Banheiro, Suíte, Lavabo, BWC)', () => {
        const banhMod = createModule({ room: 'Banheiro Social', name: 'Tomadas' });
        const suiteMod = createModule({ room: 'Suíte Master', name: 'Iluminação' });
        const lavaboMod = createModule({ room: 'Lavabo', name: 'Tomada' });
        const bwcMod = createModule({ room: 'BWC Serviço', name: 'Tomadas' });

        expect(checkDrRequirement(banhMod).mandatory).toBe(true);
        expect(checkDrRequirement(suiteMod).mandatory).toBe(true);
        expect(checkDrRequirement(lavaboMod).mandatory).toBe(true);
        expect(checkDrRequirement(bwcMod).mandatory).toBe(true);
        expect(checkDrRequirement(banhMod).reason).toContain('5.1.3.2.2.a');
      });

      it('detects mandatory DR for shower equipment (Chuveiro, Ducha, Hidro, Banheira, Jacuzzi)', () => {
        const chuveiroMod = createModule({ room: 'Geral', name: 'Chuveiro 220V' });
        const duchaMod = createModule({ room: 'Geral', name: 'Ducha Higiênica' });
        const hidroMod = createModule({ room: 'Geral', name: 'Bomba Hidromassagem' });
        const banheiraMod = createModule({ room: 'Geral', name: 'Aquecedor Banheira' });
        const jacuzziMod = createModule({ room: 'Geral', name: 'Jacuzzi Spa' });

        expect(checkDrRequirement(chuveiroMod).mandatory).toBe(true);
        expect(checkDrRequirement(duchaMod).mandatory).toBe(true);
        expect(checkDrRequirement(hidroMod).mandatory).toBe(true);
        expect(checkDrRequirement(banheiraMod).mandatory).toBe(true);
        expect(checkDrRequirement(jacuzziMod).mandatory).toBe(true);
        expect(checkDrRequirement(chuveiroMod).reason).toContain('5.1.3.2.2.a');
      });
    });

    describe('Mandatory DR detection for Kitchens & Pantries (item 5.1.3.2.2.d)', () => {
      it('detects mandatory DR for kitchen and food prep areas (Cozinha, Copa, Gourmet, Churrasqueira)', () => {
        const cozinhaMod = createModule({ room: 'Cozinha', name: 'TUG Bancada' });
        const copaMod = createModule({ room: 'Copa', name: 'Tomadas Copa' });
        const gourmetMod = createModule({ room: 'Espaço Gourmet', name: 'Tomadas' });
        const churrasqMod = createModule({ room: 'Área da Churrasqueira', name: 'Iluminação' });

        expect(checkDrRequirement(cozinhaMod).mandatory).toBe(true);
        expect(checkDrRequirement(copaMod).mandatory).toBe(true);
        expect(checkDrRequirement(gourmetMod).mandatory).toBe(true);
        expect(checkDrRequirement(churrasqMod).mandatory).toBe(true);
        expect(checkDrRequirement(cozinhaMod).reason).toContain('5.1.3.2.2.d');
      });
    });

    describe('Mandatory DR detection for Laundries, Service Areas & Garages (item 5.1.3.2.2.d)', () => {
      it('detects mandatory DR for service and garage areas (Lavanderia, Serviço, Garagem, Abrigo)', () => {
        const lavandMod = createModule({ room: 'Lavanderia', name: 'Tomadas' });
        const servMod = createModule({ room: 'Área de Serviço', name: 'TUG' });
        const garageMod = createModule({ room: 'Garagem', name: 'Tomadas Carregador' });
        const abrigoMod = createModule({ room: 'Abrigo de Carros', name: 'Iluminação' });

        expect(checkDrRequirement(lavandMod).mandatory).toBe(true);
        expect(checkDrRequirement(servMod).mandatory).toBe(true);
        expect(checkDrRequirement(garageMod).mandatory).toBe(true);
        expect(checkDrRequirement(abrigoMod).mandatory).toBe(true);
        expect(checkDrRequirement(lavandMod).reason).toContain('5.1.3.2.2.d');
      });

      it('detects mandatory DR for wet area equipment by name', () => {
        const torneiraMod = createModule({ room: 'Geral', name: 'Torneira Elétrica' });
        const maquinaMod = createModule({ room: 'Geral', name: 'Máquina de Lavar' });
        const lavaSecaMod = createModule({ room: 'Geral', name: 'Lava e Seca' });
        const lavaLoucasMod = createModule({ room: 'Geral', name: 'Lava Louças' });

        expect(checkDrRequirement(torneiraMod).mandatory).toBe(true);
        expect(checkDrRequirement(maquinaMod).mandatory).toBe(true);
        expect(checkDrRequirement(lavaSecaMod).mandatory).toBe(true);
        expect(checkDrRequirement(lavaLoucasMod).mandatory).toBe(true);
      });
    });

    describe('Mandatory DR detection for Outdoor & External Areas (item 5.1.3.2.2.b/c)', () => {
      it('detects mandatory DR for external locations (Jardim, Quintal, Varanda, Sacada, Piscina, Fachada)', () => {
        const jardimMod = createModule({ room: 'Jardim', name: 'Refletores LED' });
        const quintalMod = createModule({ room: 'Quintal', name: 'Tomadas Externas' });
        const varandaMod = createModule({ room: 'Varanda', name: 'TUG' });
        const sacadaMod = createModule({ room: 'Sacada', name: 'Tomada' });
        const piscinaMod = createModule({ room: 'Piscina', name: 'Bomba e Iluminação' });
        const fachadaMod = createModule({ room: 'Fachada', name: 'Arandelas' });

        expect(checkDrRequirement(jardimMod).mandatory).toBe(true);
        expect(checkDrRequirement(quintalMod).mandatory).toBe(true);
        expect(checkDrRequirement(varandaMod).mandatory).toBe(true);
        expect(checkDrRequirement(sacadaMod).mandatory).toBe(true);
        expect(checkDrRequirement(piscinaMod).mandatory).toBe(true);
        expect(checkDrRequirement(fachadaMod).mandatory).toBe(true);
        expect(checkDrRequirement(jardimMod).reason).toContain('5.1.3.2.2.b/c');
      });
    });

    describe('Non-mandatory locations and edge cases', () => {
      it('returns mandatory = false for dry bedrooms, living rooms, and offices', () => {
        const salaMod = createModule({ room: 'Sala de Estar', name: 'Iluminação Geral' });
        const quartoMod = createModule({ room: 'Dormitório 1', name: 'TUG Quarto' });
        const homeOfficeMod = createModule({ room: 'Escritório', name: 'Computadores' });
        const corredorMod = createModule({ room: 'Circulação', name: 'Lustre' });

        expect(checkDrRequirement(salaMod).mandatory).toBe(false);
        expect(checkDrRequirement(quartoMod).mandatory).toBe(false);
        expect(checkDrRequirement(homeOfficeMod).mandatory).toBe(false);
        expect(checkDrRequirement(corredorMod).mandatory).toBe(false);
      });

      it('returns mandatory = false for non-breaker components even if placed in wet rooms', () => {
        const mainBreaker = createModule({
          category: 'main_breaker',
          room: 'Banheiro Social',
          name: 'Disjuntor Geral',
        });
        const dps = createModule({
          category: 'dps',
          room: 'Cozinha',
          name: 'DPS Fase',
        });

        expect(checkDrRequirement(mainBreaker).mandatory).toBe(false);
        expect(checkDrRequirement(dps).mandatory).toBe(false);
      });

      it('is accent-insensitive and case-insensitive', () => {
        const mod1 = createModule({ room: 'ÁREA DE SERVIÇO' });
        const mod2 = createModule({ room: 'suíte master' });
        const mod3 = createModule({ name: 'MÁQUINA DE LAVAR' });

        expect(checkDrRequirement(mod1).mandatory).toBe(true);
        expect(checkDrRequirement(mod2).mandatory).toBe(true);
        expect(checkDrRequirement(mod3).mandatory).toBe(true);
      });
    });

    describe('Sectoral IDRs & RCBO (DDR) Protection (NBR 5410)', () => {
      it('flags overload when sum of assigned circuit currents exceeds sectoral IDR rating without upstream limit', () => {
        const main = createModule({
          id: 'main-63a',
          category: 'main_breaker',
          ratingAmps: 63,
          poles: 3,
        });
        const idrCozinha = createModule({
          id: 'idr-cozinha',
          category: 'idr',
          name: 'IDR Cozinha',
          ratingAmps: 25,
          poles: 2,
        });
        // 2 circuits assigned to idr-cozinha totalling 28A > 25A
        const c1 = createModule({
          id: 'c1',
          category: 'breaker',
          powerWatts: 2000,
          voltage: 127, // ~15.7A
          idrId: 'idr-cozinha',
          drProtected: true,
        });
        const c2 = createModule({
          id: 'c2',
          category: 'breaker',
          powerWatts: 1800,
          voltage: 127, // ~14.2A
          idrId: 'idr-cozinha',
          drProtected: true,
        });

        const config = createPanelConfig({
          supplyType: 'tri',
          modules: [main, idrCozinha, c1, c2],
        });

        const issues = validatePanelNBR5410(config);
        const overloadIssue = issues.find((i) => i.id === 'idr-overload-idr-cozinha');
        expect(overloadIssue).toBeDefined();
        expect(overloadIssue?.severity).toBe('error');
        expect(overloadIssue?.message).toContain('superando o limite nominal de 25A');
      });

      it('does NOT flag overload if upstream main breaker limits current (In Main <= In IDR)', () => {
        const main = createModule({
          id: 'main-40a',
          category: 'main_breaker',
          ratingAmps: 40,
          poles: 3,
        });
        const idr = createModule({
          id: 'idr-40a',
          category: 'idr',
          name: 'IDR Setor',
          ratingAmps: 40,
          poles: 2,
        });
        const c1 = createModule({
          id: 'c1',
          category: 'breaker',
          powerWatts: 3000,
          voltage: 127,
          idrId: 'idr-40a',
          drProtected: true,
        });

        const config = createPanelConfig({
          supplyType: 'tri',
          modules: [main, idr, c1],
        });

        const issues = validatePanelNBR5410(config);
        const overloadIssue = issues.find((i) => i.id === 'idr-overload-idr-40a');
        expect(overloadIssue).toBeUndefined();
      });

      it('recognizes RCBO as inherently DR protected in wet areas without triggering missing-dr error', () => {
        const rcbo = createModule({
          id: 'rcbo-chuveiro',
          category: 'rcbo',
          name: 'Chuveiro Banheiro',
          room: 'Banheiro Social',
          powerWatts: 5500,
          voltage: 220,
          ratingAmps: 32,
          poles: 2,
        });

        const config = createPanelConfig({
          supplyType: 'bi',
          modules: [rcbo],
        });

        const issues = validatePanelNBR5410(config);
        const missingDr = issues.find((i) => i.id.startsWith('missing-dr-'));
        expect(missingDr).toBeUndefined();
      });
    });
  });

  describe('isLoadCircuit', () => {
    it('returns true for breaker and rcbo modules', () => {
      expect(isLoadCircuit(createModule({ category: 'breaker' }))).toBe(true);
      expect(isLoadCircuit(createModule({ category: 'rcbo' }))).toBe(true);
    });

    it('returns false for non-load categories (dps, idr, main_breaker)', () => {
      expect(isLoadCircuit(createModule({ category: 'dps' }))).toBe(false);
      expect(isLoadCircuit(createModule({ category: 'idr' }))).toBe(false);
      expect(isLoadCircuit(createModule({ category: 'main_breaker' }))).toBe(false);
    });
  });

  describe('previewPhaseBalanceChanges', () => {
    it('assigns RST to 3-pole and 4-pole load circuits (tetrapolar / 3P+N)', () => {
      const mod3P = createModule({
        id: 'c-3p',
        poles: 3,
        phases: 'RST',
        voltage: 380,
        powerWatts: 6000,
        category: 'breaker',
      });
      const mod4P = createModule({
        id: 'c-4p',
        poles: 4,
        phases: 'R', // starts misassigned to R
        voltage: 380,
        powerWatts: 9000,
        category: 'rcbo',
      });
      const config = createPanelConfig({
        supplyType: 'tri',
        modules: [mod3P, mod4P],
      });

      const preview = previewPhaseBalanceChanges(config);
      const mod4PProposed = preview.proposedModules.find((m) => m.id === 'c-4p');
      expect(mod4PProposed?.phases).toBe('RST');

      const mod3PProposed = preview.proposedModules.find((m) => m.id === 'c-3p');
      expect(mod3PProposed?.phases).toBe('RST');

      // 6000 / 3 = 2000W each; 9000 / 3 = 3000W each; Total on R, S, T: 5000W each
      expect(preview.after.wattsR).toBe(5000);
      expect(preview.after.wattsS).toBe(5000);
      expect(preview.after.wattsT).toBe(5000);
      expect(preview.after.imbalancePercent).toBe(0);
    });
  });
});
