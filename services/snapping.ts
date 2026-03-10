/**
 * Smart snapping system - provides alignment guides when moving/resizing elements.
 * Inspired by Excalidraw's snapping behavior.
 */

import { SketchElement, Tool } from '../types';
import { getCachedBounds } from './cache/elementCache';
import { BBox } from '../utils/math';

export interface SnapLine {
  type: 'vertical' | 'horizontal';
  value: number;
  start: number;
  end: number;
}

export interface SnapResult {
  x: number | null;
  y: number | null;
  snapLines: SnapLine[];
}

const SNAP_THRESHOLD = 5; // In canvas coordinates

/**
 * Calculate snap positions for an element being moved/resized.
 * Checks alignment against all other elements.
 */
export const getSnapResult = (
  movingBounds: BBox,
  allElements: readonly SketchElement[],
  excludeIds: Set<number>,
  zoom: number,
): SnapResult => {
  const threshold = SNAP_THRESHOLD / zoom;
  const snapLines: SnapLine[] = [];
  let snapX: number | null = null;
  let snapY: number | null = null;

  // Collect anchor points from all non-moving elements
  const anchors: BBox[] = [];
  for (const el of allElements) {
    if (excludeIds.has(el.id)) continue;
    anchors.push(getCachedBounds(el));
  }

  // Moving element's key alignment points
  const movingPoints = {
    left: movingBounds.minX,
    right: movingBounds.maxX,
    centerX: movingBounds.midX,
    top: movingBounds.minY,
    bottom: movingBounds.maxY,
    centerY: movingBounds.midY,
  };

  let bestDistX = threshold;
  let bestDistY = threshold;

  for (const anchor of anchors) {
    const anchorPoints = {
      left: anchor.minX,
      right: anchor.maxX,
      centerX: anchor.midX,
      top: anchor.minY,
      bottom: anchor.maxY,
      centerY: anchor.midY,
    };

    // Check horizontal alignments (snap X)
    const xPairs: [number, number, string][] = [
      [movingPoints.left, anchorPoints.left, 'left-left'],
      [movingPoints.left, anchorPoints.right, 'left-right'],
      [movingPoints.left, anchorPoints.centerX, 'left-center'],
      [movingPoints.right, anchorPoints.left, 'right-left'],
      [movingPoints.right, anchorPoints.right, 'right-right'],
      [movingPoints.right, anchorPoints.centerX, 'right-center'],
      [movingPoints.centerX, anchorPoints.left, 'center-left'],
      [movingPoints.centerX, anchorPoints.right, 'center-right'],
      [movingPoints.centerX, anchorPoints.centerX, 'center-center'],
    ];

    for (const [mv, anc] of xPairs) {
      const dist = Math.abs(mv - anc);
      if (dist < bestDistX) {
        bestDistX = dist;
        // We need: movingPoints.left + Δx such that mv + Δx = anc
        // So Δx = anc - mv, and new left = movingPoints.left + (anc - mv)
        snapX = movingPoints.left + (anc - mv);

        // Build snap line
        const lineX = anc;
        const lineTop = Math.min(movingBounds.minY, anchor.minY) - 20;
        const lineBot = Math.max(movingBounds.maxY, anchor.maxY) + 20;
        // Replace snap lines for this axis
        const filtered = snapLines.filter(l => l.type !== 'vertical');
        filtered.push({ type: 'vertical', value: lineX, start: lineTop, end: lineBot });
        snapLines.length = 0;
        snapLines.push(...filtered);
      }
    }

    // Check vertical alignments (snap Y)
    const yPairs: [number, number][] = [
      [movingPoints.top, anchorPoints.top],
      [movingPoints.top, anchorPoints.bottom],
      [movingPoints.top, anchorPoints.centerY],
      [movingPoints.bottom, anchorPoints.top],
      [movingPoints.bottom, anchorPoints.bottom],
      [movingPoints.bottom, anchorPoints.centerY],
      [movingPoints.centerY, anchorPoints.top],
      [movingPoints.centerY, anchorPoints.bottom],
      [movingPoints.centerY, anchorPoints.centerY],
    ];

    for (const [mv, anc] of yPairs) {
      const dist = Math.abs(mv - anc);
      if (dist < bestDistY) {
        bestDistY = dist;
        snapY = movingPoints.top + (anc - mv);

        const lineY = anc;
        const lineLeft = Math.min(movingBounds.minX, anchor.minX) - 20;
        const lineRight = Math.max(movingBounds.maxX, anchor.maxX) + 20;
        const filtered = snapLines.filter(l => l.type !== 'horizontal');
        filtered.push({ type: 'horizontal', value: lineY, start: lineLeft, end: lineRight });
        snapLines.length = 0;
        snapLines.push(...filtered);
      }
    }
  }

  return {
    x: snapX !== null && bestDistX < threshold ? snapX : null,
    y: snapY !== null && bestDistY < threshold ? snapY : null,
    snapLines: (snapX !== null || snapY !== null) ? snapLines : [],
  };
};

/**
 * Draw snap/alignment guide lines on the canvas.
 */
export const drawSnapGuides = (
  ctx: CanvasRenderingContext2D,
  snapLines: SnapLine[],
  zoom: number,
): void => {
  if (snapLines.length === 0) return;

  ctx.save();
  ctx.strokeStyle = '#FF6B6B';
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  ctx.globalAlpha = 0.8;

  for (const line of snapLines) {
    ctx.beginPath();
    if (line.type === 'vertical') {
      ctx.moveTo(line.value, line.start);
      ctx.lineTo(line.value, line.end);
    } else {
      ctx.moveTo(line.start, line.value);
      ctx.lineTo(line.end, line.value);
    }
    ctx.stroke();

    // Draw small diamonds at the snap points
    const diamondSize = 4 / zoom;
    ctx.fillStyle = '#FF6B6B';
    ctx.setLineDash([]);
    if (line.type === 'vertical') {
      drawDiamond(ctx, line.value, line.start, diamondSize);
      drawDiamond(ctx, line.value, line.end, diamondSize);
    } else {
      drawDiamond(ctx, line.start, line.value, diamondSize);
      drawDiamond(ctx, line.end, line.value, diamondSize);
    }
    ctx.setLineDash([4 / zoom, 4 / zoom]);
  }

  ctx.restore();
};

const drawDiamond = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
};

/**
 * Get spacing snap lines - ensures equal spacing between consecutive elements.
 */
export const getSpacingSnap = (
  movingBounds: BBox,
  allElements: readonly SketchElement[],
  excludeIds: Set<number>,
  zoom: number,
): SnapResult => {
  // Simplified: just uses alignment snapping for now
  // Full implementation would calculate equal spacings between 3+ elements
  return getSnapResult(movingBounds, allElements, excludeIds, zoom);
};
