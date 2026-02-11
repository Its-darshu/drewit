import { SketchElement, Tool } from '../types';

interface ExportOptions {
  transparent?: boolean;
  scale?: number;
  padding?: number;
}

// Calculate bounds of all elements
export const calculateBounds = (elements: SketchElement[]) => {
  if (elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach(element => {
    const x1 = Math.min(element.x1, element.x2);
    const y1 = Math.min(element.y1, element.y2);
    const x2 = Math.max(element.x1, element.x2);
    const y2 = Math.max(element.y1, element.y2);

    minX = Math.min(minX, x1);
    minY = Math.min(minY, y1);
    maxX = Math.max(maxX, x2);
    maxY = Math.max(maxY, y2);

    // Handle pencil points
    if (element.type === Tool.PENCIL && element.points) {
      element.points.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    }
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

// Export as PNG
export const exportToPNG = (
  canvas: HTMLCanvasElement,
  filename: string,
  options: ExportOptions = {}
) => {
  const { transparent = false, scale = 2 } = options;

  // Create export canvas
  const exportCanvas = document.createElement('canvas');
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  exportCanvas.width = canvas.width * scale;
  exportCanvas.height = canvas.height * scale;

  // Fill background if not transparent
  if (!transparent) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  }

  // Scale and draw
  ctx.scale(scale, scale);
  ctx.drawImage(canvas, 0, 0);

  // Download
  exportCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
};

// Convert element to SVG path
const elementToSVG = (element: SketchElement, offsetX: number, offsetY: number): string => {
  const stroke = element.strokeColor || '#000000';
  const strokeWidth = element.strokeWidth || 2;
  const fill = element.fillColor && element.fillColor !== 'transparent' ? element.fillColor : 'none';
  const opacity = element.opacity !== undefined ? element.opacity : 1;

  const x1 = element.x1 - offsetX;
  const y1 = element.y1 - offsetY;
  const x2 = element.x2 - offsetX;
  const y2 = element.y2 - offsetY;

  switch (element.type) {
    case Tool.RECTANGLE:
      return `<rect x="${Math.min(x1, x2)}" y="${Math.min(y1, y2)}" width="${Math.abs(x2 - x1)}" height="${Math.abs(y2 - y1)}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" opacity="${opacity}" />`;
    
    case Tool.ELLIPSE: {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" opacity="${opacity}" />`;
    }
    
    case Tool.DIAMOND: {
      const centerX = (x1 + x2) / 2;
      const centerY = (y1 + y2) / 2;
      const points = `${centerX},${y1} ${x2},${centerY} ${centerX},${y2} ${x1},${centerY}`;
      return `<polygon points="${points}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" opacity="${opacity}" />`;
    }
    
    case Tool.LINE:
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />`;
    
    case Tool.ARROW: {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const arrowLength = 20;
      const x3 = x2 - arrowLength * Math.cos(angle - Math.PI / 6);
      const y3 = y2 - arrowLength * Math.sin(angle - Math.PI / 6);
      const x4 = x2 - arrowLength * Math.cos(angle + Math.PI / 6);
      const y4 = y2 - arrowLength * Math.sin(angle + Math.PI / 6);
      
      return `
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />
        <line x1="${x2}" y1="${y2}" x2="${x3}" y2="${y3}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />
        <line x1="${x2}" y1="${y2}" x2="${x4}" y2="${y4}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />
      `;
    }
    
    case Tool.PENCIL:
      if (element.points && element.points.length > 0) {
        const pathData = element.points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x - offsetX} ${p.y - offsetY}`)
          .join(' ');
        return `<path d="${pathData}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" opacity="${opacity}" />`;
      }
      return '';
    
    case Tool.TEXT:
      if (element.text) {
        const fontSize = element.fontSize || 24;
        return `<text x="${x1}" y="${y1 + fontSize}" font-size="${fontSize}" fill="${stroke}" opacity="${opacity}">${element.text}</text>`;
      }
      return '';
    
    default:
      return '';
  }
};

// Export as SVG
export const exportToSVG = (elements: SketchElement[], filename: string, options: ExportOptions = {}) => {
  const { padding = 20 } = options;
  const bounds = calculateBounds(elements);
  
  const width = bounds.width + padding * 2;
  const height = bounds.height + padding * 2;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="white"/>
`;

  elements.forEach(element => {
    svg += '  ' + elementToSVG(element, bounds.minX - padding, bounds.minY - padding) + '\n';
  });

  svg += '</svg>';

  // Download
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.svg`;
  a.click();
  URL.revokeObjectURL(url);
};

// Export as JSON (.drewit format)
export interface DrewItFile {
  version: '1.0';
  name: string;
  elements: SketchElement[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    author?: string;
  };
}

export const exportToJSON = (
  elements: SketchElement[],
  filename: string,
  metadata?: { name?: string; author?: string }
) => {
  const drewit: DrewItFile = {
    version: '1.0',
    name: metadata?.name || filename,
    elements: elements,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: metadata?.author,
    },
  };

  const json = JSON.stringify(drewit, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.drewit`;
  a.click();
  URL.revokeObjectURL(url);
};

// Import from JSON
export const importFromJSON = async (file: File): Promise<DrewItFile> => {
  const text = await file.text();
  const data = JSON.parse(text);

  // Validate format
  if (data.version !== '1.0') {
    throw new Error('Unsupported file version');
  }

  if (!Array.isArray(data.elements)) {
    throw new Error('Invalid file format: missing elements');
  }

  return data;
};

// Export as PDF (using canvas snapshot)
export const exportToPDF = async (canvas: HTMLCanvasElement, filename: string) => {
  // For now, we'll export as PNG embedded in a simple HTML that can be printed as PDF
  // In a real app, you'd use a library like jspdf
  
  canvas.toBlob((blob) => {
    if (!blob) return;
    
    // Create a simple HTML page with the image
    const url = URL.createObjectURL(blob);
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${filename}</title>
            <style>
              body { margin: 0; padding: 20px; }
              img { max-width: 100%; height: auto; }
              @media print {
                body { margin: 0; padding: 0; }
                img { width: 100%; }
              }
            </style>
          </head>
          <body>
            <img src="${url}" alt="${filename}" />
            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => window.close(), 100);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }, 'image/png');
};
