import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from '../../App';
import { CatalogSidebar } from '../CatalogSidebar';
import { InspectorPanel } from '../InspectorPanel';
import { PANEL_PRESETS } from '../../data/presets';

describe('Global Mobile Shell & Navigation', () => {
  it('renders mobile bottom navigation bar with 4 tabs', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('aria-label="Navegação Principal"');
    expect(markup).toContain('Montagem');
    expect(markup).toContain('Unifilar');
    expect(markup).toContain('Cargas');
    expect(markup).toContain('Materiais');
  });

  it('renders mobile hamburger button in header', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('aria-label="Opções do projeto"');
    expect(markup).toContain('QDC STUDIO');
  });

  it('renders floating drawer toggle buttons on canvas view', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('title="Adicionar componentes do catálogo"');
    expect(markup).toContain('title="Ver análise e propriedades gerais"');
  });

  it('renders close button in CatalogSidebar when onClose is provided', () => {
    const onClose = vi.fn();
    const markup = renderToStaticMarkup(
      <CatalogSidebar
        config={PANEL_PRESETS.fishbone}
        onUpdateConfig={vi.fn()}
        onQuickAddCatalogItem={vi.fn()}
        onAutoWire={vi.fn()}
        onClearWires={vi.fn()}
        wireToolActive={false}
        onToggleWireTool={vi.fn()}
        activeWireType="phase_r"
        onSelectWireType={vi.fn()}
        activeWireGauge={2.5}
        onSelectWireGauge={vi.fn()}
        onClose={onClose}
      />
    );

    expect(markup).toContain('aria-label="Fechar catálogo"');
    expect(markup).toContain('Catálogo e Configurações');
  });

  it('ensures quick add buttons in CatalogSidebar have minimum 44px touch targets', () => {
    const markup = renderToStaticMarkup(
      <CatalogSidebar
        config={PANEL_PRESETS.fishbone}
        onUpdateConfig={vi.fn()}
        onQuickAddCatalogItem={vi.fn()}
        onAutoWire={vi.fn()}
        onClearWires={vi.fn()}
        wireToolActive={false}
        onToggleWireTool={vi.fn()}
        activeWireType="phase_r"
        onSelectWireType={vi.fn()}
        activeWireGauge={2.5}
        onSelectWireGauge={vi.fn()}
      />
    );

    expect(markup).toContain('min-w-[44px]');
    expect(markup).toContain('min-h-[44px]');
  });

  it('renders close button in InspectorPanel when onClose is provided', () => {
    const onClose = vi.fn();
    const markup = renderToStaticMarkup(
      <InspectorPanel
        config={PANEL_PRESETS.fishbone}
        selectedModule={PANEL_PRESETS.fishbone.modules[0]}
        onUpdateModule={vi.fn()}
        onMoveModule={vi.fn()}
        onDeleteModule={vi.fn()}
        onDuplicateModule={vi.fn()}
        onNudgeModule={vi.fn()}
        onSelectModule={vi.fn()}
        onOpenBalancePreview={vi.fn()}
        onClose={onClose}
      />
    );

    expect(markup).toContain('aria-label="Fechar propriedades"');
    expect(markup).toContain('Propriedades &amp; Análise');
  });
});
