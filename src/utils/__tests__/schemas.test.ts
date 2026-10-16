import { describe, expect, it } from 'vitest';
import { PANEL_PRESETS } from '../../data/presets';
import { parsePanelConfig } from '../schemas';

describe('QDC Project Schema & Zod Runtime Validation', () => {
  describe('1. Valid PanelConfig parsing', () => {
    it('successfully parses and validates the default fishbone preset', () => {
      const result = parsePanelConfig(PANEL_PRESETS.fishbone);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topology).toBe('fishbone');
        expect(result.data.modules.length).toBeGreaterThan(0);
        expect(result.data.wires.length).toBeGreaterThan(0);
      }
    });

    it('successfully parses and validates the default horizontal DIN preset', () => {
      const result = parsePanelConfig(PANEL_PRESETS.horizontal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topology).toBe('horizontal');
        expect(result.data.combBusbars.length).toBeGreaterThan(0);
      }
    });

    it('successfully parses valid raw JSON string input', () => {
      const jsonStr = JSON.stringify({
        id: 'projeto-teste-string',
        title: 'Painel Teste String',
        topology: 'horizontal',
        modules: [
          {
            category: 'breaker',
            name: 'Circuito Iluminação',
            poles: 1,
            ratingAmps: 10,
            railId: 'row_1',
            wireGaugeMm2: 1.5,
          },
        ],
      });

      const result = parsePanelConfig(jsonStr);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Painel Teste String');
        expect(result.data.modules[0].name).toBe('Circuito Iluminação');
        expect(result.data.modules[0].ratingAmps).toBe(10);
      }
    });

    it('preserves module electrical properties accurately', () => {
      const raw = {
        topology: 'horizontal',
        modules: [
          {
            id: 'mod-custom-1',
            category: 'breaker',
            name: 'Chuveiro',
            poles: 2,
            ratingAmps: 32,
            curve: 'B',
            railId: 'row_2',
            position: 3,
            phases: 'RS',
            voltage: 220,
            powerWatts: 5500,
            wireGaugeMm2: 6.0,
            isOn: false,
            drProtected: true,
            lengthMeters: 25,
            powerFactor: 1.0,
          },
        ],
      };

      const result = parsePanelConfig(raw);
      expect(result.success).toBe(true);
      if (result.success) {
        const mod = result.data.modules[0];
        expect(mod.id).toBe('mod-custom-1');
        expect(mod.curve).toBe('B');
        expect(mod.phases).toBe('RS');
        expect(mod.voltage).toBe(220);
        expect(mod.powerWatts).toBe(5500);
        expect(mod.wireGaugeMm2).toBe(6.0);
        expect(mod.isOn).toBe(false);
        expect(mod.drProtected).toBe(true);
        expect(mod.lengthMeters).toBe(25);
        expect(mod.powerFactor).toBe(1.0);
      }
    });
  });

  describe('2. Validation failure on invalid topology', () => {
    it('fails when topology is set to an unsupported string (e.g. "circular")', () => {
      const invalidConfig = {
        ...PANEL_PRESETS.fishbone,
        topology: 'circular',
      };

      const result = parsePanelConfig(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        const errorText = result.errors.join(' ');
        expect(errorText).toContain('topology');
      }
    });

    it('fails when topology is missing or empty', () => {
      const missingTopology = {
        title: 'Painel Sem Topologia',
      };

      const result = parsePanelConfig(missingTopology);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorText = result.errors.join(' ');
        expect(errorText).toContain('topology');
      }
    });
  });

  describe('3. Validation failure on corrupted module poles or invalid negative wire gauges', () => {
    it('fails when a module has corrupted poles value > 4 (e.g. poles: 5)', () => {
      const corruptedConfig = {
        topology: 'fishbone',
        modules: [
          {
            category: 'breaker',
            poles: 5, // Invalid: must be 1, 2, 3 or 4
            ratingAmps: 20,
            railId: 'left_rail',
            wireGaugeMm2: 2.5,
          },
        ],
      };

      const result = parsePanelConfig(corruptedConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorText = result.errors.join(' ');
        expect(errorText).toContain('poles');
      }
    });

    it('fails when a module has corrupted poles value <= 0 (e.g. poles: 0 or poles: -1)', () => {
      const corruptedZero = {
        topology: 'fishbone',
        modules: [
          {
            category: 'breaker',
            poles: 0,
            ratingAmps: 20,
            railId: 'left_rail',
            wireGaugeMm2: 2.5,
          },
        ],
      };

      const result = parsePanelConfig(corruptedZero);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorText = result.errors.join(' ');
        expect(errorText).toContain('poles');
      }
    });

    it('fails when a module has invalid negative wire gauge (e.g. wireGaugeMm2: -2.5)', () => {
      const negativeGauge = {
        topology: 'horizontal',
        modules: [
          {
            category: 'breaker',
            poles: 1,
            ratingAmps: 16,
            railId: 'row_1',
            wireGaugeMm2: -2.5, // Invalid: must be positive
          },
        ],
      };

      const result = parsePanelConfig(negativeGauge);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorText = result.errors.join(' ');
        expect(errorText).toContain('wireGaugeMm2');
      }
    });

    it('fails when a module has zero wire gauge (wireGaugeMm2: 0)', () => {
      const zeroGauge = {
        topology: 'horizontal',
        modules: [
          {
            category: 'breaker',
            poles: 1,
            ratingAmps: 16,
            railId: 'row_1',
            wireGaugeMm2: 0,
          },
        ],
      };

      const result = parsePanelConfig(zeroGauge);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorText = result.errors.join(' ');
        expect(errorText).toContain('wireGaugeMm2');
      }
    });

    it('fails when a wire connection has invalid negative gaugeMm2', () => {
      const negativeWire = {
        topology: 'fishbone',
        wires: [
          {
            fromId: 'mod-1',
            fromPort: 'out_0',
            toId: 'mod-2',
            toPort: 'in_0',
            wireType: 'phase_r',
            gaugeMm2: -4.0, // Invalid: negative gauge
          },
        ],
      };

      const result = parsePanelConfig(negativeWire);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorText = result.errors.join(' ');
        expect(errorText).toContain('wires.0.gaugeMm2');
      }
    });

    it('fails when a module has negative powerWatts or non-positive ratingAmps', () => {
      const invalidPowerAndRating = {
        topology: 'fishbone',
        modules: [
          {
            category: 'breaker',
            poles: 1,
            ratingAmps: -10, // Invalid: must be positive
            powerWatts: -100, // Invalid: cannot be negative
            railId: 'left_rail',
            wireGaugeMm2: 2.5,
          },
        ],
      };

      const result = parsePanelConfig(invalidPowerAndRating);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorText = result.errors.join(' ');
        expect(errorText).toMatch(/ratingAmps|powerWatts/);
      }
    });
  });

  describe('4. Default fallback behavior for missing optional properties', () => {
    it('applies sensible defaults for missing panel root properties', () => {
      const minimalValid = {
        topology: 'fishbone',
      };

      const result = parsePanelConfig(minimalValid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('qdc-project');
        expect(result.data.title).toBe('Quadro de Distribuição');
        expect(result.data.subtitle).toBe('Planejamento e Dimensionamento NBR 5410');
        expect(result.data.supplyType).toBe('tri');
        expect(result.data.voltageSystem).toBe('127_220');
        expect(result.data.groundingSystem).toBe('TN-S');
        expect(result.data.penGroundedAtPanel).toBe(true);
        expect(result.data.fishboneSlotsPerSide).toBe(12);
        expect(result.data.horizontalRows).toBe(3);
        expect(result.data.modulesPerRow).toBe(16);
        expect(result.data.wireRoutingStyle).toBe('curved');
        expect(result.data.showWires).toBe(true);
        expect(result.data.wireFilter).toBe('all');
        expect(result.data.phaseColorScheme).toBe('nbr_modern');
        expect(result.data.modules).toEqual([]);
        expect(result.data.wires).toEqual([]);
        expect(result.data.combBusbars).toEqual([]);
      }
    });

    it('applies sensible defaults for missing module properties', () => {
      const withMinimalModule = {
        topology: 'horizontal',
        modules: [
          {
            category: 'breaker',
            poles: 1,
            ratingAmps: 16,
            railId: 'row_1',
            wireGaugeMm2: 2.5,
          },
        ],
      };

      const result = parsePanelConfig(withMinimalModule);
      expect(result.success).toBe(true);
      if (result.success) {
        const mod = result.data.modules[0];
        expect(mod.id).toBeDefined();
        expect(mod.name).toBe('Circuito');
        expect(mod.circuitType).toBe('tug');
        expect(mod.position).toBe(0);
        expect(mod.phases).toBe('R');
        expect(mod.voltage).toBe(127);
        expect(mod.powerWatts).toBe(0);
        expect(mod.isOn).toBe(true);
        expect(mod.drProtected).toBe(false);
      }
    });
  });

  describe('5. Handling non-object and malformed inputs', () => {
    it('returns error when input is null, undefined, or primitive', () => {
      expect(parsePanelConfig(null).success).toBe(false);
      expect(parsePanelConfig(undefined).success).toBe(false);
      expect(parsePanelConfig(42).success).toBe(false);
      expect(parsePanelConfig(true).success).toBe(false);
      expect(parsePanelConfig([]).success).toBe(false);
    });

    it('returns syntax error when raw string is not valid JSON', () => {
      const result = parsePanelConfig('{ broken json:');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('Erro de sintaxe JSON');
      }
    });
  });
});
