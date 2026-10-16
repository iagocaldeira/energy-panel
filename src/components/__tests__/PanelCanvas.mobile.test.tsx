import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PanelCanvas } from '../PanelCanvas';
import { PANEL_PRESETS } from '../../data/presets';
import { PanelConfig } from '../../types/panel';

describe('PanelCanvas - Mobile Responsiveness & Touch Support', () => {
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

  it('renders "Ajustar à Tela" (Fit to Screen) auto-zoom button in toolbar', () => {
    const config: PanelConfig = { ...PANEL_PRESETS.fishbone };
    const markup = renderToStaticMarkup(
      <PanelCanvas {...defaultProps} config={config} />
    );

    expect(markup).toContain('title="Ajustar à Tela (Fit to Screen)"');
    expect(markup).toContain('Ajustar');
  });

  it('renders smooth touch panning attributes on the SVG viewport and container', () => {
    const config: PanelConfig = { ...PANEL_PRESETS.fishbone };
    const markup = renderToStaticMarkup(
      <PanelCanvas {...defaultProps} config={config} />
    );

    // touch-pan-x and touch-pan-y classes for CSS touch-action
    expect(markup).toContain('touch-pan-x touch-pan-y');
    expect(markup).toContain('touch-action:pan-x pan-y');
  });

  it('renders enlarged r=18 invisible touch hitbox for wire terminal ports when wire tool is active', () => {
    const config: PanelConfig = { ...PANEL_PRESETS.fishbone };
    const markup = renderToStaticMarkup(
      <PanelCanvas {...defaultProps} config={config} wireToolActive={true} />
    );

    // Check for enlarged invisible hitbox (r=18)
    expect(markup).toContain('r="18"');
    expect(markup).toContain('fill="transparent"');
  });

  it('renders mobile floating quick action bar when a module is selected', () => {
    const config: PanelConfig = { ...PANEL_PRESETS.fishbone };
    const selectedMod = config.modules[0];
    expect(selectedMod).toBeDefined();

    const markup = renderToStaticMarkup(
      <PanelCanvas
        {...defaultProps}
        config={config}
        selectedModuleId={selectedMod.id}
      />
    );

    // Floating action bar container for mobile (md:hidden fixed bottom-20)
    expect(markup).toContain('md:hidden');
    expect(markup).toContain('fixed bottom-20');

    // Quick action buttons
    expect(markup).toContain(selectedMod.isOn ? 'Desligar disjuntor' : 'Ligar disjuntor');
    expect(markup).toContain(selectedMod.isOn ? 'LIGADO' : 'DESLIGADO');
    expect(markup).toContain('Mover para esquerda');
    expect(markup).toContain('Mover para direita');
    expect(markup).toContain('Excluir módulo');
    expect(markup).toContain('Desmarcar seleção');
  });

  it('does not render mobile floating action bar when selectedModuleId is null', () => {
    const config: PanelConfig = { ...PANEL_PRESETS.fishbone };
    const markup = renderToStaticMarkup(
      <PanelCanvas
        {...defaultProps}
        config={config}
        selectedModuleId={null}
      />
    );

    expect(markup).not.toContain('fixed bottom-20');
  });
});
