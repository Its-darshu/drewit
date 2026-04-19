/**
 * DrawingCanvas - Main canvas component (Excalidraw-inspired architecture).
 *
 * Uses dual-canvas rendering:
 *  - Static layer: element rendering (only updates when elements change)
 *  - Interactive layer: selection, handles, guides (updates on every interaction)
 *
 * Integrates:
 *  - Action system for modular commands
 *  - Element caching for performance
 *  - Smart snapping with visual guides
 *  - Element binding (arrows to shapes)
 *  - Rotation support with transform handles
 *  - Context menu with right-click
 *  - Properties panel for element editing
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SketchElement, Tool, Action, Position, PencilElement, Point } from '../types';
import {
  drawElement,
  createElement,
  getElementAtPosition,
  isPointNearElement,
  moveElement,
  resizeElement as resizeElementCoords,
  getCursorForPosition,
  getElementsInSelectionBox,
} from '../services/drawingService';
import {
  exportToPNG,
  exportToSVG,
  exportToJSON,
  exportToPDF,
  importFromJSON,
} from '../services/exportService';
import { useHistory } from '../hooks/useHistory';
import { localStorageService } from '../services/localStorageService';
import { useAuth } from '../hooks/useAuth';
import { useToolSettings } from '../hooks/useToolSettings';
import {
  renderStaticLayer,
  renderInteractiveLayer,
  RenderConfig,
} from '../services/renderer/canvasRenderer';
import { getCachedBounds, invalidateCache, invalidateAllCaches } from '../services/cache/elementCache';
import { getSnapResult, SnapLine } from '../services/snapping';
import { getBindingTarget, createBinding, updateBoundArrows, drawBindingHighlight } from '../services/binding';
import {
  getTransformHandles,
  getHandleAtPoint,
  getCursorForHandle,
  TransformHandle,
  rotatePoint,
  pointDistance,
  getBBox,
} from '../utils/math';
import { ContextMenu } from './ContextMenu';
import { ExcalidrawToolbar } from './ExcalidrawToolbar';
import { ExcalidrawProperties } from './ExcalidrawProperties';
import rough from 'roughjs/bundled/rough.esm';
import '../styles/drewit.css';

// ─── Types ──────────────────────────────────────────────────────────

interface DrawingCanvasProps {
  projectName: string;
  onBack?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ projectName, onBack }) => {
  // Canvas refs (dual-layer)
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Auth
  const { user } = useAuth();

  // Element state
  const [elements, setElements, undo, redo, canUndo, canRedo] = useHistory<SketchElement>([]);

  // Tool & action state
  const [tool, setTool] = useState<Tool>(Tool.SELECTION);
  const [action, setAction] = useState<Action>(Action.NONE);
  const { settings, updateSettings } = useToolSettings();

  // Selection
  const [selectedElementIds, setSelectedElementIds] = useState<number[]>([]);
  const [hoveredElementId, setHoveredElementId] = useState<number | null>(null);

  // Interaction state
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [resizeInfo, setResizeInfo] = useState<{ position: Position; elementId: number } | null>(null);
  const [rotationInfo, setRotationInfo] = useState<{ elementId: number; startAngle: number } | null>(null);

  // Canvas transform
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);

  // UI state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [showGrid, setShowGrid] = useState(false);
  const [clipboard, setClipboard] = useState<SketchElement[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [dragPreviewOffset, setDragPreviewOffset] = useState<Point | null>(null);
  const [drawPreviewPoint, setDrawPreviewPoint] = useState<Point | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [resizeTick, setResizeTick] = useState(0);

  // Snapping
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);

  // Binding
  const [bindingTarget, setBindingTarget] = useState<SketchElement | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ top: number; left: number } | null>(null);

  // Text editing
  const [editingText, setEditingText] = useState<{ id: number; x: number; y: number } | null>(null);
  const [textDraft, setTextDraft] = useState('');

  // ─── Coordinate Transforms ──────────────────────────────────────

  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => ({
    x: (screenX - panOffset.x) / zoom,
    y: (screenY - panOffset.y) / zoom,
  }), [panOffset, zoom]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = interactiveCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);
  }, [screenToCanvas]);

  const isShapeDrawingTool = useCallback((activeTool: Tool) => (
    activeTool === Tool.RECTANGLE
    || activeTool === Tool.ELLIPSE
    || activeTool === Tool.DIAMOND
    || activeTool === Tool.LINE
    || activeTool === Tool.ARROW
  ), []);

  // ─── Load / Save ────────────────────────────────────────────────

  useEffect(() => {
    const loadProject = async () => {
      const result = await localStorageService.loadProject(projectName);
      if (result.success && result.data) {
        setElements(result.data.elements || [], false);
      }
    };
    loadProject();
  }, [projectName]);

  useEffect(() => {
    localStorageService.enableAutoSave(projectName, () => elements, undefined);
    return () => { localStorageService.disableAutoSave(); };
  }, [projectName, elements]);

  useEffect(() => {
    if (elements.length === 0) return;
    const timeoutId = setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true;
      setIsSaving(true);
      setSaveStatus('saving');
      localStorageService.markDirty();
      try {
        const result = await localStorageService.saveProject(projectName, elements);
        setSaveStatus(result.success ? 'saved' : 'error');
      } catch {
        setSaveStatus('error');
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [elements, projectName]);

  // ─── Rendering ──────────────────────────────────────────────────

  // Static layer render (elements)
  useEffect(() => {
    const canvas = staticCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config: RenderConfig = {
      zoom, panOffset, showGrid, gridSize: 20,
      selectedElementIds, hoveredElementId,
      selectionBox, snapLines,
      bindingTarget, dragPreviewOffset,
      isPanning, isRotating: !!rotationInfo,
    };

    renderStaticLayer(canvas, ctx, elements, config);
  }, [elements, zoom, panOffset, showGrid, resizeTick]);

  const drawPreviewElement =
    action === Action.DRAWING
    && startPoint
    && drawPreviewPoint
    && isShapeDrawingTool(tool)
      ? createElement(
          -1,
          startPoint.x,
          startPoint.y,
          drawPreviewPoint.x,
          drawPreviewPoint.y,
          tool,
          {
            ...settings,
            opacity: 0.65,
          },
        )
      : null;

  // Interactive layer render (overlays)
  useEffect(() => {
    const canvas = interactiveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config: RenderConfig = {
      zoom, panOffset, showGrid, gridSize: 20,
      selectedElementIds, hoveredElementId,
      selectionBox, snapLines,
      bindingTarget, dragPreviewOffset,
      drawPreviewElement,
      isPanning, isRotating: !!rotationInfo,
    };

    renderInteractiveLayer(canvas, ctx, elements, config);
  }, [elements, selectedElementIds, hoveredElementId, selectionBox, snapLines, bindingTarget, dragPreviewOffset, drawPreviewElement, zoom, panOffset, isPanning, rotationInfo, resizeTick]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const sCanvas = staticCanvasRef.current;
      const iCanvas = interactiveCanvasRef.current;
      if (sCanvas && iCanvas) {
        setResizeTick(t => t + 1);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useLayoutEffect(() => {
    if (!editingText) return;
    // Ensure focus is applied before paint so the first keystroke is captured reliably.
    textInputRef.current?.focus();
  }, [editingText]);

  // ─── Zoom Functions ─────────────────────────────────────────────

  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z * 1.2, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z / 1.2, 0.1));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleZoomToFit = useCallback(() => {
    if (elements.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
      const b = getCachedBounds(el);
      minX = Math.min(minX, b.minX);
      minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX);
      maxY = Math.max(maxY, b.maxY);
    }
    const padding = 60;
    const cw = maxX - minX + padding * 2;
    const ch = maxY - minY + padding * 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const newZoom = Math.min(vw / cw, vh / ch, 1);
    const newPanX = (vw - cw * newZoom) / 2 - (minX - padding) * newZoom;
    const newPanY = (vh - ch * newZoom) / 2 - (minY - padding) * newZoom;
    setZoom(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  }, [elements]);

  // ─── Keyboard Shortcuts ─────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement;

      // Ignore when typing (and while text mode is active but focus hasn't landed yet).
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || editingText) return;

      // Spacebar pan mode
      if (e.key === ' ' && !spacePressed) {
        setSpacePressed(true);
        e.preventDefault();
        return;
      }

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0) {
        handleDelete();
        e.preventDefault();
      }
      // Copy
      else if (ctrl && e.key === 'c' && selectedElementIds.length > 0) {
        handleCopy();
        e.preventDefault();
      }
      // Cut
      else if (ctrl && e.key === 'x' && selectedElementIds.length > 0) {
        handleCut();
        e.preventDefault();
      }
      // Paste
      else if (ctrl && e.key === 'v' && clipboard.length > 0) {
        handlePaste();
        e.preventDefault();
      }
      // Undo
      else if (ctrl && e.key === 'z' && !e.shiftKey) {
        undo();
        e.preventDefault();
      }
      // Redo
      else if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        redo();
        e.preventDefault();
      }
      // Select All
      else if (ctrl && e.key === 'a') {
        setSelectedElementIds(elements.map(el => el.id));
        e.preventDefault();
      }
      // Duplicate
      else if (ctrl && e.key === 'd') {
        handleDuplicate();
        e.preventDefault();
      }
      // Zoom
      else if (ctrl && (e.key === '=' || e.key === '+')) { handleZoomIn(); e.preventDefault(); }
      else if (ctrl && (e.key === '-' || e.key === '_')) { handleZoomOut(); e.preventDefault(); }
      else if (ctrl && e.key === '0') { handleZoomReset(); e.preventDefault(); }
      // Grid
      else if (ctrl && e.key === "'") { setShowGrid(g => !g); e.preventDefault(); }
      // Tool shortcuts
      else if (!ctrl && !spacePressed) {
        const toolMap: Record<string, Tool> = {
          v: Tool.SELECTION, r: Tool.RECTANGLE, o: Tool.ELLIPSE, d: Tool.DIAMOND,
          l: Tool.LINE, a: Tool.ARROW, p: Tool.PENCIL, t: Tool.TEXT, e: Tool.ERASER,
        };
        const key = e.key.toLowerCase();
        if (toolMap[key]) {
          setTool(toolMap[key]);
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setSpacePressed(false);
        setIsPanning(false);
        setPanStart(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedElementIds, elements, clipboard, undo, redo, spacePressed, zoom, tool, editingText]);

  // ─── Mouse Handlers ─────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = interactiveCanvasRef.current;
    if (!canvas) return;
    if (editingText) return;

    // Right-click context menu
    if (e.button === 2) {
      e.preventDefault();
      const point = getMousePos(e);
      const el = getElementAtPosition(point.x, point.y, elements);
      if (el && !selectedElementIds.includes(el.id)) {
        setSelectedElementIds([el.id]);
      }
      setContextMenu({ top: e.clientY, left: e.clientX });
      return;
    }

    // Close context menu
    if (contextMenu) setContextMenu(null);

    // Pan mode
    if (spacePressed || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    const point = getMousePos(e);
    setStartPoint(point);

    if (tool === Tool.ERASER) {
      const clicked = getElementAtPosition(point.x, point.y, elements);
      if (clicked) {
        setElements(elements.filter(el => el.id !== clicked.id));
        invalidateCache(clicked.id);
      }
      setAction(Action.DRAWING);
    } else if (tool === Tool.SELECTION) {
      const clicked = getElementAtPosition(point.x, point.y, elements);

      if (clicked) {
        // Check for rotation handle
        if (selectedElementIds.includes(clicked.id)) {
          const minX = Math.min(clicked.x1, clicked.x2);
          const minY = Math.min(clicked.y1, clicked.y2);
          const maxX = Math.max(clicked.x1, clicked.x2);
          const maxY = Math.max(clicked.y1, clicked.y2);
          const handles = getTransformHandles(minX, minY, maxX, maxY, clicked.angle || 0, zoom);
          const handle = getHandleAtPoint(point.x, point.y, handles, 5 / zoom);

          if (handle && handle.type === 'rotation') {
            const cx = (clicked.x1 + clicked.x2) / 2;
            const cy = (clicked.y1 + clicked.y2) / 2;
            const startAngle = Math.atan2(point.y - cy, point.x - cx) - (clicked.angle || 0);
            setRotationInfo({ elementId: clicked.id, startAngle });
            setAction(Action.ROTATING);
            return;
          }
        }

        const { position } = isPointNearElement(point.x, point.y, clicked);

        if (position && position !== 'inside') {
          setAction(Action.RESIZING);
          setResizeInfo({ position, elementId: clicked.id });
          return;
        }

        // Select / add to selection
        if (e.shiftKey) {
          setSelectedElementIds(prev =>
            prev.includes(clicked.id) ? prev.filter(id => id !== clicked.id) : [...prev, clicked.id]
          );
        } else {
          if (!selectedElementIds.includes(clicked.id)) {
            setSelectedElementIds([clicked.id]);
          }
          setAction(Action.MOVING);
          setDragPreviewOffset({ x: 0, y: 0 });
        }
      } else {
        if (!e.shiftKey) setSelectedElementIds([]);
        setAction(Action.SELECTING);
        setSelectionBox({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
      }
    } else if (tool === Tool.TEXT) {
      // Start text editing
      setTextDraft('');
      setEditingText({ id: Date.now(), x: point.x, y: point.y });
      setAction(Action.WRITING);
    } else if (tool === Tool.PENCIL) {
      setAction(Action.DRAWING);
      const newEl = createElement(Date.now(), point.x, point.y, point.x, point.y, tool, settings);
      if (newEl && newEl.type === Tool.PENCIL) {
        (newEl as PencilElement).points = [{ x: point.x, y: point.y }];
        setElements([...elements, newEl as SketchElement], true);
      }
    } else {
      setAction(Action.DRAWING);
      if (isShapeDrawingTool(tool)) {
        setDrawPreviewPoint(point);
      }
    }
  }, [elements, selectedElementIds, tool, spacePressed, panOffset, zoom, settings, contextMenu, getMousePos, isShapeDrawingTool, editingText]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = interactiveCanvasRef.current;
    if (!canvas) return;

    // Panning
    if (isPanning && panStart) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const point = getMousePos(e);

    // Hover detection (when idle)
    if (action === Action.NONE && tool === Tool.SELECTION) {
      const hovered = getElementAtPosition(point.x, point.y, elements);
      setHoveredElementId(hovered?.id || null);

      // Cursor update based on element position
      if (hovered) {
        // Check transform handles on selected elements
        if (selectedElementIds.includes(hovered.id)) {
          const minX = Math.min(hovered.x1, hovered.x2);
          const minY = Math.min(hovered.y1, hovered.y2);
          const maxX = Math.max(hovered.x1, hovered.x2);
          const maxY = Math.max(hovered.y1, hovered.y2);
          const handles = getTransformHandles(minX, minY, maxX, maxY, hovered.angle || 0, zoom);
          const handle = getHandleAtPoint(point.x, point.y, handles, 5 / zoom);
          if (handle) {
            canvas.style.cursor = getCursorForHandle(handle.type, hovered.angle || 0);
            return;
          }
        }

        const { position } = isPointNearElement(point.x, point.y, hovered);
        canvas.style.cursor = position ? getCursorForPosition(position) : 'default';
      } else {
        canvas.style.cursor = 'default';
      }
      return;
    }

    if (!startPoint && action !== Action.NONE) return;

    // Active interaction handling
    if (tool === Tool.ERASER && action === Action.DRAWING) {
      const hovered = getElementAtPosition(point.x, point.y, elements);
      if (hovered) {
        invalidateCache(hovered.id);
        setElements(elements.filter(el => el.id !== hovered.id), true);
      }
    } else if (action === Action.ROTATING && rotationInfo) {
      const el = elements.find(e => e.id === rotationInfo.elementId);
      if (el) {
        const cx = (el.x1 + el.x2) / 2;
        const cy = (el.y1 + el.y2) / 2;
        const angle = Math.atan2(point.y - cy, point.x - cx) - rotationInfo.startAngle;
        // Snap to 15° increments when shift is held
        const snappedAngle = e.shiftKey
          ? Math.round(angle / (Math.PI / 12)) * (Math.PI / 12)
          : angle;
        const newElements = elements.map(el2 =>
          el2.id === rotationInfo.elementId
            ? { ...el2, angle: snappedAngle, version: el2.version + 1 }
            : el2
        );
        invalidateCache(rotationInfo.elementId);
        setElements(newElements, true);
      }
    } else if (action === Action.MOVING && selectedElementIds.length > 0 && startPoint) {
      const offsetX = point.x - startPoint.x;
      const offsetY = point.y - startPoint.y;

      // Smart snapping
      if (selectedElementIds.length > 0) {
        const movingElements = elements.filter(el => selectedElementIds.includes(el.id));
        let snapMinX = Infinity, snapMinY = Infinity, snapMaxX = -Infinity, snapMaxY = -Infinity;
        for (const el of movingElements) {
          const b = getCachedBounds(el);
          snapMinX = Math.min(snapMinX, b.minX + offsetX);
          snapMinY = Math.min(snapMinY, b.minY + offsetY);
          snapMaxX = Math.max(snapMaxX, b.maxX + offsetX);
          snapMaxY = Math.max(snapMaxY, b.maxY + offsetY);
        }

        const movingBounds = getBBox(snapMinX, snapMinY, snapMaxX, snapMaxY);
        const excludeIds = new Set<number>(selectedElementIds);
        const snap = getSnapResult(movingBounds, elements, excludeIds, zoom);
        setSnapLines(snap.snapLines);
      }

      setDragPreviewOffset({ x: offsetX, y: offsetY });

      const newElements = elements.map(el => {
        if (selectedElementIds.includes(el.id)) {
          invalidateCache(el.id);
          return moveElement(el, offsetX, offsetY);
        }
        return el;
      });

      // Update bound arrows
      const movedSet = new Set<number>(selectedElementIds);
      const updated = updateBoundArrows(newElements, movedSet);

      setElements(updated, true);
      setStartPoint(point);
    } else if (action === Action.RESIZING && resizeInfo && startPoint) {
      const el = elements.find(e => e.id === resizeInfo.elementId);
      if (el) {
        const updates = resizeElementCoords(point.x, point.y, resizeInfo.position, el);
        if (updates) {
          invalidateCache(resizeInfo.elementId);
          setElements(elements.map(el2 =>
            el2.id === resizeInfo.elementId ? { ...el2, ...updates, version: el2.version + 1 } : el2
          ), true);
        }
      }
    } else if (action === Action.SELECTING && selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, x2: point.x, y2: point.y } : null);
    } else if (action === Action.DRAWING && startPoint) {
      if (tool === Tool.PENCIL) {
        const lastEl = elements[elements.length - 1];
        if (lastEl && lastEl.type === Tool.PENCIL) {
          const pts = lastEl.points || [];
          if (pts.length === 0 || pts[pts.length - 1].x !== point.x || pts[pts.length - 1].y !== point.y) {
            const updated = {
              ...lastEl,
              points: [...pts, point],
              x2: point.x,
              y2: point.y,
              version: lastEl.version + 1,
            };
            invalidateCache(lastEl.id);
            const newElements = [...elements];
            newElements[newElements.length - 1] = updated;
            setElements(newElements, true);
          }
        }
      } else if (tool === Tool.ARROW) {
        // Show binding target while drawing arrow
        const target = getBindingTarget(point.x, point.y, elements);
        setBindingTarget(target);
      }

      if (isShapeDrawingTool(tool)) {
        setDrawPreviewPoint(point);
      }
    }
  }, [elements, selectedElementIds, tool, action, startPoint, isPanning, panStart, resizeInfo, rotationInfo, selectionBox, zoom, getMousePos, isShapeDrawingTool]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Stop panning
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    const point = startPoint ? getMousePos(e) : null;

    if (action === Action.SELECTING && selectionBox) {
      const selected = getElementsInSelectionBox(
        selectionBox.x1, selectionBox.y1,
        selectionBox.x2!, selectionBox.y2!,
        elements,
      );
      if (e.shiftKey) {
        setSelectedElementIds(prev => [
          ...prev,
          ...selected.filter(el => !prev.includes(el.id)).map(el => el.id),
        ]);
      } else {
        setSelectedElementIds(selected.map(el => el.id));
      }
      setSelectionBox(null);
    } else if (action === Action.DRAWING && tool !== Tool.PENCIL && startPoint && point) {
      if (tool === Tool.ARROW) {
        // Create arrow with binding
        const newEl = createElement(Date.now(), startPoint.x, startPoint.y, point.x, point.y, tool, settings);
        if (newEl && newEl.type === Tool.ARROW) {
          // Check for start binding
          const startTarget = getBindingTarget(startPoint.x, startPoint.y, elements);
          if (startTarget) {
            (newEl as any).startBinding = createBinding(startTarget, startPoint.x, startPoint.y);
          }
          // Check for end binding
          const endTarget = getBindingTarget(point.x, point.y, elements, newEl.id);
          if (endTarget) {
            (newEl as any).endBinding = createBinding(endTarget, point.x, point.y);
          }
          setElements([...elements, newEl]);
        }
        setBindingTarget(null);
      } else {
        const newEl = createElement(Date.now(), startPoint.x, startPoint.y, point.x, point.y, tool, settings);
        if (newEl) {
          setElements([...elements, newEl]);
        }
      }
    } else if (action === Action.MOVING || action === Action.RESIZING || action === Action.ROTATING) {
      setElements(elements, false); // Commit to history
    }

    setAction(Action.NONE);
    setStartPoint(null);
    setResizeInfo(null);
    setRotationInfo(null);
    setDragPreviewOffset(null);
    setDrawPreviewPoint(null);
    setSnapLines([]);
  }, [elements, action, tool, startPoint, selectionBox, isPanning, settings, getMousePos]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const canvas = interactiveCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(10, zoom * factor));
      const scale = newZoom / zoom;
      setPanOffset(prev => ({
        x: mx - (mx - prev.x) * scale,
        y: my - (my - prev.y) * scale,
      }));
      setZoom(newZoom);
    } else {
      // Scroll pan
      setPanOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, [zoom]);

  const handleContextMenuPrevent = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // ─── Element Operations ─────────────────────────────────────────

  const handleDelete = useCallback(() => {
    selectedElementIds.forEach(id => invalidateCache(id));
    setElements(elements.filter(el => !selectedElementIds.includes(el.id)));
    setSelectedElementIds([]);
  }, [elements, selectedElementIds]);

  const handleCopy = useCallback(() => {
    setClipboard(elements.filter(el => selectedElementIds.includes(el.id)));
  }, [elements, selectedElementIds]);

  const handleCut = useCallback(() => {
    handleCopy();
    handleDelete();
  }, [handleCopy, handleDelete]);

  const handlePaste = useCallback(() => {
    if (clipboard.length === 0) return;
    const baseId = Date.now();
    const pasted = clipboard.map((el, index) => ({
      ...el,
      id: baseId + index,
      x1: el.x1 + 20, y1: el.y1 + 20,
      x2: el.x2 + 20, y2: el.y2 + 20,
      version: 1,
      ...(el.type === Tool.PENCIL && el.points
        ? { points: el.points.map((p: Point) => ({ x: p.x + 20, y: p.y + 20 })) }
        : {}),
    }));
    setElements([...elements, ...pasted]);
    setSelectedElementIds(pasted.map(el => el.id));
  }, [elements, clipboard]);

  const handleDuplicate = useCallback(() => {
    const selected = elements.filter(el => selectedElementIds.includes(el.id));
    const baseId = Date.now();
    const duped = selected.map((el, index) => ({
      ...el,
      id: baseId + index,
      x1: el.x1 + 20, y1: el.y1 + 20,
      x2: el.x2 + 20, y2: el.y2 + 20,
      version: 1,
    }));
    setElements([...elements, ...duped]);
    setSelectedElementIds(duped.map(el => el.id));
  }, [elements, selectedElementIds]);

  const handleBringForward = useCallback(() => {
    if (selectedElementIds.length !== 1) return;
    const id = selectedElementIds[0];
    const idx = elements.findIndex(el => el.id === id);
    if (idx < elements.length - 1) {
      const arr = [...elements];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      setElements(arr);
    }
  }, [elements, selectedElementIds]);

  const handleSendBackward = useCallback(() => {
    if (selectedElementIds.length !== 1) return;
    const id = selectedElementIds[0];
    const idx = elements.findIndex(el => el.id === id);
    if (idx > 0) {
      const arr = [...elements];
      [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
      setElements(arr);
    }
  }, [elements, selectedElementIds]);

  const handleUpdateElements = useCallback((updates: Partial<SketchElement>) => {
    const newElements = elements.map(el => {
      if (selectedElementIds.includes(el.id)) {
        invalidateCache(el.id);
        return { ...el, ...updates, version: el.version + 1 };
      }
      return el;
    });
    setElements(newElements);
  }, [elements, selectedElementIds]);

  // ─── Export / Import ────────────────────────────────────────────

  const handleExportPNG = useCallback(() => {
    const canvas = staticCanvasRef.current;
    if (canvas) exportToPNG(canvas, `drewit-${Date.now()}`);
  }, []);

  const handleExportSVG = useCallback(() => {
    exportToSVG(elements, `drewit-${Date.now()}`);
  }, [elements]);

  const handleExportJSON = useCallback(async () => {
    await localStorageService.exportAsFile(projectName, elements);
  }, [elements, projectName]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportJSON = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromJSON(file);
      if (confirm(`Import "${data.name}" with ${data.elements.length} elements?`)) {
        invalidateAllCaches();
        setElements(data.elements);
        setSelectedElementIds([]);
      }
    } catch (err) {
      alert('Import failed: ' + (err as Error).message);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClear = useCallback(() => {
    if (confirm('Clear entire canvas? This cannot be undone.')) {
      invalidateAllCaches();
      setElements([]);
      setSelectedElementIds([]);
    }
  }, []);

  // ─── Text Editing ───────────────────────────────────────────────

  const handleTextSubmit = useCallback(() => {
    if (!editingText) return;
    const text = textDraft.trim();
    if (text) {
      const newEl = createElement(editingText.id, editingText.x, editingText.y, editingText.x + 200, editingText.y + 30, Tool.TEXT, settings);
      if (newEl && newEl.type === Tool.TEXT) {
        newEl.text = text;
        newEl.originalText = text;
        setElements([...elements, newEl]);
      }
    }
    setEditingText(null);
    setTextDraft('');
    setAction(Action.NONE);
  }, [editingText, elements, settings, textDraft]);

  // ─── Context Menu Items ─────────────────────────────────────────

  const contextMenuItems = [
    { label: 'Copy', action: handleCopy, shortcut: 'Ctrl+C', disabled: selectedElementIds.length === 0 },
    { label: 'Cut', action: handleCut, shortcut: 'Ctrl+X', disabled: selectedElementIds.length === 0 },
    { label: 'Paste', action: handlePaste, shortcut: 'Ctrl+V', disabled: clipboard.length === 0 },
    { label: '', action: () => {}, separator: true },
    { label: 'Duplicate', action: handleDuplicate, shortcut: 'Ctrl+D', disabled: selectedElementIds.length === 0 },
    { label: 'Delete', action: handleDelete, shortcut: 'Del', disabled: selectedElementIds.length === 0 },
    { label: '', action: () => {}, separator: true },
    { label: 'Bring Forward', action: handleBringForward, disabled: selectedElementIds.length !== 1 },
    { label: 'Send Backward', action: handleSendBackward, disabled: selectedElementIds.length !== 1 },
    { label: '', action: () => {}, separator: true },
    { label: 'Select All', action: () => setSelectedElementIds(elements.map(el => el.id)), shortcut: 'Ctrl+A' },
    { label: 'Zoom to Fit', action: handleZoomToFit, disabled: elements.length === 0 },
  ];

  // ─── Selected Elements for Properties ───────────────────────────

  const selectedElements = elements.filter(el => selectedElementIds.includes(el.id));

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="drewit-canvas-container"
      onContextMenu={handleContextMenuPrevent}
    >
      {/* Static canvas (elements) */}
      <canvas ref={staticCanvasRef} className="drewit-canvas-static" />

      {/* Interactive canvas (overlays) */}
      <canvas
        ref={interactiveCanvasRef}
        className="drewit-canvas-interactive"
        style={{
          cursor: isPanning ? 'grabbing'
            : spacePressed ? 'grab'
            : tool === Tool.SELECTION ? 'default'
            : tool === Tool.TEXT ? 'text'
            : 'crosshair',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Welcome screen */}
      {elements.length === 0 && action === Action.NONE && !editingText && (
        <div className="drewit-welcome">
          <h2>Start drawing</h2>
          <p>Select a tool and click on the canvas</p>
          <p>Hold Space + drag to pan • Ctrl + scroll to zoom</p>
        </div>
      )}

      {/* Toolbar */}
      <ExcalidrawToolbar
        activeTool={tool}
        onToolChange={setTool}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onZoomToFit={handleZoomToFit}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(g => !g)}
        selectedCount={selectedElementIds.length}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onExportJSON={handleExportJSON}
        onImport={handleImport}
        onClear={handleClear}
        saveStatus={saveStatus}
        projectName={projectName}
        onBack={() => onBack?.()}
      />

      {/* Properties panel */}
      <ExcalidrawProperties
        selectedElements={selectedElements}
        onUpdate={handleUpdateElements}
        activeTool={tool}
      />

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          top={contextMenu.top}
          left={contextMenu.left}
          onClose={() => setContextMenu(null)}
          items={contextMenuItems}
        />
      )}

      {/* Text editing textarea */}
      {editingText && (
        <textarea
          ref={textInputRef}
          className="drewit-text-editor absolute border-2 border-blue-400 outline-none resize font-virgil select-text pointer-events-auto"
          value={textDraft}
          style={{
            left: `${editingText.x * zoom + panOffset.x}px`,
            top: `${editingText.y * zoom + panOffset.y}px`,
            fontSize: `${(settings.strokeWidth > 2 ? 24 : 20) * zoom}px`,
            color: settings.strokeColor || '#000',
            minWidth: '100px',
            minHeight: '30px',
            zIndex: 1000,
          }}
          onChange={(e) => setTextDraft(e.target.value)}
          onBlur={handleTextSubmit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') {
              setEditingText(null);
              setTextDraft('');
              setAction(Action.NONE);
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleTextSubmit();
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Type text..."
          autoFocus
        />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".drewit,application/json"
        onChange={handleImportJSON}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default DrawingCanvas;
