// Grid rendering utilities

export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gridSize: number,
  scrollX: number,
  scrollY: number,
  zoom: number,
  color: string = '#e0e0e0'
) => {
  const scaledGridSize = gridSize * zoom;
  
  // Calculate grid offset based on scroll
  const offsetX = (scrollX * zoom) % scaledGridSize;
  const offsetY = (scrollY * zoom) % scaledGridSize;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;

  // Draw vertical lines
  for (let x = offsetX; x < width; x += scaledGridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = offsetY; y < height; y += scaledGridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
};

export const drawGridDots = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gridSize: number,
  scrollX: number,
  scrollY: number,
  zoom: number,
  color: string = '#999999'
) => {
  const scaledGridSize = gridSize * zoom;
  
  // Calculate grid offset based on scroll
  const offsetX = (scrollX * zoom) % scaledGridSize;
  const offsetY = (scrollY * zoom) % scaledGridSize;

  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.4;

  const dotSize = 2;

  for (let x = offsetX; x < width; x += scaledGridSize) {
    for (let y = offsetY; y < height; y += scaledGridSize) {
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
};

// Snap line rendering for alignment guides
export const drawSnapLines = (
  ctx: CanvasRenderingContext2D,
  snapLines: { type: 'vertical' | 'horizontal'; value: number }[],
  width: number,
  height: number,
  zoom: number,
  scrollX: number,
  scrollY: number
) => {
  ctx.save();
  ctx.strokeStyle = '#FF00FF';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  ctx.setLineDash([5, 5]);

  snapLines.forEach(line => {
    if (line.type === 'vertical') {
      const x = (line.value - scrollX) * zoom;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    } else {
      const y = (line.value - scrollY) * zoom;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  });

  ctx.restore();
};

// Background pattern rendering
export const drawBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundColor: string
) => {
  ctx.save();
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};
