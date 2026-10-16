import React, { useMemo, useRef, useState } from 'react';
import {
  Download,
  FileDown,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Sun,
  Moon,
  Info,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { PanelConfig, PanelModule } from '../types/panel';
import { calculateCircuitCurrent } from '../utils/electrical';
import { downloadPdfFromSvg, downloadSvg } from '../utils/diagramExport';

interface SingleLineDiagramViewProps {
  config: PanelConfig;
}

type DiagramTheme = 'white' | 'blueprint';

export const SingleLineDiagramView: React.FC<SingleLineDiagramViewProps> = ({ config }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [theme, setTheme] = useState<DiagramTheme>('white');
  const [showReserves, setShowReserves] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [showNotes, setShowNotes] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Filter terminal circuits (breakers and RCBOs) sorted by circuit number
  const circuits = useMemo(() => {
    return config.modules
      .filter((m) => m.category === 'breaker' || m.category === 'rcbo')
      .sort((a, b) => (a.circuitNumber || 99) - (b.circuitNumber || 99));
  }, [config.modules]);

  // Main breaker
  const mainBreaker = useMemo(() => {
    return (
      config.modules.find((m) => m.category === 'main_breaker') || {
        ratingAmps: config.supplyType === 'mono' ? 40 : config.supplyType === 'bi' ? 50 : 63,
        curve: 'C',
        poles: config.supplyType === 'mono' ? 1 : config.supplyType === 'bi' ? 2 : 3,
      }
    );
  }, [config.modules, config.supplyType]);

  // IDR Geral
  const idrModule = useMemo(() => {
    return config.modules.find((m) => m.category === 'idr');
  }, [config.modules]);

  // DPS modules
  const dpsModules = useMemo(() => {
    return config.modules.filter((m) => m.category === 'dps');
  }, [config.modules]);

  // Recommended reserve circuits per NBR 5410 item 6.5.4.7
  const reserveCount = useMemo(() => {
    const total = circuits.length;
    if (total <= 6) return 2;
    if (total <= 12) return 3;
    if (total <= 24) return 4;
    return Math.max(4, Math.ceil(total * 0.15));
  }, [circuits.length]);

  // Total installed power and currents
  const totalWatts = useMemo(() => {
    return circuits.reduce((sum, c) => sum + (c.powerWatts || 0), 0);
  }, [circuits]);

  const estimatedDemandWatts = useMemo(() => {
    // Typical residential demand factor ~0.75 per NBR 5410
    return Math.round(totalWatts * 0.75);
  }, [totalWatts]);

  // Sizing of diagram canvas
  const circuitColWidth = 140;
  const numActiveCols = circuits.length;
  const numReserveCols = showReserves ? reserveCount : 0;
  const totalCols = Math.max(1, numActiveCols + numReserveCols);

  const leftHeaderWidth = 620; // Room for input feeder, main breaker, DPS, IDR
  const rightMargin = 80;
  const diagramWidth = Math.max(1680, leftHeaderWidth + totalCols * circuitColWidth + rightMargin);
  const diagramHeight = 1060;

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => setZoom(1);

  // SVG Export
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    try {
      setIsExporting(true);
      const filename = `${config.id || 'qdc'}-diagrama-unifilar`;
      downloadSvg(svgRef.current, filename);
      setExportNotice('Arquivo SVG exportado com sucesso!');
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar diagrama em SVG.');
    } finally {
      setIsExporting(false);
    }
  };

  // PDF Export
  const handleExportPdf = async () => {
    if (!svgRef.current) return;
    try {
      setIsExporting(true);
      setExportNotice('Gerando documento PDF de engenharia...');
      const filename = `${config.id || 'qdc'}-diagrama-unifilar.pdf`;
      await downloadPdfFromSvg(svgRef.current, filename, {
        format: 'a3',
        orientation: 'landscape',
      });
      setExportNotice('PDF exportado com sucesso em folha A3 Paisagem!');
      setTimeout(() => setExportNotice(null), 3500);
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar diagrama em PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Theme palettes
  const isDark = theme === 'blueprint';
  const colors = {
    bg: isDark ? '#080f1d' : '#ffffff',
    paperBorder: isDark ? '#1e293b' : '#334155',
    gridLines: isDark ? '#0f1c33' : '#f1f5f9',
    mainLines: isDark ? '#e2e8f0' : '#0f172a',
    subLines: isDark ? '#64748b' : '#64748b',
    textPrimary: isDark ? '#f8fafc' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#475569',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    cardBg: isDark ? '#0e172a' : '#f8fafc',
    cardBorder: isDark ? '#1e293b' : '#cbd5e1',

    // Electrical functional colors (NBR 5410)
    phaseR: '#ef4444',
    phaseS: isDark ? '#fbbf24' : '#d97706',
    phaseT: isDark ? '#60a5fa' : '#2563eb',
    neutral: '#0ea5e9',
    ground: '#22c55e',
    breakerSymbol: isDark ? '#f8fafc' : '#0f172a',
    idrSymbol: isDark ? '#38bdf8' : '#0284c7',
    dpsSymbol: isDark ? '#f43f5e' : '#e11d48',
    busbarFill: isDark ? '#1e293b' : '#e2e8f0',
  };

  // Geometry coordinates
  const frameMargin = 28;
  const innerMargin = 38;

  // Header coordinates
  const mainY = 190; // Main feeder / busbar horizontal level
  const feederStartX = 90;
  const mainBreakerX = 230;
  const dpsBranchX = 350;
  const idrX = 470;
  const busbarStartX = 580;

  // Busbar vertical heights for R, S, T, N, PE
  const isTri = config.supplyType === 'tri';
  const isBi = config.supplyType === 'bi';

  const busbarR_Y = mainY - 28;
  const busbarS_Y = mainY - 14;
  const busbarT_Y = mainY;
  const busbarN_Y = mainY + 22;
  const busbarPE_Y = mainY + 40;

  const busbarEndX = busbarStartX + totalCols * circuitColWidth + 30;

  // Bottom table / stamps coordinates
  const bottomSectionY = 820;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Control Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 border-b border-slate-800 shrink-0 print:hidden z-10 shadow-sm">
        {/* Title & Badges */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-100 tracking-tight">
                Diagrama Unifilar Esquemático
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                NBR 5410 • NBR 5444
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {config.supplyType.toUpperCase()} ({config.voltageSystem.replace('_', '/') + 'V'})
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                Aterramento: {config.groundingSystem || 'TN-S'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Esquema unifilar completo com alimentador, disjuntor geral, DPS, IDR, barramentos, simbologia NBR 5444 e carimbo técnico.
            </p>
          </div>
        </div>

        {/* View Options & Export Actions */}
        <div className="flex items-center gap-2">
          {/* Theme switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setTheme('white')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
                theme === 'white'
                  ? 'bg-slate-800 text-amber-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Prancha Técnica com fundo branco (Padrão ABNT / Impressão)"
            >
              <Sun className="w-3.5 h-3.5" />
              Prancha Branca
            </button>
            <button
              onClick={() => setTheme('blueprint')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
                theme === 'blueprint'
                  ? 'bg-slate-800 text-sky-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Modo CAD Blueprint (Fundo escuro para visualização em tela)"
            >
              <Moon className="w-3.5 h-3.5" />
              Blueprint CAD
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs text-slate-300">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:text-white hover:bg-slate-800 rounded transition"
              title="Reduzir Zoom (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-0.5 font-mono text-[11px] hover:text-white rounded transition"
              title="Resetar Zoom (100%)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:text-white hover:bg-slate-800 rounded transition"
              title="Aumentar Zoom (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle elements */}
          <button
            onClick={() => setShowReserves((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
              showReserves
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Alternar exibição de circuitos de reserva NBR 5410"
          >
            Reservas {showReserves ? 'ON' : 'OFF'}
          </button>

          {/* Direct Print */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            title="Imprimir prancha pelo navegador"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>

          {/* Download SVG */}
          <button
            onClick={handleExportSvg}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
            title="Baixar arquivo vetorial SVG (AutoCAD / Inkscape / Ilustrator)"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar SVG
          </button>

          {/* Download PDF */}
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md disabled:opacity-50"
            title="Baixar documento PDF vetorial em folha A3 Paisagem com carimbo técnico"
          >
            <FileDown className="w-3.5 h-3.5" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Floating Notification */}
      {exportNotice && (
        <div className="absolute top-16 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-amber-500/50 text-amber-300 text-xs font-semibold shadow-2xl backdrop-blur animate-fade-in">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Diagram Canvas Container with Pan & Zoom */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-950 select-none print:p-0 print:bg-white print:overflow-visible"
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="shadow-2xl rounded-sm print:shadow-none print:transform-none"
        >
          <svg
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            viewBox={`0 0 ${diagramWidth} ${diagramHeight}`}
            width={diagramWidth}
            height={diagramHeight}
            className="block font-sans"
            style={{
              backgroundColor: colors.bg,
              color: colors.textPrimary,
            }}
          >
            <defs>
              {/* Technical Grid Pattern */}
              <pattern
                id="unifilar-grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke={colors.gridLines}
                  strokeWidth="0.75"
                />
              </pattern>

              {/* Arrow Marker */}
              <marker
                id="arrow-end"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={colors.mainLines} />
              </marker>

              {/* Dot marker */}
              <marker
                id="dot-marker"
                viewBox="0 0 8 8"
                refX="4"
                refY="4"
                markerWidth="5"
                markerHeight="5"
              >
                <circle cx="4" cy="4" r="3" fill={colors.mainLines} />
              </marker>
            </defs>

            {/* Background Grid */}
            <rect
              x="0"
              y="0"
              width={diagramWidth}
              height={diagramHeight}
              fill={`url(#unifilar-grid)`}
            />

            {/* ------------------------------------------------------------- */}
            {/* PRANCHA TÉCNICA ABNT: MOLDURA E BORDAS                         */}
            {/* ------------------------------------------------------------- */}
            {/* Outer Drawing Border */}
            <rect
              x={frameMargin}
              y={frameMargin}
              width={diagramWidth - frameMargin * 2}
              height={diagramHeight - frameMargin * 2}
              fill="none"
              stroke={colors.paperBorder}
              strokeWidth="2.5"
            />
            {/* Inner Margem */}
            <rect
              x={innerMargin}
              y={innerMargin}
              width={diagramWidth - innerMargin * 2}
              height={diagramHeight - innerMargin * 2}
              fill="none"
              stroke={colors.paperBorder}
              strokeWidth="1"
              strokeDasharray="none"
            />

            {/* Drawing Sheet Title Bar (Top Ribbon) */}
            <g transform={`translate(${innerMargin}, ${innerMargin})`}>
              <rect
                x="0"
                y="0"
                width={diagramWidth - innerMargin * 2}
                height="38"
                fill={colors.cardBg}
                stroke={colors.cardBorder}
                strokeWidth="1"
              />
              <text
                x="20"
                y="24"
                fill={colors.textPrimary}
                fontSize="14"
                fontWeight="bold"
                letterSpacing="1"
              >
                DIAGRAMA UNIFILAR ESQUEMÁTICO — QUADRO DE DISTRIBUIÇÃO GERAL (QDC)
              </text>
              <text
                x={diagramWidth - innerMargin * 2 - 20}
                y="24"
                fill={colors.textSecondary}
                fontSize="11"
                textAnchor="end"
                fontWeight="600"
              >
                PROJETO EM CONFORMIDADE COM A ABNT NBR 5410:2004 E ABNT NBR 5444
              </text>
            </g>

            {/* ------------------------------------------------------------- */}
            {/* 1. ENTRADA E ALIMENTADOR PRINCIPAL                            */}
            {/* ------------------------------------------------------------- */}
            <g id="feeder-section">
              {/* Feeder Origin Box */}
              <rect
                x={feederStartX - 40}
                y={mainY - 55}
                width="145"
                height="48"
                rx="4"
                fill={colors.cardBg}
                stroke={colors.cardBorder}
                strokeWidth="1.2"
              />
              <text
                x={feederStartX + 32}
                y={mainY - 37}
                fill={colors.textPrimary}
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
              >
                REDE CONCESSIONÁRIA
              </text>
              <text
                x={feederStartX + 32}
                y={mainY - 24}
                fill={colors.textSecondary}
                fontSize="8"
                fontWeight="600"
                textAnchor="middle"
              >
                PADRÃO DE ENTRADA
              </text>
              <text
                x={feederStartX + 32}
                y={mainY - 12}
                fill={colors.phaseR}
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
              >
                {config.supplyType === 'tri'
                  ? '3F + N + PE'
                  : config.supplyType === 'bi'
                  ? '2F + N + PE'
                  : '1F + N + PE'}{' '}
                • {config.voltageSystem.replace('_', '/')}V
              </text>

              {/* Feeder Line towards Main Breaker */}
              <line
                x1={feederStartX + 105}
                y1={mainY - 31}
                x2={mainBreakerX - 45}
                y2={mainY - 31}
                stroke={colors.mainLines}
                strokeWidth="2.5"
              />
              {/* Arrow into panel */}
              <polygon
                points={`${mainBreakerX - 45},${mainY - 35} ${mainBreakerX - 35},${mainY - 31} ${mainBreakerX - 45},${mainY - 27}`}
                fill={colors.mainLines}
              />

              {/* Feeder conductor marks (NBR 5444) on the feeder line */}
              {/* X position for conductor tick marks: feederStartX + 130 */}
              <g transform={`translate(${feederStartX + 125}, ${mainY - 31})`}>
                {/* Phase conductor ticks (1, 2 or 3) */}
                <line x1="-8" y1="-12" x2="-2" y2="12" stroke={colors.mainLines} strokeWidth="2" />
                {config.supplyType !== 'mono' && (
                  <line x1="-3" y1="-12" x2="3" y2="12" stroke={colors.mainLines} strokeWidth="2" />
                )}
                {config.supplyType === 'tri' && (
                  <line x1="2" y1="-12" x2="8" y2="12" stroke={colors.mainLines} strokeWidth="2" />
                )}

                {/* Neutral conductor mark: tick with hook/circle at top */}
                <line x1="12" y1="-12" x2="12" y2="0" stroke={colors.neutral} strokeWidth="2" />
                <circle cx="12" cy="-12" r="2.5" fill={colors.neutral} />

                {/* Ground conductor mark: PE cross/T */}
                <line x1="20" y1="-12" x2="20" y2="0" stroke={colors.ground} strokeWidth="2" />
                <line x1="16" y1="-12" x2="24" y2="-12" stroke={colors.ground} strokeWidth="2" />
              </g>

              {/* Feeder Wire Gauge Spec Text */}
              <text
                x={feederStartX + 100}
                y={mainY - 5}
                fill={colors.textSecondary}
                fontSize="8.5"
                fontWeight="bold"
              >
                Cabo #{mainBreaker.ratingAmps >= 63 ? '16.0' : mainBreaker.ratingAmps >= 50 ? '10.0' : '6.0'} mm²
              </text>
              <text
                x={feederStartX + 100}
                y={mainY + 8}
                fill={colors.textMuted}
                fontSize="7.5"
              >
                Eletroduto PVC Ø {mainBreaker.ratingAmps >= 63 ? '32mm (1")' : '25mm (3/4")'}
              </text>
            </g>

            {/* ------------------------------------------------------------- */}
            {/* 2. PROTEÇÃO GERAL: DISJUNTOR GERAL TERMOMAGNÉTICO             */}
            {/* ------------------------------------------------------------- */}
            <g id="main-breaker-section" transform={`translate(${mainBreakerX}, ${mainY - 31})`}>
              {/* Disjuntor Geral Box / Symbol */}
              <rect
                x="-30"
                y="-26"
                width="60"
                height="52"
                rx="5"
                fill={colors.cardBg}
                stroke={colors.mainLines}
                strokeWidth="1.8"
              />

              {/* Breaker Schematic Symbol (Contact + Thermal element + Magnetic element) */}
              <g stroke={colors.mainLines} strokeWidth="1.5" fill="none">
                {/* Input stub */}
                <line x1="-30" y1="0" x2="-14" y2="0" />
                {/* Switch blade / contact open angle with X */}
                <line x1="-14" y1="0" x2="4" y2="-10" />
                {/* Thermal overload bimetallic symbol */}
                <path d="M 4 -10 L 10 -10 C 13 -10 13 0 10 0 L 4 0" />
                {/* Output stub */}
                <line x1="10" y1="0" x2="30" y2="0" />
                {/* Magnetic instantaneous trip cross */}
                <line x1="-6" y1="-14" x2="0" y2="-8" />
                <line x1="0" y1="-14" x2="-6" y2="-8" />
              </g>

              {/* Breaker Labels */}
              <text
                x="0"
                y="-33"
                fill={colors.textPrimary}
                fontSize="10"
                fontWeight="extrabold"
                textAnchor="middle"
              >
                DISJUNTOR GERAL
              </text>
              <text
                x="0"
                y="38"
                fill={colors.phaseR}
                fontSize="9.5"
                fontWeight="extrabold"
                textAnchor="middle"
              >
                {mainBreaker.poles}x{mainBreaker.ratingAmps}A (Curva {mainBreaker.curve || 'C'})
              </text>
              <text
                x="0"
                y="49"
                fill={colors.textMuted}
                fontSize="7.5"
                textAnchor="middle"
              >
                Icn: 5kA / NBR NM 60898
              </text>
            </g>

            {/* Line connecting Main Breaker to DPS Branch and IDR */}
            <line
              x1={mainBreakerX + 30}
              y1={mainY - 31}
              x2={dpsBranchX}
              y2={mainY - 31}
              stroke={colors.mainLines}
              strokeWidth="2.5"
            />
            {/* Node dot at DPS branch */}
            <circle cx={dpsBranchX} cy={mainY - 31} r="3.5" fill={colors.mainLines} />

            {/* ------------------------------------------------------------- */}
            {/* 3. PROTEÇÃO CONTRA SURTOS: DPS (CLASSE II)                   */}
            {/* ------------------------------------------------------------- */}
            <g id="dps-section">
              {/* Branch line dropping down to DPS */}
              <line
                x1={dpsBranchX}
                y1={mainY - 31}
                x2={dpsBranchX}
                y2={mainY + 50}
                stroke={colors.dpsSymbol}
                strokeWidth="2"
              />

              {/* DPS Box Symbol */}
              <g transform={`translate(${dpsBranchX}, ${mainY + 75})`}>
                <rect
                  x="-32"
                  y="-22"
                  width="64"
                  height="44"
                  rx="4"
                  fill={colors.cardBg}
                  stroke={colors.dpsSymbol}
                  strokeWidth="1.8"
                />
                {/* Surge arrester spark/varistor symbol inside */}
                <path
                  d="M -16 12 L 0 -12 L 16 12"
                  fill="none"
                  stroke={colors.dpsSymbol}
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <line x1="-22" y1="-12" x2="22" y2="-12" stroke={colors.dpsSymbol} strokeWidth="1.2" />

                {/* Ground lead exiting bottom of DPS */}
                <line x1="0" y1="22" x2="0" y2="42" stroke={colors.ground} strokeWidth="2" />
                {/* Ground Symbol */}
                <g transform="translate(0, 42)" stroke={colors.ground} strokeWidth="1.8">
                  <line x1="-12" y1="0" x2="12" y2="0" />
                  <line x1="-8" y1="4" x2="8" y2="4" />
                  <line x1="-4" y1="8" x2="4" y2="8" />
                </g>

                <text
                  x="0"
                  y="-28"
                  fill={colors.dpsSymbol}
                  fontSize="9.5"
                  fontWeight="extrabold"
                  textAnchor="middle"
                >
                  DPS (CLASSE II)
                </text>
                <text
                  x="0"
                  y="62"
                  fill={colors.textPrimary}
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {dpsModules.length > 0 ? `${dpsModules.length}x ` : ''}
                  20kA / 275V
                </text>
                <text
                  x="0"
                  y="73"
                  fill={colors.textSecondary}
                  fontSize="7.5"
                  textAnchor="middle"
                >
                  Imax: 45kA • Up ≤ 1,5kV
                </text>
              </g>
            </g>

            {/* Line connecting to IDR */}
            <line
              x1={dpsBranchX}
              y1={mainY - 31}
              x2={idrX - 35}
              y2={mainY - 31}
              stroke={colors.mainLines}
              strokeWidth="2.5"
            />

            {/* ------------------------------------------------------------- */}
            {/* 4. PROTEÇÃO DIFERENCIAL RESIDUAL: IDR GERAL                  */}
            {/* ------------------------------------------------------------- */}
            <g id="idr-section" transform={`translate(${idrX}, ${mainY - 31})`}>
              <rect
                x="-32"
                y="-26"
                width="64"
                height="52"
                rx="5"
                fill={colors.cardBg}
                stroke={colors.idrSymbol}
                strokeWidth="1.8"
              />

              {/* IDR Toroid Symbol & Trip Mechanism */}
              <g stroke={colors.idrSymbol} strokeWidth="1.5" fill="none">
                {/* Primary line passing through toroid */}
                <line x1="-32" y1="0" x2="32" y2="0" />
                {/* Toroidal core oval */}
                <ellipse cx="-4" cy="0" rx="9" ry="14" />
                {/* Trip coil / trigger */}
                <rect x="8" y="-7" width="14" height="14" rx="2" />
                <line x1="12" y1="-7" x2="18" y2="7" />
              </g>

              {/* Test Button Representation */}
              <circle cx="20" cy="-18" r="3" fill={colors.idrSymbol} />
              <text x="20" y="-23" fill={colors.idrSymbol} fontSize="6" fontWeight="bold" textAnchor="middle">
                T
              </text>

              <text
                x="0"
                y="-33"
                fill={colors.idrSymbol}
                fontSize="10"
                fontWeight="extrabold"
                textAnchor="middle"
              >
                IDR GERAL
              </text>
              <text
                x="0"
                y="38"
                fill={colors.idrSymbol}
                fontSize="9"
                fontWeight="extrabold"
                textAnchor="middle"
              >
                {idrModule ? `${idrModule.poles}P ${idrModule.ratingAmps}A` : `${isTri ? '4P' : '2P'} 63A`}
              </text>
              <text
                x="0"
                y="49"
                fill={colors.textPrimary}
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
              >
                ΔIn = {idrModule?.sensitivityMa || 30}mA (Tipo AC)
              </text>
              <text
                x="0"
                y="59"
                fill={colors.textMuted}
                fontSize="7"
                textAnchor="middle"
              >
                Proteção Choques (NBR 5410)
              </text>
            </g>

            {/* Line from IDR to Main Distribution Busbars */}
            <line
              x1={idrX + 32}
              y1={mainY - 31}
              x2={busbarStartX}
              y2={mainY - 31}
              stroke={colors.mainLines}
              strokeWidth="2.5"
            />
            {/* Feeder drop to busbars */}
            <line
              x1={busbarStartX}
              y1={mainY - 31}
              x2={busbarStartX}
              y2={busbarR_Y}
              stroke={colors.mainLines}
              strokeWidth="2.5"
            />

            {/* ------------------------------------------------------------- */}
            {/* 5. BARRAMENTOS PRINCIPAIS DE DISTRIBUIÇÃO                    */}
            {/* ------------------------------------------------------------- */}
            <g id="busbar-section">
              {/* Busbar R (Fase R) */}
              <line
                x1={busbarStartX}
                y1={busbarR_Y}
                x2={busbarEndX}
                y2={busbarR_Y}
                stroke={colors.phaseR}
                strokeWidth="4"
                strokeLinecap="round"
              />
              <text
                x={busbarStartX - 8}
                y={busbarR_Y + 3.5}
                fill={colors.phaseR}
                fontSize="9"
                fontWeight="bold"
                textAnchor="end"
              >
                BARRAMENTO FASE R
              </text>

              {/* Busbar S (Fase S) if Bi or Tri */}
              {(isBi || isTri) && (
                <>
                  <line
                    x1={busbarStartX}
                    y1={busbarS_Y}
                    x2={busbarEndX}
                    y2={busbarS_Y}
                    stroke={colors.phaseS}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <text
                    x={busbarStartX - 8}
                    y={busbarS_Y + 3.5}
                    fill={colors.phaseS}
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="end"
                  >
                    BARRAMENTO FASE S
                  </text>
                </>
              )}

              {/* Busbar T (Fase T) if Tri */}
              {isTri && (
                <>
                  <line
                    x1={busbarStartX}
                    y1={busbarT_Y}
                    x2={busbarEndX}
                    y2={busbarT_Y}
                    stroke={colors.phaseT}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <text
                    x={busbarStartX - 8}
                    y={busbarT_Y + 3.5}
                    fill={colors.phaseT}
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="end"
                  >
                    BARRAMENTO FASE T
                  </text>
                </>
              )}

              {/* Neutral Busbar (N) */}
              <line
                x1={busbarStartX}
                y1={busbarN_Y}
                x2={busbarEndX}
                y2={busbarN_Y}
                stroke={colors.neutral}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <text
                x={busbarStartX - 8}
                y={busbarN_Y + 3.5}
                fill={colors.neutral}
                fontSize="9"
                fontWeight="bold"
                textAnchor="end"
              >
                BARRAMENTO NEUTRO (N)
              </text>

              {/* Ground Busbar (PE) */}
              <line
                x1={busbarStartX}
                y1={busbarPE_Y}
                x2={busbarEndX}
                y2={busbarPE_Y}
                stroke={colors.ground}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <text
                x={busbarStartX - 8}
                y={busbarPE_Y + 3.5}
                fill={colors.ground}
                fontSize="9"
                fontWeight="bold"
                textAnchor="end"
              >
                BARRAMENTO TERRA (PE)
              </text>

              {/* Grounding electrode symbol at the end of PE busbar */}
              <g transform={`translate(${busbarEndX + 15}, ${busbarPE_Y})`} stroke={colors.ground} strokeWidth="1.8">
                <line x1="-15" y1="0" x2="0" y2="0" />
                <line x1="0" y1="-8" x2="0" y2="8" />
                <line x1="4" y1="-5" x2="4" y2="5" />
                <line x1="8" y1="-2" x2="8" y2="2" />
                <text x="14" y="3" fill={colors.ground} fontSize="8" fontWeight="bold" stroke="none">
                  ELETRODO PE
                </text>
              </g>
            </g>

            {/* ------------------------------------------------------------- */}
            {/* 6. CIRCUITOS TERMINAIS DERIVADOS (COLUNAS INDIVIDUAIS)        */}
            {/* ------------------------------------------------------------- */}
            <g id="circuits-section">
              {circuits.map((ckt, idx) => {
                const colX = busbarStartX + 30 + idx * circuitColWidth;
                const current = calculateCircuitCurrent(ckt);

                // Determine tap level from busbars depending on phase
                let tapY = busbarR_Y;
                let tapColor = colors.phaseR;
                if (ckt.phases === 'S') {
                  tapY = busbarS_Y;
                  tapColor = colors.phaseS;
                } else if (ckt.phases === 'T') {
                  tapY = busbarT_Y;
                  tapColor = colors.phaseT;
                } else if (ckt.phases === 'RS') {
                  tapY = busbarS_Y;
                  tapColor = colors.phaseS;
                } else if (ckt.phases === 'ST') {
                  tapY = busbarT_Y;
                  tapColor = colors.phaseT;
                } else if (ckt.phases === 'RST') {
                  tapY = busbarT_Y;
                  tapColor = colors.phaseT;
                }

                // Vertical positions along the circuit branch line
                const branchStartY = tapY;
                const breakerCenterY = mainY + 125;
                const conductorMarksY = mainY + 235;
                const circuitBoxY = mainY + 330;

                // Color header badge based on load type
                const typeHeader =
                  ckt.circuitType === 'lighting'
                    ? { bg: '#eab308', text: '#000000', label: 'ILUMINAÇÃO' }
                    : ckt.circuitType === 'tue'
                    ? { bg: '#f97316', text: '#ffffff', label: 'TUE ESPECÍFICA' }
                    : { bg: '#3b82f6', text: '#ffffff', label: 'TOMADAS (TUG)' };

                return (
                  <g key={ckt.id} id={`circuit-col-${ckt.circuitNumber || idx + 1}`}>
                    {/* Busbar Tap Connection Dot */}
                    <circle cx={colX} cy={branchStartY} r="4.5" fill={tapColor} />

                    {/* Additional tap dots for 2P or 3P breakers */}
                    {ckt.poles >= 2 && (
                      <circle cx={colX} cy={busbarR_Y} r="4" fill={colors.phaseR} />
                    )}
                    {ckt.poles >= 3 && (
                      <circle cx={colX} cy={busbarS_Y} r="4" fill={colors.phaseS} />
                    )}

                    {/* Circuit Branch Vertical Line */}
                    <line
                      x1={colX}
                      y1={branchStartY}
                      x2={colX}
                      y2={breakerCenterY - 24}
                      stroke={tapColor}
                      strokeWidth="2.2"
                    />

                    {/* Breaker symbol to circuit box */}
                    <line
                      x1={colX}
                      y1={breakerCenterY + 24}
                      x2={colX}
                      y2={circuitBoxY}
                      stroke={colors.mainLines}
                      strokeWidth="2"
                    />

                    {/* Phase indicator pill at tap */}
                    <g transform={`translate(${colX}, ${mainY + 58})`}>
                      <rect
                        x="-20"
                        y="-8"
                        width="40"
                        height="16"
                        rx="3"
                        fill={colors.cardBg}
                        stroke={tapColor}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="4"
                        fill={tapColor}
                        fontSize="8.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {ckt.phases}
                      </text>
                    </g>

                    {/* Disjuntor Termomagnético Symbol */}
                    <g transform={`translate(${colX}, ${breakerCenterY})`}>
                      {/* Breaker body rectangle */}
                      <rect
                        x="-22"
                        y="-22"
                        width="44"
                        height="44"
                        rx="4"
                        fill={colors.cardBg}
                        stroke={colors.mainLines}
                        strokeWidth="1.5"
                      />

                      {/* Schematic breaker switch contacts and trip representation */}
                      <g stroke={colors.mainLines} strokeWidth="1.4" fill="none">
                        <line x1="0" y1="-22" x2="0" y2="-12" />
                        <line x1="0" y1="-12" x2="8" y2="4" />
                        <path d="M 8 4 L 8 12 L 0 12" />
                        <line x1="0" y1="12" x2="0" y2="22" />
                        {/* Thermal and magnetic trip markers */}
                        <line x1="-7" y1="-4" x2="-1" y2="2" />
                        <line x1="-1" y1="-4" x2="-7" y2="2" />
                      </g>

                      {/* Breaker Rating Label */}
                      <text
                        x="27"
                        y="-4"
                        fill={colors.textPrimary}
                        fontSize="9.5"
                        fontWeight="extrabold"
                      >
                        {ckt.ratingAmps}A
                      </text>
                      <text
                        x="27"
                        y="7"
                        fill={colors.textSecondary}
                        fontSize="7.5"
                        fontWeight="bold"
                      >
                        Curva {ckt.curve || 'C'}
                      </text>
                      <text
                        x="27"
                        y="17"
                        fill={colors.textMuted}
                        fontSize="7"
                      >
                        {ckt.poles}P
                      </text>

                      {/* DR Protected Badge */}
                      {ckt.drProtected && (
                        <g transform="translate(-20, -32)">
                          <rect
                            x="-2"
                            y="0"
                            width="44"
                            height="12"
                            rx="2"
                            fill={colors.idrSymbol}
                          />
                          <text
                            x="20"
                            y="9"
                            fill="#ffffff"
                            fontSize="7"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            DR 30mA
                          </text>
                        </g>
                      )}
                    </g>

                    {/* ------------------------------------------------------- */}
                    {/* SIMBOLOGIA NORMALIZADA DE CONDUTORES (NBR 5444)        */}
                    {/* ------------------------------------------------------- */}
                    <g transform={`translate(${colX}, ${conductorMarksY})`}>
                      {/* Phase conductors: vertical/transversal cuts through line */}
                      <line x1="-7" y1="-12" x2="-1" y2="12" stroke={colors.mainLines} strokeWidth="2" />
                      {ckt.poles >= 2 && (
                        <line x1="-2" y1="-12" x2="4" y2="12" stroke={colors.mainLines} strokeWidth="2" />
                      )}
                      {ckt.poles >= 3 && (
                        <line x1="3" y1="-12" x2="9" y2="12" stroke={colors.mainLines} strokeWidth="2" />
                      )}

                      {/* Neutral conductor (traço com gancho superior) if circuit uses neutral */}
                      {ckt.poles < 3 && (
                        <g transform="translate(14, 0)">
                          <line x1="0" y1="-12" x2="0" y2="0" stroke={colors.neutral} strokeWidth="2" />
                          <circle cx="0" cy="-12" r="2.5" fill={colors.neutral} />
                        </g>
                      )}

                      {/* Ground conductor (traço com T/cruzeta invertida) */}
                      <g transform={`translate(${ckt.poles < 3 ? 24 : 14}, 0)`}>
                        <line x1="0" y1="-12" x2="0" y2="0" stroke={colors.ground} strokeWidth="2" />
                        <line x1="-4" y1="-12" x2="4" y2="-12" stroke={colors.ground} strokeWidth="2" />
                      </g>

                      {/* Wire gauge specification text */}
                      <text
                        x="-10"
                        y="23"
                        fill={colors.textPrimary}
                        fontSize="8.5"
                        fontWeight="extrabold"
                        textAnchor="end"
                      >
                        #{ckt.wireGaugeMm2} mm²
                      </text>
                      <text
                        x="-10"
                        y="34"
                        fill={colors.textSecondary}
                        fontSize="7.5"
                        textAnchor="end"
                      >
                        {ckt.poles === 1 ? 'F+N+PE' : ckt.poles === 2 ? '2F+PE' : '3F+N+PE'}
                      </text>
                      <text
                        x="-10"
                        y="44"
                        fill={colors.textMuted}
                        fontSize="7"
                        textAnchor="end"
                      >
                        Ø {ckt.wireGaugeMm2 >= 4 ? '25mm' : '20mm'}
                      </text>
                    </g>

                    {/* ------------------------------------------------------- */}
                    {/* CAIXA TÉCNICA DE DADOS DO CIRCUITO (RODAPÉ DO RAMAL)    */}
                    {/* ------------------------------------------------------- */}
                    <g transform={`translate(${colX - 58}, ${circuitBoxY})`}>
                      {/* Box Background */}
                      <rect
                        x="0"
                        y="0"
                        width="116"
                        height="260"
                        rx="5"
                        fill={colors.cardBg}
                        stroke={colors.cardBorder}
                        strokeWidth="1.2"
                      />

                      {/* Header Badge with Circuit Number */}
                      <path
                        d="M 0 5 C 0 2 2 0 5 0 L 111 0 C 114 0 116 2 116 5 L 116 26 L 0 26 Z"
                        fill={typeHeader.bg}
                      />
                      <text
                        x="58"
                        y="18"
                        fill={typeHeader.text}
                        fontSize="11"
                        fontWeight="900"
                        textAnchor="middle"
                        letterSpacing="0.5"
                      >
                        C{ckt.circuitNumber || idx + 1}
                      </text>

                      {/* Circuit Type Sub-header */}
                      <rect x="0" y="26" width="116" height="15" fill={isDark ? '#08101e' : '#f1f5f9'} />
                      <text
                        x="58"
                        y="37"
                        fill={colors.textSecondary}
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {typeHeader.label}
                      </text>

                      {/* Circuit Name */}
                      <text
                        x="58"
                        y="58"
                        fill={colors.textPrimary}
                        fontSize="9.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {ckt.name.length > 15 ? ckt.name.slice(0, 15) + '...' : ckt.name}
                      </text>
                      {ckt.room && (
                        <text
                          x="58"
                          y="71"
                          fill={colors.textSecondary}
                          fontSize="8"
                          textAnchor="middle"
                        >
                          {ckt.room}
                        </text>
                      )}

                      {/* Divider */}
                      <line x1="8" y1="80" x2="108" y2="80" stroke={colors.cardBorder} strokeWidth="1" />

                      {/* Electrical Specs Table inside Box */}
                      <g fontSize="8" transform="translate(10, 96)">
                        <text fill={colors.textMuted}>Potência:</text>
                        <text x="96" fill={colors.textPrimary} fontWeight="bold" textAnchor="end">
                          {ckt.powerWatts} W
                        </text>

                        <text y="17" fill={colors.textMuted}>Tensão:</text>
                        <text x="96" y="17" fill={colors.textPrimary} fontWeight="bold" textAnchor="end">
                          {ckt.voltage} V
                        </text>

                        <text y="34" fill={colors.textMuted}>Corrente (Ib):</text>
                        <text x="96" y="34" fill={colors.phaseR} fontWeight="bold" textAnchor="end">
                          {current} A
                        </text>

                        <text y="51" fill={colors.textMuted}>Fase(s):</text>
                        <text x="96" y="51" fill={colors.textPrimary} fontWeight="bold" textAnchor="end">
                          {ckt.phases}
                        </text>

                        <text y="68" fill={colors.textMuted}>Disjuntor:</text>
                        <text x="96" y="68" fill={colors.textPrimary} fontWeight="bold" textAnchor="end">
                          {ckt.ratingAmps}A ({ckt.curve || 'C'})
                        </text>

                        <text y="85" fill={colors.textMuted}>Condutor:</text>
                        <text x="96" y="85" fill={colors.textPrimary} fontWeight="bold" textAnchor="end">
                          {ckt.wireGaugeMm2} mm²
                        </text>

                        <text y="102" fill={colors.textMuted}>Eletroduto:</text>
                        <text x="96" y="102" fill={colors.textSecondary} textAnchor="end">
                          Ø {ckt.wireGaugeMm2 >= 4 ? '25mm' : '20mm'}
                        </text>
                      </g>

                      {/* Status NBR Badge at bottom of box */}
                      <rect
                        x="10"
                        y="226"
                        width="96"
                        height="20"
                        rx="3"
                        fill={isDark ? '#052e16' : '#ecfdf5'}
                        stroke={isDark ? '#166534' : '#a7f3d0'}
                        strokeWidth="1"
                      />
                      <text
                        x="58"
                        y="240"
                        fill={isDark ? '#4ade80' : '#059669'}
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        ✓ CONFORME NBR 5410
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* ------------------------------------------------------------- */}
              {/* 7. ESPAÇOS RESERVAS RECOMENDADOS (NBR 5410 ITEM 6.5.4.7)      */}
              {/* ------------------------------------------------------------- */}
              {showReserves &&
                Array.from({ length: reserveCount }).map((_, rIdx) => {
                  const colX = busbarStartX + 30 + (circuits.length + rIdx) * circuitColWidth;
                  const breakerCenterY = mainY + 125;
                  const circuitBoxY = mainY + 330;

                  return (
                    <g key={`reserve-${rIdx}`} id={`circuit-reserve-${rIdx + 1}`} opacity="0.75">
                      {/* Connection to busbar dashed */}
                      <circle cx={colX} cy={busbarR_Y} r="3.5" fill={colors.textMuted} />
                      <line
                        x1={colX}
                        y1={busbarR_Y}
                        x2={colX}
                        y2={breakerCenterY - 24}
                        stroke={colors.textMuted}
                        strokeWidth="1.8"
                        strokeDasharray="4 4"
                      />
                      <line
                        x1={colX}
                        y1={breakerCenterY + 24}
                        x2={colX}
                        y2={circuitBoxY}
                        stroke={colors.textMuted}
                        strokeWidth="1.8"
                        strokeDasharray="4 4"
                      />

                      {/* Breaker symbol dashed */}
                      <g transform={`translate(${colX}, ${breakerCenterY})`}>
                        <rect
                          x="-22"
                          y="-22"
                          width="44"
                          height="44"
                          rx="4"
                          fill={colors.cardBg}
                          stroke={colors.textMuted}
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                        />
                        <line x1="0" y1="-22" x2="0" y2="22" stroke={colors.textMuted} strokeWidth="1.2" strokeDasharray="2 2" />
                        <text
                          x="27"
                          y="4"
                          fill={colors.textMuted}
                          fontSize="9"
                          fontWeight="bold"
                        >
                          20A Res.
                        </text>
                      </g>

                      {/* Reserve Box */}
                      <g transform={`translate(${colX - 58}, ${circuitBoxY})`}>
                        <rect
                          x="0"
                          y="0"
                          width="116"
                          height="260"
                          rx="5"
                          fill={colors.cardBg}
                          stroke={colors.textMuted}
                          strokeWidth="1.2"
                          strokeDasharray="4 4"
                        />
                        <rect x="0" y="0" width="116" height="26" fill={colors.cardBorder} rx="4" />
                        <text
                          x="58"
                          y="18"
                          fill={colors.textPrimary}
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          RESERVA {rIdx + 1}
                        </text>

                        <text
                          x="58"
                          y="50"
                          fill={colors.textSecondary}
                          fontSize="8.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          ESPAÇO RESERVA
                        </text>
                        <text
                          x="58"
                          y="65"
                          fill={colors.textMuted}
                          fontSize="7.5"
                          textAnchor="middle"
                        >
                          NBR 5410 item 6.5.4.7
                        </text>

                        <line x1="12" y1="80" x2="104" y2="80" stroke={colors.cardBorder} strokeWidth="1" strokeDasharray="2 2" />

                        <text
                          x="58"
                          y="120"
                          fill={colors.textMuted}
                          fontSize="8"
                          textAnchor="middle"
                        >
                          Disponível para
                        </text>
                        <text
                          x="58"
                          y="135"
                          fill={colors.textMuted}
                          fontSize="8"
                          textAnchor="middle"
                        >
                          futuras expansões
                        </text>
                        <text
                          x="58"
                          y="150"
                          fill={colors.textMuted}
                          fontSize="8"
                          textAnchor="middle"
                        >
                          de cargas
                        </text>

                        <rect
                          x="12"
                          y="226"
                          width="92"
                          height="20"
                          rx="3"
                          fill="none"
                          stroke={colors.textMuted}
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                        <text
                          x="58"
                          y="240"
                          fill={colors.textMuted}
                          fontSize="7.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          RESERVA LIVRE
                        </text>
                      </g>
                    </g>
                  );
                })}
            </g>

            {/* ------------------------------------------------------------- */}
            {/* 8. LEGENDA DE SIMBOLOGIA UNIFILAR (CANTO INFERIOR ESQUERDO)  */}
            {/* ------------------------------------------------------------- */}
            {showLegend && (
              <g transform={`translate(${innerMargin + 10}, ${bottomSectionY})`}>
                <rect
                  x="0"
                  y="0"
                  width="480"
                  height="160"
                  rx="4"
                  fill={colors.cardBg}
                  stroke={colors.cardBorder}
                  strokeWidth="1.2"
                />
                <rect x="0" y="0" width="480" height="24" fill={isDark ? '#0f1c33' : '#f1f5f9'} rx="3" />
                <text
                  x="12"
                  y="16"
                  fill={colors.textPrimary}
                  fontSize="10"
                  fontWeight="bold"
                >
                  CONVENÇÕES E SIMBOLOGIA UNIFILAR (ABNT NBR 5444 / IEC 60617)
                </text>

                {/* Symbols Grid */}
                <g transform="translate(15, 34)" fontSize="8">
                  {/* Row 1: Breaker */}
                  <g transform="translate(0, 10)">
                    <rect x="0" y="-8" width="16" height="16" fill="none" stroke={colors.mainLines} strokeWidth="1.2" />
                    <line x1="0" y1="-8" x2="16" y2="8" stroke={colors.mainLines} strokeWidth="1.2" />
                    <text x="24" y="4" fill={colors.textPrimary} fontWeight="bold">Disjuntor Termomagnético (DJ)</text>
                  </g>

                  {/* Row 1 Col 2: DPS */}
                  <g transform="translate(240, 10)">
                    <rect x="0" y="-8" width="16" height="16" fill="none" stroke={colors.dpsSymbol} strokeWidth="1.2" />
                    <path d="M 3 5 L 8 -5 L 13 5" fill="none" stroke={colors.dpsSymbol} strokeWidth="1.2" />
                    <text x="24" y="4" fill={colors.textPrimary} fontWeight="bold">DPS (Proteção contra Surtos)</text>
                  </g>

                  {/* Row 2: IDR */}
                  <g transform="translate(0, 36)">
                    <rect x="0" y="-8" width="16" height="16" fill="none" stroke={colors.idrSymbol} strokeWidth="1.2" />
                    <ellipse cx="8" cy="0" rx="4" ry="6" fill="none" stroke={colors.idrSymbol} strokeWidth="1.2" />
                    <text x="24" y="4" fill={colors.textPrimary} fontWeight="bold">IDR (Interruptor Diferencial Residual)</text>
                  </g>

                  {/* Row 2 Col 2: Phase Conductor */}
                  <g transform="translate(240, 36)">
                    <line x1="0" y1="0" x2="16" y2="0" stroke={colors.mainLines} strokeWidth="1.2" />
                    <line x1="8" y1="-7" x2="8" y2="7" stroke={colors.mainLines} strokeWidth="1.8" />
                    <text x="24" y="4" fill={colors.textPrimary} fontWeight="bold">Condutor Fase (R, S ou T)</text>
                  </g>

                  {/* Row 3: Neutral Conductor */}
                  <g transform="translate(0, 62)">
                    <line x1="0" y1="0" x2="16" y2="0" stroke={colors.neutral} strokeWidth="1.2" />
                    <line x1="8" y1="-7" x2="8" y2="0" stroke={colors.neutral} strokeWidth="1.8" />
                    <circle cx="8" cy="-7" r="2" fill={colors.neutral} />
                    <text x="24" y="4" fill={colors.textPrimary} fontWeight="bold">Condutor Neutro (N) - Azul Claro</text>
                  </g>

                  {/* Row 3 Col 2: Ground Conductor */}
                  <g transform="translate(240, 62)">
                    <line x1="0" y1="0" x2="16" y2="0" stroke={colors.ground} strokeWidth="1.2" />
                    <line x1="8" y1="-7" x2="8" y2="0" stroke={colors.ground} strokeWidth="1.8" />
                    <line x1="4" y1="-7" x2="12" y2="-7" stroke={colors.ground} strokeWidth="1.8" />
                    <text x="24" y="4" fill={colors.textPrimary} fontWeight="bold">Condutor Terra (PE) - Verde/Amarelo</text>
                  </g>

                  {/* Row 4: Ground Electrode */}
                  <g transform="translate(0, 88)">
                    <line x1="8" y1="-6" x2="8" y2="6" stroke={colors.ground} strokeWidth="1.5" />
                    <line x1="2" y1="6" x2="14" y2="6" stroke={colors.ground} strokeWidth="1.5" />
                    <line x1="4" y1="9" x2="12" y2="9" stroke={colors.ground} strokeWidth="1.5" />
                    <text x="24" y="4" fill={colors.textPrimary} fontWeight="bold">Eletrodo / Malha de Aterramento</text>
                  </g>

                  {/* Row 4 Col 2: Busbar */}
                  <g transform="translate(240, 88)">
                    <line x1="0" y1="0" x2="16" y2="0" stroke={colors.phaseR} strokeWidth="3.5" />
                    <text x="24" y="4" fill={colors.textPrimary} fontWeight="bold">Barramento de Cobre Eletrolítico</text>
                  </g>
                </g>
              </g>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 9. NOTAS TÉCNICAS DE PROJETO (CENTRO INFERIOR)                */}
            {/* ------------------------------------------------------------- */}
            {showNotes && (
              <g transform={`translate(${innerMargin + 505}, ${bottomSectionY})`}>
                <rect
                  x="0"
                  y="0"
                  width="470"
                  height="160"
                  rx="4"
                  fill={colors.cardBg}
                  stroke={colors.cardBorder}
                  strokeWidth="1.2"
                />
                <rect x="0" y="0" width="470" height="24" fill={isDark ? '#0f1c33' : '#f1f5f9'} rx="3" />
                <text
                  x="12"
                  y="16"
                  fill={colors.textPrimary}
                  fontSize="10"
                  fontWeight="bold"
                >
                  NOTAS TÉCNICAS E CRITÉRIOS DE PROJETO (NBR 5410)
                </text>

                <g transform="translate(12, 34)" fontSize="7.5" fill={colors.textSecondary}>
                  <text y="8">
                    1. Condutores de cobre eletrolítico têmpera mole, isolação PVC 70°C, 450/750V, antichama (BWF).
                  </text>
                  <text y="24">
                    2. Cores da fiação (NBR 5410): Neutro = Azul Claro, PE = Verde/Amarelo, Fases = Preto / Vermelho / Branco.
                  </text>
                  <text y="40">
                    3. Todos os circuitos de tomadas de áreas molhadas protegidos por IDR 30mA (NBR 5410 item 5.1.3.2.2).
                  </text>
                  <text y="56">
                    4. Disjuntores termomagnéticos padrão DIN curva C, capacidade de interrupção Icn ≥ 5kA (NBR NM 60898).
                  </text>
                  <text y="72">
                    5. DPS Classe II para proteção contra sobretensões transitórias de origem atmosférica (NBR 5410 item 5.4).
                  </text>
                  <text y="88">
                    6. Queda de tensão máxima admissível do alimentador + circuito terminal ≤ 4% (NBR 5410 item 6.2.7).
                  </text>
                  <text y="104">
                    7. Reserva física e de capacidade no quadro prevista conforme ABNT NBR 5410 tabela 59 (item 6.5.4.7).
                  </text>
                </g>
              </g>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 10. SELO TÉCNICO / CARIMBO ABNT (CANTO INFERIOR DIREITO)      */}
            {/* ------------------------------------------------------------- */}
            <g transform={`translate(${diagramWidth - innerMargin - 490}, ${bottomSectionY})`}>
              {/* Outer Carimbo Box */}
              <rect
                x="0"
                y="0"
                width="480"
                height="160"
                rx="4"
                fill={colors.cardBg}
                stroke={colors.mainLines}
                strokeWidth="1.8"
              />

              {/* Title Section */}
              <rect x="0" y="0" width="480" height="34" fill={isDark ? '#0f1c33' : '#f1f5f9'} rx="3" />
              <text
                x="15"
                y="16"
                fill={colors.phaseR}
                fontSize="8.5"
                fontWeight="900"
                letterSpacing="1"
              >
                DIAGRAMA UNIFILAR ESQUEMÁTICO
              </text>
              <text
                x="15"
                y="28"
                fill={colors.textPrimary}
                fontSize="11"
                fontWeight="extrabold"
              >
                {config.title.toUpperCase()}
              </text>

              {/* Grid Lines */}
              <line x1="0" y1="34" x2="480" y2="34" stroke={colors.mainLines} strokeWidth="1.2" />
              <line x1="0" y1="84" x2="480" y2="84" stroke={colors.cardBorder} strokeWidth="1" />
              <line x1="0" y1="126" x2="480" y2="126" stroke={colors.cardBorder} strokeWidth="1" />

              <line x1="240" y1="34" x2="240" y2="126" stroke={colors.cardBorder} strokeWidth="1" />
              <line x1="360" y1="126" x2="360" y2="160" stroke={colors.cardBorder} strokeWidth="1" />

              {/* Middle Left: Electrical System Data */}
              <g transform="translate(12, 48)" fontSize="8">
                <text fill={colors.textMuted}>SISTEMA DE ALIMENTAÇÃO:</text>
                <text y="14" fill={colors.textPrimary} fontWeight="bold">
                  {config.supplyType.toUpperCase()} ({config.voltageSystem.replace('_', '/') + 'V'}) — 60 Hz
                </text>
                <text y="26" fill={colors.textMuted}>ESQUEMA DE ATERRAMENTO:</text>
                <text y="26" x="125" fill={colors.ground} fontWeight="bold">
                  {config.groundingSystem || 'TN-S'}
                </text>
              </g>

              {/* Middle Right: Power and Demands */}
              <g transform="translate(252, 48)" fontSize="8">
                <text fill={colors.textMuted}>POTÊNCIA INSTALADA TOTAL:</text>
                <text x="140" fill={colors.textPrimary} fontWeight="bold">
                  {(totalWatts / 1000).toFixed(2)} kW ({totalWatts} W)
                </text>

                <text y="14" fill={colors.textMuted}>DEMANDA ESTIMADA (F.D. 0.75):</text>
                <text y="14" x="140" fill={colors.textPrimary} fontWeight="bold">
                  {(estimatedDemandWatts / 1000).toFixed(2)} kVA
                </text>

                <text y="26" fill={colors.textMuted}>PROTEÇÃO GERAL:</text>
                <text y="26" x="140" fill={colors.phaseR} fontWeight="bold">
                  {mainBreaker.poles}P {mainBreaker.ratingAmps}A (Curva {mainBreaker.curve || 'C'})
                </text>
              </g>

              {/* Lower Section: Revision, Date, Sheet */}
              <g transform="translate(12, 138)" fontSize="8">
                <text fill={colors.textMuted}>NORMA APLICADA:</text>
                <text x="95" fill={colors.textPrimary} fontWeight="bold">
                  ABNT NBR 5410:2004 / NBR 5444
                </text>
                <text y="14" fill={colors.textMuted}>DATA DE EMISSÃO:</text>
                <text y="14" x="95" fill={colors.textPrimary} fontWeight="bold">
                  {new Date().toLocaleDateString('pt-BR')}
                </text>
              </g>

              <g transform="translate(372, 138)" fontSize="8">
                <text fill={colors.textMuted}>ESCALA:</text>
                <text x="50" fill={colors.textPrimary} fontWeight="bold">
                  S/ ESCALA
                </text>
                <text y="14" fill={colors.textMuted}>FOLHA:</text>
                <text y="14" x="50" fill={colors.phaseR} fontWeight="bold">
                  01 / 01
                </text>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
