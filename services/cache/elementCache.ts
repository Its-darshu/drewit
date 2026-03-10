/**
 * Element bounds caching system using WeakMap pattern from Excalidraw.
 * Caches computed bounds, paths, and shapes to avoid recalculation every frame.
 */

import { SketchElement, Tool, Point } from '../../types';
import { getBBox, getRotatedBBox, BBox } from '../../utils/math';

// ─── Cache Maps ─────────────────────────────────────────────────────
// Version-keyed caches: invalidated when element.version changes
const boundsCache = new Map<number, { version: number; bounds: BBox }>();
const pathCache = new Map<number, { version: number; path: Path2D }>();
const roughShapeCache = new Map<number, { version: number; shape: any }>();

// ─── Public API ─────────────────────────────────────────────────────

export const getCachedBounds = (element: SketchElement): BBox => {
  const cached = boundsCache.get(element.id);
  if (cached && cached.version === element.version) {
    return cached.bounds;
  }

  const bounds = computeElementBounds(element);
  boundsCache.set(element.id, { version: element.version, bounds });
  return bounds;
};

export const getCachedPath = (element: SketchElement): Path2D | null => {
  const cached = pathCache.get(element.id);
  if (cached && cached.version === element.version) {
    return cached.path;
  }

  const path = computeElementPath(element);
  if (path) {
    pathCache.set(element.id, { version: element.version, path });
  }
  return path;
};

export const getCachedRoughShape = (element: SketchElement): any | null => {
  const cached = roughShapeCache.get(element.id);
  if (cached && cached.version === element.version) {
    return cached.shape;
  }
  return null;
};

export const setCachedRoughShape = (element: SketchElement, shape: any): void => {
  roughShapeCache.set(element.id, { version: element.version, shape });
};

export const invalidateCache = (elementId: number): void => {
  boundsCache.delete(elementId);
  pathCache.delete(elementId);
  roughShapeCache.delete(elementId);
};

export const invalidateAllCaches = (): void => {
  boundsCache.clear();
  pathCache.clear();
  roughShapeCache.clear();
};

// Prune caches to remove entries for deleted elements
export const pruneCache = (activeIds: Set<number>): void => {
  for (const id of boundsCache.keys()) {
    if (!activeIds.has(id)) boundsCache.delete(id);
  }
  for (const id of pathCache.keys()) {
    if (!activeIds.has(id)) pathCache.delete(id);
  }
  for (const id of roughShapeCache.keys()) {
    if (!activeIds.has(id)) roughShapeCache.delete(id);
  }
};

// ─── Cache Stats (for debugging) ────────────────────────────────────
export const getCacheStats = () => ({
  bounds: boundsCache.size,
  paths: pathCache.size,
  roughShapes: roughShapeCache.size,
  total: boundsCache.size + pathCache.size + roughShapeCache.size,
});

// ─── Internal computations ──────────────────────────────────────────

const computeElementBounds = (element: SketchElement): BBox => {
  const angle = element.angle || 0;

  if (element.type === Tool.PENCIL) {
    const points = element.points;
    if (!points || points.length === 0) {
      return angle !== 0
        ? getRotatedBBox(element.x1, element.y1, element.x2, element.y2, angle)
        : getBBox(element.x1, element.y1, element.x2, element.y2);
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    // Add stroke width padding
    const pad = (element.strokeWidth || 2) / 2;
    const bbox = getBBox(minX - pad, minY - pad, maxX + pad, maxY + pad);
    if (angle !== 0) {
      return getRotatedBBox(bbox.minX, bbox.minY, bbox.maxX, bbox.maxY, angle);
    }
    return bbox;
  }

  if (element.type === Tool.ARROW) {
    const points = element.points;
    if (points && points.length > 0) {
      let minX = element.x1, minY = element.y1, maxX = element.x1, maxY = element.y1;
      for (const p of points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      minX = Math.min(minX, element.x2);
      minY = Math.min(minY, element.y2);
      maxX = Math.max(maxX, element.x2);
      maxY = Math.max(maxY, element.y2);
      return angle !== 0
        ? getRotatedBBox(minX, minY, maxX, maxY, angle)
        : getBBox(minX, minY, maxX, maxY);
    }
    return angle !== 0
      ? getRotatedBBox(element.x1, element.y1, element.x2, element.y2, angle)
      : getBBox(element.x1, element.y1, element.x2, element.y2);
  }

  if (element.type === Tool.TEXT) {
    // Approximate text bounds (font metrics are expensive)
    return angle !== 0
      ? getRotatedBBox(element.x1, element.y1, element.x2, element.y2, angle)
      : getBBox(element.x1, element.y1, element.x2, element.y2);
  }

  // Shapes with rotation
  if (angle !== 0) {
    return getRotatedBBox(element.x1, element.y1, element.x2, element.y2, angle);
  }

  return getBBox(element.x1, element.y1, element.x2, element.y2);
};

const computeElementPath = (element: SketchElement): Path2D | null => {
  const path = new Path2D();

  switch (element.type) {
    case Tool.RECTANGLE: {
      const minX = Math.min(element.x1, element.x2);
      const minY = Math.min(element.y1, element.y2);
      const w = Math.abs(element.x2 - element.x1);
      const h = Math.abs(element.y2 - element.y1);
      path.rect(minX, minY, w, h);
      return path;
    }

    case Tool.ELLIPSE: {
      const cx = (element.x1 + element.x2) / 2;
      const cy = (element.y1 + element.y2) / 2;
      const rx = Math.abs(element.x2 - element.x1) / 2;
      const ry = Math.abs(element.y2 - element.y1) / 2;
      path.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      return path;
    }

    case Tool.DIAMOND: {
      const cx = (element.x1 + element.x2) / 2;
      const cy = (element.y1 + element.y2) / 2;
      path.moveTo(cx, element.y1);
      path.lineTo(element.x2, cy);
      path.lineTo(cx, element.y2);
      path.lineTo(element.x1, cy);
      path.closePath();
      return path;
    }

    case Tool.LINE:
    case Tool.ARROW: {
      path.moveTo(element.x1, element.y1);
      const points = 'points' in element ? element.points : undefined;
      if (points && points.length > 0) {
        for (const p of points) {
          path.lineTo(p.x, p.y);
        }
      }
      path.lineTo(element.x2, element.y2);
      return path;
    }

    case Tool.PENCIL: {
      const points = element.points;
      if (!points || points.length < 2) return null;
      path.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        path.lineTo(points[i].x, points[i].y);
      }
      return path;
    }

    default:
      return null;
  }
};
