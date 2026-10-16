import React, { useState } from 'react';
import {
  ClipboardCheck,
  Copy,
  Download,
  Printer,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { PanelConfig } from '../types/panel';
import { generateBillOfMaterials } from '../utils/electrical';

interface BomAndLabelsViewProps {
  config: PanelConfig;
  onExportJson: () => void;
  onExportSvg: () => void;
}

export const BomAndLabelsView: React.FC<BomAndLabelsViewProps> = ({
  config,
  onExportJson,
  onExportSvg,
}) => {
  const [copied, setCopied] = useState(false);
  const bomItems = generateBillOfMaterials(config);
  const circuits = config.modules
    .filter((m) => m.category === 'breaker')
    .sort((a, b) => (a.circuitNumber || 99) - (b.circuitNumber || 99));

  const handleCopyBom = () => {
    const lines = [
      `LISTA DE MATERIAIS — ${config.title}`,
      `Sistema: ${config.supplyType.toUpperCase()} (${config.voltageSystem.replace('_', '/') + 'V'})`,
      '------------------------------------------------------------',
      ...bomItems.map(
        (item) => `- [${item.quantity} ${item.unit}] ${item.item} (${item.specification})`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-8 print:bg-white print:text-black print:p-0">
      {/* Top Action Bar (hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-100">
              Lista de Compras (BOM) & Etiquetas para Impressão
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Aterramento: {config.groundingSystem || 'TN-S'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Exporte a lista completa de materiais para orçamento ou imprima as etiquetas padrão DIN (17,5mm por módulo) e legenda da porta do QDC.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyBom}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            {copied ? (
              <>
                <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                Lista Copiada!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar Lista (Texto/WhatsApp)
              </>
            )}
          </button>
          <button
            onClick={onExportSvg}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            <Download className="w-4 h-4" />
            Baixar Diagrama (.SVG)
          </button>
          <button
            onClick={onExportJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            <Download className="w-4 h-4" />
            Salvar Projeto (.JSON)
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
          >
            <Printer className="w-4 h-4" />
            Imprimir Etiquetas & BOM
          </button>
        </div>
      </div>

      {/* Section 1: Bill of Materials Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4 print:bg-white print:border-slate-300">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-100 print:text-black">
          <ShoppingBag className="w-4 h-4 text-amber-400 print:text-black" />
          1. Lista Quantitativa de Materiais (Bill of Materials)
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] print:border-slate-300 print:text-slate-700">
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3">Material / Componente</th>
                <th className="py-2.5 px-3">Especificação Técnica</th>
                <th className="py-2.5 px-3 text-right">Qtd.</th>
                <th className="py-2.5 px-3">Unid.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 print:divide-slate-200">
              {bomItems.map((item, i) => (
                <tr key={i} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 text-slate-400 print:text-slate-600">
                    {item.category}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-100 print:text-black">
                    {item.item}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 print:text-slate-700">
                    {item.specification}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400 print:text-black">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 print:text-slate-600">
                    {item.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Printable DIN Sticker Strips (Cartela de Etiquetas p/ Espelho do QDC) */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4 print:bg-white print:border-slate-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100 print:text-black">
            <Tag className="w-4 h-4 text-sky-400 print:text-black" />
            2. Cartela de Etiquetas para Espelho do QDC (Recortar e Colar)
          </div>
          <span className="text-[11px] text-slate-400 print:text-slate-600">
            Proporção Módulo DIN (1P / 2P / 3P)
          </span>
        </div>

        <div className="flex flex-wrap gap-2 p-4 bg-white rounded-lg border-2 border-dashed border-slate-400 text-slate-900">
          {config.modules.map((m, idx) => {
            const widthPx = m.poles * 66;
            const headerColor =
              m.category === 'main_breaker'
                ? 'bg-red-600 text-white'
                : m.category === 'idr'
                ? 'bg-sky-600 text-white'
                : m.category === 'dps'
                ? 'bg-rose-600 text-white'
                : m.circuitType === 'lighting'
                ? 'bg-amber-400 text-slate-950'
                : m.circuitType === 'tue'
                ? 'bg-orange-500 text-white'
                : 'bg-blue-600 text-white';

            return (
              <div
                key={m.id}
                style={{ width: `${widthPx}px` }}
                className="border-2 border-slate-900 rounded overflow-hidden flex flex-col justify-between text-center bg-white shadow-sm"
              >
                <div className={`py-0.5 px-1 text-[10px] font-extrabold uppercase ${headerColor}`}>
                  {m.category === 'dps'
                    ? `DPS • ${m.dpsKa || 20}kA`
                    : m.category === 'idr'
                    ? `IDR • ${m.ratingAmps}A`
                    : m.circuitNumber
                    ? `C${m.circuitNumber} • ${m.ratingAmps}A`
                    : `${m.ratingAmps}A`}
                </div>
                <div className="p-1.5 flex-1 flex flex-col justify-center items-center">
                  <div className="text-[10px] font-bold leading-tight text-slate-950 line-clamp-2">
                    {m.name}
                  </div>
                  {m.room && (
                    <div className="text-[8.5px] text-slate-600 mt-0.5 truncate max-w-full">
                      {m.room}
                    </div>
                  )}
                </div>
                <div className="bg-slate-100 border-t border-slate-300 py-0.5 text-[8.5px] font-mono font-bold text-slate-800">
                  {m.category === 'dps'
                    ? `${m.dpsVoltage || 275}V • ${m.phases === 'N' ? 'Neutro' : 'Fase ' + m.phases} • Cl. II`
                    : m.category === 'idr'
                    ? `${m.voltage}V • ΔI ${m.sensitivityMa || 30}mA • ${m.poles}P`
                    : `${m.voltage}V • ${m.phases} • ${m.wireGaugeMm2}mm²`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Panel Door Directory Sheet (Legenda da Porta do Quadro) */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4 print:bg-white print:border-slate-300">
        <div className="text-sm font-bold text-slate-100 print:text-black">
          3. Legenda de Identificação da Porta Interna do QDC (NBR 5410 Item 6.5.4.9)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {circuits.map((c, idx) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-2.5 rounded border border-slate-800 bg-slate-950 print:bg-white print:border-slate-300 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-7 rounded bg-amber-500 text-slate-950 font-mono font-extrabold flex items-center justify-center">
                  C{c.circuitNumber || idx + 1}
                </span>
                <div>
                  <div className="font-bold text-slate-100 print:text-black">{c.name}</div>
                  <div className="text-[11px] text-slate-400 print:text-slate-600">
                    Local: {c.room || 'Geral'} • {c.powerWatts}W ({c.voltage}V)
                  </div>
                </div>
              </div>
              <div className="text-right font-mono text-[11px] text-slate-300 print:text-black">
                <div>
                  Disj: <strong>{c.curve || 'C'}{c.ratingAmps}A ({c.poles}P)</strong>
                </div>
                <div>
                  Cabo: <strong>{c.wireGaugeMm2} mm² ({c.phases})</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
