/**
 * Math utilities for geometric operations - modeled after Excalidraw's math package
 */

export type Vector = [number, number];
export type Matrix = [number, number, number, number, number, number]; // 2D affine transform

// ─── Point Operations ───────────────────────────────────────────────
export const pointDistance = (
  ax: number, ay: number, bx: number, by: number
): number => Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);

export const pointFromVector = (v: Vector, ox = 0, oy = 0): [number, number] =>
  [ox + v[0], oy + v[1]];

export const vectorFromPoint = (
  ax: number, ay: number, bx: number, by: number
): Vector => [bx - ax, by - ay];

export const vectorLength = (v: Vector): number =>
  Math.sqrt(v[0] ** 2 + v[1] ** 2);

export const vectorNormalize = (v: Vector): Vector => {
  const len = vectorLength(v);
  if (len === 0) return [0, 0];
  return [v[0] / len, v[1] / len];
};

export const vectorScale = (v: Vector, s: number): Vector =>
  [v[0] * s, v[1] * s];

export const vectorAdd = (a: Vector, b: Vector): Vector =>
  [a[0] + b[0], a[1] + b[1]];

export const vectorDot = (a: Vector, b: Vector): number =>
  a[0] * b[0] + a[1] * b[1];

export const vectorCross = (a: Vector, b: Vector): number =>
  a[0] * b[1] - a[1] * b[0];

export const vectorRotate = (v: Vector, angle: number): Vector => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [v[0] * cos - v[1] * sin, v[0] * sin + v[1] * cos];
};

// ─── Angle Operations ───────────────────────────────────────────────
export const normalizeAngle = (angle: number): number => {
  const normalized = angle % (2 * Math.PI);
  return normalized < 0 ? normalized + 2 * Math.PI : normalized;
};

export const angleBetween = (
  ax: number, ay: number, bx: number, by: number
): number => Math.atan2(by - ay, bx - ax);

export const radiansToDegrees = (rad: number): number => (rad * 180) / Math.PI;
export const degreesToRadians = (deg: number): number => (deg * Math.PI) / 180;

// ─── Rotation ───────────────────────────────────────────────────────
export const rotatePoint = (
  px: number, py: number,
  cx: number, cy: number,
  angle: number
): [number, number] => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = px - cx;
  const dy = py - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
};

export const getRotatedCorners = (
  x1: number, y1: number, x2: number, y2: number, angle: number
): [number, number][] => {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  return [
    rotatePoint(x1, y1, cx, cy, angle),
    rotatePoint(x2, y1, cx, cy, angle),
    rotatePoint(x2, y2, cx, cy, angle),
    rotatePoint(x1, y2, cx, cy, angle),
  ];
};

// ─── Bounding Box ───────────────────────────────────────────────────
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  midX: number;
  midY: number;
}

export const getBBox = (x1: number, y1: number, x2: number, y2: number): BBox => {
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1, x2);
  const maxY = Math.max(y1, y2);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    minX,
    minY,
    maxX,
    maxY,
    midX: (minX + maxX) / 2,
    midY: (minY + maxY) / 2,
  };
};

export const getRotatedBBox = (
  x1: number, y1: number, x2: number, y2: number, angle: number
): BBox => {
  if (angle === 0) return getBBox(x1, y1, x2, y2);
  const corners = getRotatedCorners(x1, y1, x2, y2, angle);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [cx, cy] of corners) {
    minX = Math.min(minX, cx);
    minY = Math.min(minY, cy);
    maxX = Math.max(maxX, cx);
    maxY = Math.max(maxY, cy);
  }
  return {
    x: minX, y: minY,
    width: maxX - minX, height: maxY - minY,
    minX, minY, maxX, maxY,
    midX: (minX + maxX) / 2, midY: (minY + maxY) / 2,
  };
};

// ─── Line / Segment Operations ──────────────────────────────────────
export const pointOnLine = (
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
  threshold = 5
): boolean => {
  const d = pointDistance(x1, y1, x2, y2);
  if (d === 0) return pointDistance(px, py, x1, y1) <= threshold;
  const t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / (d * d);
  const t1 = Math.max(0, Math.min(1, t));
  const nx = x1 + t1 * (x2 - x1);
  const ny = y1 + t1 * (y2 - y1);
  return pointDistance(px, py, nx, ny) <= threshold;
};

export const pointInRect = (
  px: number, py: number,
  rx: number, ry: number,
  rw: number, rh: number
): boolean => px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;

export const pointInEllipse = (
  px: number, py: number,
  cx: number, cy: number,
  rx: number, ry: number
): boolean => {
  if (rx === 0 || ry === 0) return false;
  return ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2) <= 1;
};

export const pointInDiamond = (
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
): boolean => {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const hw = Math.abs(x2 - x1) / 2;
  const hh = Math.abs(y2 - y1) / 2;
  if (hw === 0 || hh === 0) return false;
  return Math.abs(px - cx) / hw + Math.abs(py - cy) / hh <= 1;
};

// ─── Intersection ───────────────────────────────────────────────────
export const lineIntersection = (
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): [number, number] | null => {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
  }
  return null;
};

export const rectsIntersect = (
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

// ─── Snapping ───────────────────────────────────────────────────────
export const snapToValue = (value: number, snapPoints: number[], threshold: number): number | null => {
  for (const sp of snapPoints) {
    if (Math.abs(value - sp) < threshold) return sp;
  }
  return null;
};

export const snapToGrid = (value: number, gridSize: number): number =>
  Math.round(value / gridSize) * gridSize;

// ─── Bezier Curves ──────────────────────────────────────────────────
export const quadraticBezierPoint = (
  t: number,
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number
): [number, number] => {
  const mt = 1 - t;
  return [
    mt * mt * p0x + 2 * mt * t * p1x + t * t * p2x,
    mt * mt * p0y + 2 * mt * t * p1y + t * t * p2y,
  ];
};

export const cubicBezierPoint = (
  t: number,
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number
): [number, number] => {
  const mt = 1 - t;
  return [
    mt ** 3 * p0x + 3 * mt ** 2 * t * p1x + 3 * mt * t ** 2 * p2x + t ** 3 * p3x,
    mt ** 3 * p0y + 3 * mt ** 2 * t * p1y + 3 * mt * t ** 2 * p2y + t ** 3 * p3y,
  ];
};

// ─── Clamp / Lerp ───────────────────────────────────────────────────
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

export const inverseLerp = (a: number, b: number, v: number): number =>
  a === b ? 0 : (v - a) / (b - a);

// ─── Transform Handle Positions ─────────────────────────────────────
export type TransformHandleType =
  | 'nw' | 'ne' | 'sw' | 'se'    // corners
  | 'n' | 's' | 'e' | 'w'        // edges (midpoints)
  | 'rotation';                    // rotation handle

export interface TransformHandle {
  type: TransformHandleType;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const getTransformHandles = (
  x1: number, y1: number, x2: number, y2: number,
  angle: number,
  zoom: number,
  omitEdges = false
): TransformHandle[] => {
  const size = 8 / zoom;
  const rotationOffset = 30 / zoom;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const w = x2 - x1;
  const h = y2 - y1;

  const handles: TransformHandle[] = [];

  // Corner handles
  const corners: [TransformHandleType, number, number][] = [
    ['nw', x1, y1],
    ['ne', x2, y1],
    ['sw', x1, y2],
    ['se', x2, y2],
  ];

  for (const [type, hx, hy] of corners) {
    const [rx, ry] = rotatePoint(hx, hy, cx, cy, angle);
    handles.push({ type, x: rx - size / 2, y: ry - size / 2, width: size, height: size });
  }

  // Edge midpoint handles
  if (!omitEdges) {
    const edges: [TransformHandleType, number, number][] = [
      ['n', cx, y1],
      ['s', cx, y2],
      ['w', x1, cy],
      ['e', x2, cy],
    ];

    for (const [type, hx, hy] of edges) {
      const [rx, ry] = rotatePoint(hx, hy, cx, cy, angle);
      handles.push({ type, x: rx - size / 2, y: ry - size / 2, width: size, height: size });
    }
  }

  // Rotation handle (above the element)
  const [rotX, rotY] = rotatePoint(cx, y1 - rotationOffset, cx, cy, angle);
  handles.push({
    type: 'rotation',
    x: rotX - size / 2,
    y: rotY - size / 2,
    width: size,
    height: size,
  });

  return handles;
};

export const getHandleAtPoint = (
  px: number, py: number,
  handles: TransformHandle[],
  threshold = 0
): TransformHandle | null => {
  for (const handle of handles) {
    if (
      px >= handle.x - threshold &&
      px <= handle.x + handle.width + threshold &&
      py >= handle.y - threshold &&
      py <= handle.y + handle.height + threshold
    ) {
      return handle;
    }
  }
  return null;
};

export const getCursorForHandle = (type: TransformHandleType, angle: number): string => {
  const cursors: Record<string, string> = {
    nw: 'nwse-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    se: 'nwse-resize',
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
    rotation: 'grab',
  };

  // Adjust cursor direction based on rotation angle
  if (angle === 0) return cursors[type] || 'default';

  const handleAngles: Record<string, number> = {
    nw: -Math.PI * 0.75,
    n: -Math.PI / 2,
    ne: -Math.PI / 4,
    e: 0,
    se: Math.PI / 4,
    s: Math.PI / 2,
    sw: Math.PI * 0.75,
    w: Math.PI,
  };

  if (type === 'rotation') return 'grab';

  const baseAngle = handleAngles[type] || 0;
  const totalAngle = normalizeAngle(baseAngle + angle);
  const segment = Math.round((totalAngle * 4) / Math.PI) % 8;

  const rotatedCursors = [
    'ew-resize', 'nesw-resize', 'ns-resize', 'nwse-resize',
    'ew-resize', 'nesw-resize', 'ns-resize', 'nwse-resize',
  ];

  return rotatedCursors[segment] || 'default';
};
