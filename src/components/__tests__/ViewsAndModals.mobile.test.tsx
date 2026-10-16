import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CircuitScheduleView } from '../CircuitScheduleView';
import { SingleLineDiagramView } from '../SingleLineDiagramView';
import { BomAndLabelsView } from '../BomAndLabelsView';
import { PhaseBalanceModal } from '../PhaseBalanceModal';
import { BreakerRecalculateModal } from '../BreakerRecalculateModal';
import { PANEL_PRESETS } from '../../data/presets';
import { previewPhaseBalanceChanges, previewBreakerRecalculation } from '../../utils/electrical';

describe('Responsive Views and Modals for Mobile & Small Screens', () => {
  const sampleConfig = PANEL_PRESETS.fishbone;

  describe('CircuitScheduleView Responsiveness', () => {
    it('renders view mode toggle buttons for Cards and Table', () => {
      const markup = renderToStaticMarkup(
        <CircuitScheduleView
          config={sampleConfig}
          onUpdateModule={vi.fn()}
          onDeleteModule={vi.fn()}
          onQuickAddCircuit={vi.fn()}
          onOpenBalancePreview={vi.fn()}
          onAutoDimensionAll={vi.fn()}
        />
      );

      expect(markup).toContain('Cards');
      expect(markup).toContain('Tabela');
      expect(markup).toContain('title="Visualização em Cards compactos (Ideal para telas de celular)"');
    });

    it('renders responsive sectoral IDR grid and action buttons', () => {
      const markup = renderToStaticMarkup(
        <CircuitScheduleView
          config={sampleConfig}
          onUpdateModule={vi.fn()}
          onDeleteModule={vi.fn()}
          onQuickAddCircuit={vi.fn()}
          onOpenBalancePreview={vi.fn()}
          onAutoDimensionAll={vi.fn()}
        />
      );

      // Grid responsivo com 1 coluna no mobile, 2 em sm, 3 em lg
      expect(markup).toContain('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
      // Botões com layout flex-wrap para celulares
      expect(markup).toContain('flex flex-wrap items-center gap-2');
    });
  });

  describe('SingleLineDiagramView Responsiveness', () => {
    it('renders Auto-fit zoom button and touch-pan smooth scroll container', () => {
      const markup = renderToStaticMarkup(<SingleLineDiagramView config={sampleConfig} />);

      // Botão Auto-fit
      expect(markup).toContain('title="Ajustar diagrama à largura da tela (Auto-fit)"');
      expect(markup).toContain('Ajustar');

      // Container com classes de rolagem fluida e suporte touch
      expect(markup).toContain('touch-pan-x touch-pan-y scroll-smooth');
      // Justify adaptado para mobile
      expect(markup).toContain('justify-start sm:justify-center');
    });

    it('hides secondary badges on mobile to keep toolbar compact', () => {
      const markup = renderToStaticMarkup(<SingleLineDiagramView config={sampleConfig} />);

      expect(markup).toContain('hidden sm:inline-flex');
      expect(markup).toContain('hidden sm:block text-[11px] text-slate-400');
    });
  });

  describe('BomAndLabelsView Responsiveness', () => {
    it('renders responsive top action bar and wrap buttons', () => {
      const markup = renderToStaticMarkup(
        <BomAndLabelsView
          config={sampleConfig}
          onExportJson={vi.fn()}
          onExportSvg={vi.fn()}
          onOpenUnifilar={vi.fn()}
        />
      );

      expect(markup).toContain('flex-col sm:flex-row');
      expect(markup).toContain('Copiar Lista');
      expect(markup).toContain('Imprimir');
    });

    it('uses responsive grid for door directory sheet cards', () => {
      const markup = renderToStaticMarkup(
        <BomAndLabelsView
          config={sampleConfig}
          onExportJson={vi.fn()}
          onExportSvg={vi.fn()}
        />
      );

      // Grid responsivo: 1 coluna no celular, 2 em sm, 3 em lg
      expect(markup).toContain('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
      // Tabela com rolagem suave
      expect(markup).toContain('overflow-x-auto scroll-smooth touch-pan-x');
    });
  });

  describe('PhaseBalanceModal Responsiveness', () => {
    it('renders within safe viewport bounds with touch-friendly action buttons', () => {
      const preview = previewPhaseBalanceChanges(sampleConfig);
      const markup = renderToStaticMarkup(
        <PhaseBalanceModal
          preview={preview}
          supplyType={sampleConfig.supplyType}
          maxRefAmps={63}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Modal container constraints
      expect(markup).toContain('max-w-xl mx-2');
      expect(markup).toContain('max-h-[90vh]');

      // Rodapé com botões de tamanho de toque adequado
      expect(markup).toContain('flex-col-reverse sm:flex-row');
      expect(markup).toContain('min-h-[40px]');
    });
  });

  describe('BreakerRecalculateModal Responsiveness', () => {
    it('renders 2x2 metric cards on mobile and 1-column comparison on narrow screens', () => {
      const preview = previewBreakerRecalculation(sampleConfig);
      const markup = renderToStaticMarkup(
        <BreakerRecalculateModal
          preview={preview}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Modal container constraints
      expect(markup).toContain('max-w-2xl mx-2');
      expect(markup).toContain('max-h-[90vh]');

      // 2 colunas em mobile estreito, 4 em telas maiores
      expect(markup).toContain('grid-cols-2 sm:grid-cols-4');

      // Grid comparativo disjuntor & cabo (1 col mobile, 2 cols sm)
      expect(markup).toContain('grid-cols-1 sm:grid-cols-2');

      // Rodapé com botões touch-friendly
      expect(markup).toContain('flex-col-reverse sm:flex-row');
      expect(markup).toContain('min-h-[40px]');
    });
  });
});
