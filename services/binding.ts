/**
 * Element binding system - connects arrows to shapes.
 * When a shape moves, bound arrows follow.
 * Inspired by Excalidraw's binding system.
 */

import { SketchElement, Tool, Binding, Point } from '../types';
import { getCachedBounds } from './cache/elementCache';
import { pointDistance, pointInRect, pointInEllipse, pointInDiamond } from '../utils/math';

const BINDING_THRESHOLD = 10; // px distance to trigger binding

/**
 * Check if a point is within binding distance of an element's boundary.
 */
export const getBindingTarget = (
  x: number, y: number,
  elements: readonly SketchElement[],
  excludeId?: number,
): SketchElement | null => {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.id === excludeId) continue;
    if (el.type === Tool.ARROW || el.type === Tool.PENCIL || el.type === Tool.TEXT) continue;
    // Skip non-bindable shapes (these types won't appear as SketchElement in practice)

    const bounds = getCachedBounds(el);
    const expandedBounds = {
      minX: bounds.minX - BINDING_THRESHOLD,
      minY: bounds.minY - BINDING_THRESHOLD,
      maxX: bounds.maxX + BINDING_THRESHOLD,
      maxY: bounds.maxY + BINDING_THRESHOLD,
    };

    if (
      x >= expandedBounds.minX && x <= expandedBounds.maxX &&
      y >= expandedBounds.minY && y <= expandedBounds.maxY
    ) {
      return el;
    }
  }
  return null;
};

/**
 * Calculate the binding point on an element's boundary closest to a given point.
 */
export const getBindingPoint = (
  px: number, py: number,
  element: SketchElement,
): Point => {
  const bounds = getCachedBounds(element);
  const cx = bounds.midX;
  const cy = bounds.midY;

  switch (element.type) {
    case Tool.RECTANGLE: {
      return getRectBindingPoint(px, py, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
    }

    case Tool.ELLIPSE: {
      const rx = bounds.width / 2;
      const ry = bounds.height / 2;
      return getEllipseBindingPoint(px, py, cx, cy, rx, ry);
    }

    case Tool.DIAMOND: {
      return getDiamondBindingPoint(px, py, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
    }

    default:
      return { x: cx, y: cy };
  }
};

/**
 * Create a binding object for an arrow endpoint.
 */
export const createBinding = (
  targetElement: SketchElement,
  focusX: number,
  focusY: number,
): Binding => {
  const bounds = getCachedBounds(targetElement);
  const cx = bounds.midX;
  const cy = bounds.midY;

  // Focus is normalized position within the element (-1 to 1)
  const focusXNorm = bounds.width > 0
    ? Math.max(-1, Math.min(1, (focusX - cx) / (bounds.width / 2)))
    : 0;
  const focusYNorm = bounds.height > 0
    ? Math.max(-1, Math.min(1, (focusY - cy) / (bounds.height / 2)))
    : 0;

  return {
    elementId: targetElement.id,
    focus: focusXNorm,
    gap: 5,
  };
};

/**
 * Update arrow endpoints based on their bindings.
 */
export const updateBoundArrows = (
  elements: SketchElement[],
  movedElementIds: Set<number>,
): SketchElement[] => {
  return elements.map(el => {
    if (el.type !== Tool.ARROW) return el;

    let updated = false;
    let newX1 = el.x1;
    let newY1 = el.y1;
    let newX2 = el.x2;
    let newY2 = el.y2;

    // Update start binding
    if (el.startBinding && movedElementIds.has(el.startBinding.elementId)) {
      const target = elements.find(e => e.id === el.startBinding!.elementId);
      if (target) {
        const point = getBindingPoint(el.x2, el.y2, target); // point towards end
        newX1 = point.x;
        newY1 = point.y;
        updated = true;
      }
    }

    // Update end binding
    if (el.endBinding && movedElementIds.has(el.endBinding.elementId)) {
      const target = elements.find(e => e.id === el.endBinding!.elementId);
      if (target) {
        const point = getBindingPoint(el.x1, el.y1, target); // point towards start
        newX2 = point.x;
        newY2 = point.y;
        updated = true;
      }
    }

    if (!updated) return el;

    return {
      ...el,
      x1: newX1, y1: newY1,
      x2: newX2, y2: newY2,
      version: el.version + 1,
    };
  });
};

// ─── Internal helpers ───────────────────────────────────────────────

const getRectBindingPoint = (
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number,
): Point => {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const dx = px - cx;
  const dy = py - cy;
  const w = (x2 - x1) / 2;
  const h = (y2 - y1) / 2;

  if (dx === 0 && dy === 0) return { x: x1, y: cy };

  // Find intersection with rectangle edges
  const scaleX = w > 0 ? Math.abs(dx) / w : Infinity;
  const scaleY = h > 0 ? Math.abs(dy) / h : Infinity;

  // Guard against NaN from 0/0 divisions
  if (!isFinite(scaleX) && !isFinite(scaleY)) return { x: cx + Math.sign(dx) * w, y: cy };

  if (scaleX > scaleY) {
    // Intersects left or right edge
    const absDx = Math.abs(dx);
    const s = absDx > 0 ? w / absDx : 0;
    return { x: cx + dx * s, y: cy + dy * s };
  } else {
    // Intersects top or bottom edge
    const absDy = Math.abs(dy);
    const s = absDy > 0 ? h / absDy : 0;
    return { x: cx + dx * s, y: cy + dy * s };
  }
};

const getEllipseBindingPoint = (
  px: number, py: number,
  cx: number, cy: number,
  rx: number, ry: number,
): Point => {
  const angle = Math.atan2(py - cy, px - cx);
  return {
    x: cx + rx * Math.cos(angle),
    y: cy + ry * Math.sin(angle),
  };
};

const getDiamondBindingPoint = (
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number,
): Point => {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const hw = (x2 - x1) / 2;
  const hh = (y2 - y1) / 2;
  const dx = px - cx;
  const dy = py - cy;

  if (dx === 0 && dy === 0) return { x: cx, y: y1 };

  // Parametric intersection with diamond edges
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const t = hw * hh / (absDy * hw + absDx * hh);

  return {
    x: cx + Math.sign(dx) * t * absDx,
    y: cy + Math.sign(dy) * t * absDy,
  };
};

/**
 * Highlight potential binding targets during arrow drawing.
 */
export const drawBindingHighlight = (
  ctx: CanvasRenderingContext2D,
  element: SketchElement,
  zoom: number,
): void => {
  const bounds = getCachedBounds(element);
  const padding = 4 / zoom;

  ctx.save();
  ctx.strokeStyle = '#4FC3F7';
  ctx.lineWidth = 2 / zoom;
  ctx.setLineDash([6 / zoom, 3 / zoom]);
  ctx.globalAlpha = 0.8;

  switch (element.type) {
    case Tool.RECTANGLE:
      ctx.strokeRect(
        bounds.minX - padding, bounds.minY - padding,
        bounds.width + padding * 2, bounds.height + padding * 2,
      );
      break;

    case Tool.ELLIPSE:
      ctx.beginPath();
      ctx.ellipse(
        bounds.midX, bounds.midY,
        bounds.width / 2 + padding, bounds.height / 2 + padding,
        0, 0, Math.PI * 2,
      );
      ctx.stroke();
      break;

    case Tool.DIAMOND: {
      const cx = bounds.midX;
      const cy = bounds.midY;
      const hw = bounds.width / 2 + padding;
      const hh = bounds.height / 2 + padding;
      ctx.beginPath();
      ctx.moveTo(cx, cy - hh);
      ctx.lineTo(cx + hw, cy);
      ctx.lineTo(cx, cy + hh);
      ctx.lineTo(cx - hw, cy);
      ctx.closePath();
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
};
