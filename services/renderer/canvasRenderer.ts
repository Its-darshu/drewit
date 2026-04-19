/**
 * Multi-layer canvas renderer - separates static elements from interactive overlays.
 * Inspired by Excalidraw's Renderer architecture.
 *
 * Layer stack (bottom to top):
 *  1. Static layer  - rendered elements (only redraws when elements change)
 *  2. Interactive layer - selection handles, drag preview, snap guides, hover effects
 */

import { SketchElement, Tool } from '../../types';
import { getCachedBounds } from '../cache/elementCache';
import { drawSnapGuides, SnapLine } from '../snapping';
import { drawBindingHighlight } from '../binding';
import {
  getTransformHandles,
  getRotatedCorners,
  rotatePoint,
  BBox,
} from '../../utils/math';
import { drawElement } from '../drawingService';
import rough from 'roughjs/bundled/rough.esm';

// ─── Types ──────────────────────────────────────────────────────────

export interface RenderConfig {
  zoom: number;
  panOffset: { x: number; y: number };
  showGrid: boolean;
  gridSize: number;
  selectedElementIds: number[];
  hoveredElementId: number | null;
  selectionBox: { x1: number; y1: number; x2: number; y2: number } | null;
  snapLines: SnapLine[];
  bindingTarget: SketchElement | null;
  dragPreviewOffset: { x: number; y: number } | null;
  drawPreviewElement?: SketchElement | null;
  isPanning: boolean;
  isRotating: boolean;
}

// ─── Grid Drawing ───────────────────────────────────────────────────

export const renderGrid = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number,
  panOffset: { x: number; y: number },
  gridSize: number,
) => {
  const viewMinX = -panOffset.x / zoom;
  const viewMinY = -panOffset.y / zoom;
  const viewMaxX = (width - panOffset.x) / zoom;
  const viewMaxY = (height - panOffset.y) / zoom;

  // Dot grid (cleaner than line grid at normal zoom)
  ctx.fillStyle = '#d0d0d0';
  const dotRadius = 1 / zoom;

  if (gridSize <= 0) return;

  const startX = Math.floor(viewMinX / gridSize) * gridSize;
  const startY = Math.floor(viewMinY / gridSize) * gridSize;

  const maxIterations = 10000;
  let iterations = 0;

  for (let x = startX; x <= viewMaxX && iterations < maxIterations; x += gridSize) {
    for (let y = startY; y <= viewMaxY && iterations < maxIterations; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      iterations++;
    }
  }
};

// ─── Static Layer ───────────────────────────────────────────────────

export const renderStaticLayer = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  elements: readonly SketchElement[],
  config: RenderConfig,
) => {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, rect.width, rect.height);

  ctx.save();
  ctx.translate(config.panOffset.x, config.panOffset.y);
  ctx.scale(config.zoom, config.zoom);

  // Grid
  if (config.showGrid) {
    renderGrid(ctx, rect.width, rect.height, config.zoom, config.panOffset, config.gridSize);
  }

  // Draw origin crosshair
  drawOriginCrosshair(ctx, rect.width, rect.height, config.zoom, config.panOffset);

  // Viewport culling
  const viewMinX = -config.panOffset.x / config.zoom - 50;
  const viewMinY = -config.panOffset.y / config.zoom - 50;
  const viewMaxX = (rect.width - config.panOffset.x) / config.zoom + 50;
  const viewMaxY = (rect.height - config.panOffset.y) / config.zoom + 50;

  const roughCanvas = rough.canvas(canvas);

  for (const element of elements) {
    const bounds = getCachedBounds(element);
    if (bounds.maxX < viewMinX || bounds.minX > viewMaxX ||
        bounds.maxY < viewMinY || bounds.minY > viewMaxY) {
      continue; // Skip off-screen elements
    }

    // drawElement handles rotation internally
    drawElement(roughCanvas, ctx, element);
  }

  ctx.restore();
};

// ─── Interactive Layer ──────────────────────────────────────────────

export const renderInteractiveLayer = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  elements: readonly SketchElement[],
  config: RenderConfig,
) => {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  // Clear with transparency
  ctx.clearRect(0, 0, rect.width, rect.height);

  ctx.save();
  ctx.translate(config.panOffset.x, config.panOffset.y);
  ctx.scale(config.zoom, config.zoom);

  // Draw selection handles for selected elements
  for (const id of config.selectedElementIds) {
    const element = elements.find(el => el.id === id);
    if (!element) continue;
    renderSelectionFrame(ctx, element, config.zoom);
  }

  // Multi-element selection bounding box
  if (config.selectedElementIds.length > 1) {
    const selectedEls = elements.filter(el => config.selectedElementIds.includes(el.id));
    renderMultiSelectionBounds(ctx, selectedEls, config.zoom);
  }

  // Selection box (drag selection)
  if (config.selectionBox) {
    renderSelectionBox(ctx, config.selectionBox, config.zoom);
  }

  // Snap guides
  if (config.snapLines.length > 0) {
    drawSnapGuides(ctx, config.snapLines, config.zoom);
  }

  // Binding highlight
  if (config.bindingTarget) {
    drawBindingHighlight(ctx, config.bindingTarget, config.zoom);
  }

  // Hover highlight (when not selected)
  if (config.hoveredElementId && !config.selectedElementIds.includes(config.hoveredElementId)) {
    const hovered = elements.find(el => el.id === config.hoveredElementId);
    if (hovered) {
      renderHoverHighlight(ctx, hovered, config.zoom);
    }
  }

  // Drag preview
  if (config.dragPreviewOffset && config.selectedElementIds.length > 0) {
    renderDragPreview(ctx, elements, config.selectedElementIds, config.dragPreviewOffset, config.zoom, canvas);
  }

  // Live shape preview while drawing
  if (config.drawPreviewElement) {
    const roughCanvas = rough.canvas(canvas);
    drawElement(roughCanvas, ctx, config.drawPreviewElement);
  }

  ctx.restore();

  // HUD elements (outside canvas transform)
  renderHUD(ctx, rect.width, rect.height, config, elements.length);
};

// ─── Render Helpers ─────────────────────────────────────────────────

const renderSelectionFrame = (
  ctx: CanvasRenderingContext2D,
  element: SketchElement,
  zoom: number,
) => {
  const bounds = getCachedBounds(element);
  const angle = element.angle || 0;
  const cx = (element.x1 + element.x2) / 2;
  const cy = (element.y1 + element.y2) / 2;

  ctx.save();

  if (angle !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
  }

  // Selection rectangle
  const padding = 4 / zoom;
  const minX = Math.min(element.x1, element.x2);
  const minY = Math.min(element.y1, element.y2);
  const w = Math.abs(element.x2 - element.x1);
  const h = Math.abs(element.y2 - element.y1);

  ctx.strokeStyle = '#4A90E2';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([]);
  ctx.strokeRect(minX - padding, minY - padding, w + padding * 2, h + padding * 2);

  // Transform handles
  const handleSize = 8 / zoom;
  const handles = getTransformHandles(
    minX, minY, minX + w, minY + h,
    0, // angle is already applied via ctx.rotate
    zoom,
  );

  for (const handle of handles) {
    if (handle.type === 'rotation') {
      // Rotation handle - circle with line
      const rotHandleX = handle.x + handle.width / 2;
      const rotHandleY = handle.y + handle.height / 2;

      // Line from top-center to rotation handle
      ctx.strokeStyle = '#4A90E2';
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      ctx.moveTo(minX + w / 2, minY - padding);
      ctx.lineTo(rotHandleX, rotHandleY);
      ctx.stroke();

      // Rotation circle
      ctx.fillStyle = '#4A90E2';
      ctx.beginPath();
      ctx.arc(rotHandleX, rotHandleY, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5 / zoom;
      ctx.stroke();
    } else {
      // Resize handles - squares
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#4A90E2';
      ctx.lineWidth = 1.5 / zoom;
      ctx.fillRect(handle.x, handle.y, handle.width, handle.height);
      ctx.strokeRect(handle.x, handle.y, handle.width, handle.height);
    }
  }

  ctx.restore();
};

const renderMultiSelectionBounds = (
  ctx: CanvasRenderingContext2D,
  elements: SketchElement[],
  zoom: number,
) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const b = getCachedBounds(el);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }

  const padding = 6 / zoom;
  ctx.save();
  ctx.strokeStyle = '#4A90E2';
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([6 / zoom, 4 / zoom]);
  ctx.strokeRect(
    minX - padding, minY - padding,
    maxX - minX + padding * 2, maxY - minY + padding * 2,
  );
  ctx.restore();
};

const renderSelectionBox = (
  ctx: CanvasRenderingContext2D,
  box: { x1: number; y1: number; x2: number; y2: number },
  zoom: number,
) => {
  const x = Math.min(box.x1, box.x2);
  const y = Math.min(box.y1, box.y2);
  const w = Math.abs(box.x2 - box.x1);
  const h = Math.abs(box.y2 - box.y1);

  ctx.save();
  ctx.fillStyle = 'rgba(74, 144, 226, 0.08)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#4A90E2';
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
};

const renderHoverHighlight = (
  ctx: CanvasRenderingContext2D,
  element: SketchElement,
  zoom: number,
) => {
  const bounds = getCachedBounds(element);
  const padding = 3 / zoom;

  ctx.save();
  ctx.strokeStyle = 'rgba(74, 144, 226, 0.4)';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([]);
  ctx.strokeRect(
    bounds.minX - padding, bounds.minY - padding,
    bounds.width + padding * 2, bounds.height + padding * 2,
  );
  ctx.restore();
};

const renderDragPreview = (
  ctx: CanvasRenderingContext2D,
  elements: readonly SketchElement[],
  selectedIds: number[],
  offset: { x: number; y: number },
  zoom: number,
  canvas: HTMLCanvasElement,
) => {
  const selectedElements = elements.filter(el => selectedIds.includes(el.id));
  if (selectedElements.length === 0) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of selectedElements) {
    const b = getCachedBounds(el);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }

  const w = maxX - minX;
  const h = maxY - minY;
  const px = minX + offset.x;
  const py = minY + offset.y;

  ctx.save();

  // Outline
  ctx.strokeStyle = '#4A90E2';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([5 / zoom, 5 / zoom]);
  ctx.strokeRect(px, py, w, h);

  // Dimension labels
  ctx.fillStyle = '#4A90E2';
  ctx.font = `${11 / zoom}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${Math.round(w)}`, px + w / 2, py - 4 / zoom);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(h)}`, px - 4 / zoom, py + h / 2);

  // Position
  ctx.font = `${10 / zoom}px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.globalAlpha = 0.7;
  ctx.fillText(`(${Math.round(px)}, ${Math.round(py)})`, px + 4 / zoom, py + 4 / zoom);

  ctx.restore();
};

const drawOriginCrosshair = (
  ctx: CanvasRenderingContext2D,
  width: number, height: number,
  zoom: number,
  panOffset: { x: number; y: number },
) => {
  const viewMinX = -panOffset.x / zoom;
  const viewMinY = -panOffset.y / zoom;
  const viewMaxX = (width - panOffset.x) / zoom;
  const viewMaxY = (height - panOffset.y) / zoom;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.15)';
  ctx.lineWidth = 1 / zoom;

  if (viewMinY <= 0 && viewMaxY >= 0) {
    ctx.beginPath();
    ctx.moveTo(viewMinX, 0);
    ctx.lineTo(viewMaxX, 0);
    ctx.stroke();
  }

  if (viewMinX <= 0 && viewMaxX >= 0) {
    ctx.beginPath();
    ctx.moveTo(0, viewMinY);
    ctx.lineTo(0, viewMaxY);
    ctx.stroke();
  }

  ctx.restore();
};

const renderHUD = (
  ctx: CanvasRenderingContext2D,
  width: number, height: number,
  config: RenderConfig,
  totalElements: number,
) => {
  ctx.save();

  // Bottom-left: zoom & element info
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, monospace';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  const info = `${Math.round(config.zoom * 100)}%  •  ${totalElements} element${totalElements !== 1 ? 's' : ''}`;
  ctx.fillText(info, 12, height - 12);

  // Pan mode indicator
  if (config.isPanning) {
    ctx.fillStyle = 'rgba(74, 144, 226, 0.9)';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Pan Mode', width / 2, 8);
  }

  ctx.restore();
};
