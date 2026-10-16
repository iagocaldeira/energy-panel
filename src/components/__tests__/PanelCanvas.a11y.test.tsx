import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PanelCanvas,
  handleModuleKeyboardNavigation,
  getModuleAriaLabel,
} from '../PanelCanvas';
import { PANEL_PRESETS } from '../../data/presets';
import { PanelConfig, PanelModule } from '../../types/panel';

describe('PanelCanvas - CAD Accessibility (a11y), Daltonism & Keyboard Navigation', () => {
  const dummySvgRef = { current: null } as React.RefObject<SVGSVGElement>;

  const defaultProps = {
    selectedModuleId: null,
    onSelectModule: vi.fn(),
    onToggleModulePower: vi.fn(),
    onMoveModule: vi.fn(),
    onDropCatalogItem: vi.fn(),
    onDeleteModule: vi.fn(),
    wireToolActive: false,
    activeWireType: 'phase_r' as const,
    activeWireGauge: 2.5,
    onAddWire: vi.fn(),
    onDeleteWire: vi.fn(),
    svgRef: dummySvgRef,
  };

  it('renders accessible SVG defs with colorblind-safe patterns for phases R, S, T and N', () => {
    const config: PanelConfig = {
      ...PANEL_PRESETS.fishbone,
    };

    const markup = renderToStaticMarkup(
      <PanelCanvas {...defaultProps} config={config} />
    );

    // Phase R: Diagonal stripes
    expect(markup).toContain('id="pattern-phase-r"');
    expect(markup).toContain('id="pattern-phase-r-overlay"');
    expect(markup).toContain('id="hatch-phase-r"');
    expect(markup).toContain('rotate(45)');

    // Phase S: Polka dots / crosshatch
    expect(markup).toContain('id="pattern-phase-s"');
    expect(markup).toContain('id="pattern-phase-s-overlay"');
    expect(markup).toContain('id="dots-phase-s"');

    // Phase T: Horizontal stripes
    expect(markup).toContain('id="pattern-phase-t"');
    expect(markup).toContain('id="pattern-phase-t-overlay"');
    expect(markup).toContain('id="stripes-phase-t"');

    // Neutral N: Grid pattern
    expect(markup).toContain('id="pattern-phase-n"');
    expect(markup).toContain('id="grid-phase-n"');
  });

  it('renders tabIndex=0, role="button", and descriptive aria-label on installed modules for screen reader accessibility', () => {
    const testModule: PanelModule = {
      id: 'mod-test-1',
      category: 'breaker',
      name: 'Tomadas Cozinha',
      circuitNumber: 3,
      circuitType: 'tug',
      poles: 1,
      ratingAmps: 20,
      curve: 'C',
      railId: 'top_main',
      position: 4,
      phases: 'R',
      voltage: 127,
      powerWatts: 2540,
      wireGaugeMm2: 2.5,
      isOn: true,
    };

    const config: PanelConfig = {
      ...PANEL_PRESETS.fishbone,
      modules: [testModule],
    };

    const markup = renderToStaticMarkup(
      <PanelCanvas {...defaultProps} config={config} />
    );

    // Module must be focusable and have button semantics
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('role="button"');

    // Aria-label must describe component, poles, rating, and phase
    expect(markup).toContain(
      'aria-label="Circuito 3 - Tomadas Cozinha - 1P - C20A - (Fase R) - Ligado"'
    );
  });

  it('renders high-contrast Daltonism phase badges with pattern swatches and bold letters on modules', () => {
    const monoModule: PanelModule = {
      id: 'mod-mono',
      category: 'breaker',
      name: 'Luz Sala',
      circuitNumber: 1,
      circuitType: 'lighting',
      poles: 1,
      ratingAmps: 10,
      curve: 'B',
      railId: 'row_1',
      position: 0,
      phases: 'R',
      voltage: 127,
      powerWatts: 1270,
      wireGaugeMm2: 1.5,
      isOn: true,
    };

    const biModule: PanelModule = {
      id: 'mod-bi',
      category: 'breaker',
      name: 'Chuveiro',
      circuitNumber: 2,
      circuitType: 'tue',
      poles: 2,
      ratingAmps: 32,
      curve: 'C',
      railId: 'row_2',
      position: 2,
      phases: 'RS',
      voltage: 220,
      powerWatts: 7040,
      wireGaugeMm2: 6.0,
      isOn: true,
    };

    const triModule: PanelModule = {
      id: 'mod-tri',
      category: 'main_breaker',
      name: 'Disjuntor Geral',
      circuitType: 'protection',
      poles: 3,
      ratingAmps: 63,
      curve: 'C',
      railId: 'row_1',
      position: 4,
      phases: 'RST',
      voltage: 220,
      powerWatts: 24000,
      wireGaugeMm2: 16.0,
      isOn: true,
    };

    const config: PanelConfig = {
      ...PANEL_PRESETS.horizontal,
      modules: [monoModule, biModule, triModule],
    };

    const markup = renderToStaticMarkup(
      <PanelCanvas {...defaultProps} config={config} />
    );

    // Phase R badge with hatch pattern and text
    expect(markup).toContain('url(#hatch-phase-r)');
    expect(markup).toContain('>R<');

    // Phase RS badge with hatch (R) and dots (S) patterns and text
    expect(markup).toContain('url(#dots-phase-s)');
    expect(markup).toContain('>RS<');

    // Phase RST badge with R, S, and T patterns and text
    expect(markup).toContain('url(#stripes-phase-t)');
    expect(markup).toContain('>RST<');
  });

  it('renders tactile pattern overlays and high-contrast badges on Fishbone busbar fingers', () => {
    const config: PanelConfig = {
      ...PANEL_PRESETS.fishbone,
      fishboneSlotsPerSide: 6,
      supplyType: 'tri',
    };

    const markup = renderToStaticMarkup(
      <PanelCanvas {...defaultProps} config={config} />
    );

    // Fishbone fingers must have tactile overlays matching phases R, S, T
    expect(markup).toContain('url(#pattern-phase-r-overlay)');
    expect(markup).toContain('url(#pattern-phase-s-overlay)');
    expect(markup).toContain('url(#pattern-phase-t-overlay)');

    // Vertical copper busbars must have accessible header badges
    expect(markup).toContain('Acessibilidade Daltonismo');
  });

  it('includes visible focus outlines on module selection and focus rings', () => {
    const module: PanelModule = {
      id: 'mod-focus-test',
      category: 'breaker',
      name: 'Circuito 1',
      circuitNumber: 1,
      circuitType: 'tug',
      poles: 1,
      ratingAmps: 16,
      curve: 'C',
      railId: 'row_1',
      position: 0,
      phases: 'S',
      voltage: 127,
      powerWatts: 2000,
      wireGaugeMm2: 2.5,
      isOn: true,
    };

    const config: PanelConfig = {
      ...PANEL_PRESETS.horizontal,
      modules: [module],
    };

    const markup = renderToStaticMarkup(
      <PanelCanvas {...defaultProps} config={config} />
    );

    // Should include group-focus outline classes
    expect(markup).toContain('group-focus/module:stroke-amber-400');
    expect(markup).toContain('group-focus-visible/module:stroke-amber-400');
  });

  it('executes keyboard actions onKeyDown (ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Space, Enter, Delete, Escape)', () => {
    const onMoveModule = vi.fn();
    const onToggleModulePower = vi.fn();
    const onDeleteModule = vi.fn();
    const onSelectModule = vi.fn();

    const callbacks = {
      onMoveModule,
      onToggleModulePower,
      onDeleteModule,
      onSelectModule,
    };

    const testModule: PanelModule = {
      id: 'mod-kb-test',
      category: 'breaker',
      name: 'Chuveiro',
      circuitNumber: 1,
      circuitType: 'tue',
      poles: 2,
      ratingAmps: 32,
      curve: 'C',
      railId: 'top_main',
      position: 3,
      phases: 'RS',
      voltage: 220,
      powerWatts: 6800,
      wireGaugeMm2: 6.0,
      isOn: true,
    };

    // 1. ArrowRight -> nudge slot +1
    expect(handleModuleKeyboardNavigation('ArrowRight', testModule, callbacks)).toBe(true);
    expect(onMoveModule).toHaveBeenCalledWith('mod-kb-test', 'top_main', 4);

    // 2. ArrowLeft -> nudge slot -1
    expect(handleModuleKeyboardNavigation('ArrowLeft', testModule, callbacks)).toBe(true);
    expect(onMoveModule).toHaveBeenCalledWith('mod-kb-test', 'top_main', 2);

    // 3. ArrowUp -> nudge slot -1
    expect(handleModuleKeyboardNavigation('ArrowUp', testModule, callbacks)).toBe(true);
    expect(onMoveModule).toHaveBeenCalledWith('mod-kb-test', 'top_main', 2);

    // 4. ArrowDown -> nudge slot +1
    expect(handleModuleKeyboardNavigation('ArrowDown', testModule, callbacks)).toBe(true);
    expect(onMoveModule).toHaveBeenCalledWith('mod-kb-test', 'top_main', 4);

    // 5. Space -> toggle module power
    expect(handleModuleKeyboardNavigation(' ', testModule, callbacks)).toBe(true);
    expect(onToggleModulePower).toHaveBeenCalledWith('mod-kb-test');

    // 6. Enter -> toggle module power
    expect(handleModuleKeyboardNavigation('Enter', testModule, callbacks)).toBe(true);
    expect(onToggleModulePower).toHaveBeenCalledTimes(2);

    // 7. Delete -> delete module
    expect(handleModuleKeyboardNavigation('Delete', testModule, callbacks)).toBe(true);
    expect(onDeleteModule).toHaveBeenCalledWith('mod-kb-test');

    // 8. Backspace -> delete module
    expect(handleModuleKeyboardNavigation('Backspace', testModule, callbacks)).toBe(true);
    expect(onDeleteModule).toHaveBeenCalledTimes(2);

    // 9. Escape -> clear selection
    expect(handleModuleKeyboardNavigation('Escape', testModule, callbacks)).toBe(true);
    expect(onSelectModule).toHaveBeenCalledWith(null);

    // 10. Other key -> returns false
    expect(handleModuleKeyboardNavigation('Tab', testModule, callbacks)).toBe(false);
  });
});

