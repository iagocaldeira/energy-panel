import type { jsPDF } from 'jspdf';

export interface ExportPdfOptions {
  format?: 'a3' | 'a4';
  orientation?: 'landscape' | 'portrait';
}

/**
 * Downloads the given SVG element as an .svg vector file.
 */
export function downloadSvg(svgElement: SVGSVGElement, fileName: string): void {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  // Ensure standard namespaces exist
  if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!source.match(/^<svg[^>]+xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/)) {
    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }

  const fullSvg = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\r\n' + source;
  const blob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.svg') ? fileName : `${fileName}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads the given SVG element as a crisp, technical engineering PDF document.
 * Tries direct vector svg2pdf first, and seamlessly falls back to high-DPI canvas if needed.
 */
export async function downloadPdfFromSvg(
  svgElement: SVGSVGElement,
  fileName: string,
  options?: ExportPdfOptions
): Promise<void> {
  const format = options?.format || 'a3';
  const orientation = options?.orientation || 'landscape';

  const [{ jsPDF }, { svg2pdf }] = await Promise.all([
    import('jspdf'),
    import('svg2pdf.js'),
  ]);

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;

  // Clone SVG node to prevent side-effects on live DOM
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

  try {
    await svg2pdf(clonedSvg, doc, {
      x: margin,
      y: margin,
      width: availableWidth,
      height: availableHeight,
    });
    doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
  } catch (err) {
    console.warn('Vector PDF conversion encountered an error, falling back to high-res canvas rendering:', err);
    await fallbackCanvasPdfExport(svgElement, doc, margin, availableWidth, availableHeight, fileName, options);
  }
}

export async function fallbackCanvasPdfExport(
  svgElement: SVGSVGElement,
  doc?: jsPDF,
  margin: number = 8,
  availableWidth?: number,
  availableHeight?: number,
  fileName: string = 'diagram.pdf',
  options?: ExportPdfOptions
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const targetDoc =
    doc ||
    new jsPDF({
      orientation: options?.orientation || 'landscape',
      unit: 'mm',
      format: options?.format || 'a3',
    });
  const pageWidth = targetDoc.internal.pageSize.getWidth();
  const pageHeight = targetDoc.internal.pageSize.getHeight();
  const effMargin = margin;
  const effWidth = availableWidth ?? (pageWidth - effMargin * 2);
  const effHeight = availableHeight ?? (pageHeight - effMargin * 2);

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svgElement);

  if (!svgString.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
    img.src = url;
  });

  const viewBox = svgElement.viewBox.baseVal;
  const originalWidth = viewBox && viewBox.width > 0 ? viewBox.width : svgElement.clientWidth || 1800;
  const originalHeight = viewBox && viewBox.height > 0 ? viewBox.height : svgElement.clientHeight || 1100;

  const scale = 2.5; // High resolution 2.5x rendering
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(originalWidth * scale);
  canvas.height = Math.round(originalHeight * scale);

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imgData = canvas.toDataURL('image/png', 0.95);
    targetDoc.addImage(imgData, 'PNG', effMargin, effMargin, effWidth, effHeight);
    targetDoc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
  }
  URL.revokeObjectURL(url);
}
