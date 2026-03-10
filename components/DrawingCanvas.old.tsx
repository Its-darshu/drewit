import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SketchElement, Tool, Action, Position, PencilElement } from '../types';
import { 
  drawElement, 
  createElement, 
  getElementAtPosition,
  isPointNearElement,
  moveElement,
  resizeElement,
  getCursorForPosition,
  drawSelectionBox,
  drawSelectionBounds,
  getElementsInSelectionBox,
} from '../services/drawingService';
import { 
  exportToPNG, 
  exportToSVG, 
  exportToJSON, 
  exportToPDF,
  importFromJSON 
} from '../services/exportService';
import { useHistory } from '../hooks/useHistory';
import { localStorageService } from '../services/localStorageService';
import { useAuth } from '../hooks/useAuth';
import { useToolSettings } from '../hooks/useToolSettings';
import { ToolSettingsPanel } from './ToolSettingsPanel';
import { ColorPicker } from './ColorPicker';
import rough from 'roughjs/bundled/rough.esm';

interface DrawingCanvasProps {
  projectName: string;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ projectName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();
  const [elements, setElements, undo, redo, canUndo, canRedo] = useHistory<SketchElement>([]);
  const [tool, setTool] = useState<Tool>(Tool.SELECTION);
  const [action, setAction] = useState<Action>(Action.NONE);
  const [selectedElementIds, setSelectedElementIds] = useState<number[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [resizeInfo, setResizeInfo] = useState<{ position: Position; elementId: number } | null>(null);
  const { settings, updateSettings } = useToolSettings();
  const [clipboard, setClipboard] = useState<SketchElement[]>([]);
  const [selectionBoxStart, setSelectionBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const elementsRef = useRef(elements);
  const [resizeTick, setResizeTick] = useState(0);
  
  // Infinite canvas state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  
  // Drag preview state
  const [dragPreviewOffset, setDragPreviewOffset] = useState<{ x: number; y: number } | null>(null);

  // Load project on mount
  useEffect(() => {
    const loadProject = async () => {
      try {
        const result = await localStorageService.loadProject(projectName);
        if (result.success && result.data) {
          setElements(result.data.elements || [], false);
        } else if (!result.success) {
          console.error('Failed to load project:', result.error);
        }
      } catch (error) {
        console.error('Error loading project:', error);
      }
    };
    loadProject();
  }, [projectName]);

  // Keep elementsRef in sync
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  // Enable auto-save
  useEffect(() => {
    localStorageService.enableAutoSave(
      projectName,
      () => elementsRef.current,
      undefined
    );

    return () => {
      localStorageService.disableAutoSave();
    };
  }, [projectName]);

  // Manual save when elements change
  useEffect(() => {
    if (elements.length === 0) return;

    const saveProject = async () => {
      if (savingRef.current) return;
      
      savingRef.current = true;
      setIsSaving(true);
      setSaveStatus('saving');
      localStorageService.markDirty();

      try {
        const result = await localStorageService.saveProject(projectName, elements);
        if (result.success) {
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
          console.error('Save failed:', result.error);
        }
      } catch (error) {
        console.error('Failed to save project:', error);
        setSaveStatus('error');
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    };

    const timeoutId = setTimeout(saveProject, 1000);
    return () => clearTimeout(timeoutId);
  }, [elements, projectName]);

  // Coordinate transformation: screen to canvas
  const screenToCanvas = (screenX: number, screenY: number) => {
    return {
      x: (screenX - panOffset.x) / zoom,
      y: (screenY - panOffset.y) / zoom,
    };
  };

  // Coordinate transformation: canvas to screen
  const canvasToScreen = (canvasX: number, canvasY: number) => {
    return {
      x: canvasX * zoom + panOffset.x,
      y: canvasY * zoom + panOffset.y,
    };
  };

  // Check if element is visible in current viewport
  const isElementVisible = (element: SketchElement, canvas: HTMLCanvasElement): boolean => {
    const rect = canvas.getBoundingClientRect();
    const viewportMinX = -panOffset.x / zoom;
    const viewportMinY = -panOffset.y / zoom;
    const viewportMaxX = (rect.width - panOffset.x) / zoom;
    const viewportMaxY = (rect.height - panOffset.y) / zoom;
    
    // Get element bounds
    const minX = Math.min(element.x1, element.x2);
    const maxX = Math.max(element.x1, element.x2);
    const minY = Math.min(element.y1, element.y2);
    const maxY = Math.max(element.y1, element.y2);
    
    // Add margin for pencil strokes and other elements that might extend beyond bounds
    const margin = 50 / zoom;
    
    // Check if element intersects with viewport
    return !(
      maxX + margin < viewportMinX ||
      minX - margin > viewportMaxX ||
      maxY + margin < viewportMinY ||
      minY - margin > viewportMaxY
    );
  };

  // Rendering with infinite canvas support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Save context state
    ctx.save();
    
    // Apply pan and zoom transformations
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);
    
    // Draw grid for infinite canvas
    drawInfiniteGrid(ctx, rect.width, rect.height);
    
    const roughCanvas = rough.canvas(canvas);
    
    // Draw only visible elements (viewport culling)
    const visibleElements = elements.filter(el => isElementVisible(el, canvas));
    
    visibleElements.forEach(element => {
      drawElement(roughCanvas, ctx, element);
    });

    // Draw selection bounds
    selectedElementIds.forEach(id => {
      const element = elements.find(el => el.id === id);
      if (element && isElementVisible(element, canvas)) {
        drawSelectionBounds(ctx, element);
      }
    });

    // Draw selection box
    if (selectionBoxStart && startPoint) {
      drawSelectionBox(ctx, selectionBoxStart.x, selectionBoxStart.y, startPoint.x, startPoint.y);
    }
    
    // Draw drag preview when moving elements
    if (action === Action.MOVING && dragPreviewOffset && selectedElementIds.length > 0) {
      drawDragPreview(ctx, dragPreviewOffset);
    }
    
    // Restore context state
    ctx.restore();
    
    // Draw viewport info (outside transformation)
    drawViewportInfo(ctx, rect.width, rect.height, visibleElements.length, elements.length);
  }, [elements, selectedElementIds, selectionBoxStart, startPoint, zoom, panOffset, action, dragPreviewOffset, spacePressed]);

  // Handle window resize to maintain canvas responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        setResizeTick(t => t + 1);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Draw drag preview with semi-transparent outline, dimensions, and boundary indicators
  const drawDragPreview = (ctx: CanvasRenderingContext2D, offset: { x: number; y: number }) => {
    const selectedElements = elements.filter(el => selectedElementIds.includes(el.id));
    if (selectedElements.length === 0) return;
    
    // Calculate bounding box of all selected elements
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    selectedElements.forEach(element => {
      const bounds = getElementBounds(element);
      minX = Math.min(minX, bounds.x1);
      minY = Math.min(minY, bounds.y1);
      maxX = Math.max(maxX, bounds.x2);
      maxY = Math.max(maxY, bounds.y2);
    });
    
    // Apply drag offset to bounding box
    const previewMinX = minX + offset.x;
    const previewMinY = minY + offset.y;
    const previewMaxX = maxX + offset.x;
    const previewMaxY = maxY + offset.y;
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Draw semi-transparent bounding box
    ctx.save();
    
    // Dashed boundary lines
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    ctx.strokeRect(previewMinX, previewMinY, width, height);
    
    // Semi-transparent fill
    ctx.fillStyle = 'rgba(74, 144, 226, 0.1)';
    ctx.fillRect(previewMinX, previewMinY, width, height);
    
    // Corner handles
    const handleSize = 8 / zoom;
    const corners = [
      { x: previewMinX, y: previewMinY }, // Top-left
      { x: previewMaxX, y: previewMinY }, // Top-right
      { x: previewMinX, y: previewMaxY }, // Bottom-left
      { x: previewMaxX, y: previewMaxY }, // Bottom-right
    ];
    
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([]);
    
    corners.forEach(corner => {
      ctx.fillRect(
        corner.x - handleSize / 2,
        corner.y - handleSize / 2,
        handleSize,
        handleSize
      );
      ctx.strokeRect(
        corner.x - handleSize / 2,
        corner.y - handleSize / 2,
        handleSize,
        handleSize
      );
    });
    
    // Draw dimension labels
    ctx.fillStyle = '#4A90E2';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3 / zoom;
    ctx.font = `${12 / zoom}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Width label (top center)
    const widthText = `${Math.round(width)}px`;
    const widthX = previewMinX + width / 2;
    const widthY = previewMinY - 15 / zoom;
    ctx.strokeText(widthText, widthX, widthY);
    ctx.fillText(widthText, widthX, widthY);
    
    // Height label (left center)
    const heightText = `${Math.round(height)}px`;
    const heightX = previewMinX - 20 / zoom;
    const heightY = previewMinY + height / 2;
    ctx.save();
    ctx.translate(heightX, heightY);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeText(heightText, 0, 0);
    ctx.fillText(heightText, 0, 0);
    ctx.restore();
    
    // Position label (inside box, top-left)
    const posText = `(${Math.round(previewMinX)}, ${Math.round(previewMinY)})`;
    ctx.font = `${10 / zoom}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const posX = previewMinX + 5 / zoom;
    const posY = previewMinY + 5 / zoom;
    ctx.strokeText(posText, posX, posY);
    ctx.fillText(posText, posX, posY);
    
    // Draw semi-transparent preview of actual elements
    ctx.globalAlpha = 0.5;
    const roughCanvas = canvasRef.current ? rough.canvas(canvasRef.current) : null;
    if (!roughCanvas) return;
    selectedElements.forEach(element => {
      const movedElement = moveElement(element, offset.x, offset.y);
      drawElement(roughCanvas, ctx, movedElement);
    });
    
    ctx.restore();
  };
  
  // Helper function to get element bounding box
  const getElementBounds = (element: SketchElement) => {
    if (element.type === Tool.PENCIL) {
      const points = element.points || [];
      if (points.length === 0) return { x1: 0, y1: 0, x2: 0, y2: 0 };
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
      return { x1: minX, y1: minY, x2: maxX, y2: maxY };
    }
    
    return {
      x1: Math.min(element.x1, element.x2),
      y1: Math.min(element.y1, element.y2),
      x2: Math.max(element.x1, element.x2),
      y2: Math.max(element.y1, element.y2),
    };
  };
  
  // Draw infinite grid
  const drawInfiniteGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20; // Base grid size in canvas units
    const viewportMinX = -panOffset.x / zoom;
    const viewportMinY = -panOffset.y / zoom;
    const viewportMaxX = (width - panOffset.x) / zoom;
    const viewportMaxY = (height - panOffset.y) / zoom;
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5 / zoom;
    
    // Draw vertical lines
    const startX = Math.floor(viewportMinX / gridSize) * gridSize;
    for (let x = startX; x <= viewportMaxX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, viewportMinY);
      ctx.lineTo(x, viewportMaxY);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    const startY = Math.floor(viewportMinY / gridSize) * gridSize;
    for (let y = startY; y <= viewportMaxY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(viewportMinX, y);
      ctx.lineTo(viewportMaxX, y);
      ctx.stroke();
    }
    
    // Draw origin axes
    ctx.strokeStyle = '#ff000040';
    ctx.lineWidth = 1 / zoom;
    
    // X-axis
    if (viewportMinY <= 0 && viewportMaxY >= 0) {
      ctx.beginPath();
      ctx.moveTo(viewportMinX, 0);
      ctx.lineTo(viewportMaxX, 0);
      ctx.stroke();
    }
    
    // Y-axis
    if (viewportMinX <= 0 && viewportMaxX >= 0) {
      ctx.beginPath();
      ctx.moveTo(0, viewportMinY);
      ctx.lineTo(0, viewportMaxY);
      ctx.stroke();
    }
  };

  // Draw viewport info
  const drawViewportInfo = (ctx: CanvasRenderingContext2D, width: number, height: number, visible: number, total: number) => {
    ctx.save();
    ctx.fillStyle = '#00000080';
    ctx.font = '14px monospace';
    const info = `Zoom: ${(zoom * 100).toFixed(0)}% | Pan: (${Math.round(panOffset.x)}, ${Math.round(panOffset.y)}) | Elements: ${visible}/${total}`;
    ctx.fillText(info, 10, height - 10);
    
    // Show pan mode indicator
    if (spacePressed) {
      ctx.fillStyle = '#4A90E2';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🖐️ PAN MODE - Drag to move canvas', width / 2, 30);
      ctx.textAlign = 'left';
    }
    
    // Add help text for infinite canvas controls
    if (elements.length === 0 && zoom === 1 && panOffset.x === 0 && panOffset.y === 0) {
      ctx.fillStyle = '#666666';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('∞ Infinite Canvas - Draw Anywhere!', width / 2, height / 2 - 70);
      ctx.font = '16px Arial';
      ctx.fillStyle = '#888888';
      ctx.fillText('Hold SPACEBAR + Drag to Pan', width / 2, height / 2 - 30);
      ctx.fillText('CTRL + Mouse Wheel to Zoom', width / 2, height / 2);
      ctx.fillText('CTRL + / - / 0 for Zoom In/Out/Reset', width / 2, height / 2 + 30);
      ctx.fillStyle = '#999999';
      ctx.font = '14px Arial';
      ctx.fillText('Try zooming out and panning to explore unlimited space!', width / 2, height / 2 + 60);
      ctx.textAlign = 'left';
    }
    
    ctx.restore();
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // Transform screen coordinates to canvas coordinates (accounting for pan/zoom)
    return screenToCanvas(screenX, screenY);
  };

  // Zoom functions
  const handleZoomIn = () => {
    setZoom(prevZoom => Math.min(prevZoom * 1.2, 5)); // Max 500% zoom
  };

  const handleZoomOut = () => {
    setZoom(prevZoom => Math.max(prevZoom / 1.2, 0.1)); // Min 10% zoom
  };

  const handleZoomReset = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      
      // Spacebar for pan mode
      if (e.key === ' ' && !spacePressed && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        console.log('Spacebar pressed - Pan mode ON');
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
      // Zoom controls
      else if (ctrl && (e.key === '=' || e.key === '+')) {
        handleZoomIn();
        e.preventDefault();
      }
      else if (ctrl && (e.key === '-' || e.key === '_')) {
        handleZoomOut();
        e.preventDefault();
      }
      else if (ctrl && e.key === '0') {
        handleZoomReset();
        e.preventDefault();
      }
      // Tool shortcuts
      else if (!ctrl && !spacePressed) {
        if (e.key === 'v') setTool(Tool.SELECTION);
        else if (e.key === 'r') setTool(Tool.RECTANGLE);
        else if (e.key === 'c') setTool(Tool.ELLIPSE);
        else if (e.key === 'd') setTool(Tool.DIAMOND);
        else if (e.key === 'l') setTool(Tool.LINE);
        else if (e.key === 'a') setTool(Tool.ARROW);
        else if (e.key === 'p') setTool(Tool.PENCIL);
        else if (e.key === 't') setTool(Tool.TEXT);
        else if (e.key === 'e') setTool(Tool.ERASER);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        console.log('Spacebar released - Pan mode OFF');
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
  }, [selectedElementIds, elements, clipboard, undo, redo, spacePressed, zoom, tool]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Pan mode when spacebar is pressed
    if (spacePressed) {
      console.log('Starting pan from:', e.clientX, e.clientY);
      setIsPanning(true);
      const rect = canvas.getBoundingClientRect();
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    const point = getMousePos(e);
    setStartPoint(point);

    if (tool === Tool.ERASER) {
      // Eraser mode - delete element on click
      const clickedElement = getElementAtPosition(point.x, point.y, elements);
      if (clickedElement) {
        const newElements = elements.filter(el => el.id !== clickedElement.id);
        setElements(newElements);
      }
      setAction(Action.DRAWING); // Use drawing action for continuous erasing
    } else if (tool === Tool.SELECTION) {
      const clickedElement = getElementAtPosition(point.x, point.y, elements);
      
      if (clickedElement) {
        const { position } = isPointNearElement(point.x, point.y, clickedElement);
        
        // Check if clicking on resize handle
        if (position && position !== 'inside') {
          setAction(Action.RESIZING);
          setResizeInfo({ position, elementId: clickedElement.id });
          return;
        }
        
        // Select or add to selection
        if (e.shiftKey) {
          if (selectedElementIds.includes(clickedElement.id)) {
            setSelectedElementIds(prev => prev.filter(id => id !== clickedElement.id));
          } else {
            setSelectedElementIds(prev => [...prev, clickedElement.id]);
          }
        } else {
          if (!selectedElementIds.includes(clickedElement.id)) {
            setSelectedElementIds([clickedElement.id]);
          }
          setAction(Action.MOVING);
          setDragPreviewOffset({ x: 0, y: 0 }); // Initialize drag preview
        }
      } else {
        // Start selection box
        if (!e.shiftKey) {
          setSelectedElementIds([]);
        }
        setAction(Action.SELECTING);
        setSelectionBoxStart(point);
      }
    } else if (tool === Tool.PENCIL) {
      setAction(Action.DRAWING);
      const newElement = createElement(
        Date.now(),
        point.x,
        point.y,
        point.x,
        point.y,
        tool,
        settings
      );
      
      if (newElement && newElement.type === Tool.PENCIL) {
        // Initialize pencil with the actual starting point, not (0,0)
        const pencilElement = newElement as PencilElement;
        pencilElement.points = [{ x: point.x, y: point.y }];
        setElements([...elements, pencilElement], true);
      }
    } else {
      setAction(Action.DRAWING);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle panning
    if (isPanning && panStart) {
      const newPanOffset = {
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      };
      setPanOffset(newPanOffset);
      return;
    }

    if (!startPoint) return;

    const currentPoint = getMousePos(e);
    
    if (tool === Tool.ERASER && action === Action.DRAWING) {
      // Continue erasing on drag
      const hoveredElement = getElementAtPosition(currentPoint.x, currentPoint.y, elements);
      if (hoveredElement) {
        const newElements = elements.filter(el => el.id !== hoveredElement.id);
        setElements(newElements, true);
      }
    } else if (action === Action.MOVING && selectedElementIds.length > 0) {
      const offsetX = currentPoint.x - startPoint.x;
      const offsetY = currentPoint.y - startPoint.y;
      
      // Update drag preview offset
      setDragPreviewOffset({ x: offsetX, y: offsetY });
      
      const newElements = elements.map(element => {
        if (selectedElementIds.includes(element.id)) {
          return moveElement(element, offsetX, offsetY);
        }
        return element;
      });
      
      setElements(newElements, true);
      setStartPoint(currentPoint);
    } else if (action === Action.RESIZING && resizeInfo) {
      const element = elements.find(el => el.id === resizeInfo.elementId);
      if (element) {
        const updates = resizeElement(currentPoint.x, currentPoint.y, resizeInfo.position, element);
        if (updates) {
          const newElements = elements.map(el =>
            el.id === resizeInfo.elementId ? { ...el, ...updates } : el
          );
          setElements(newElements, true);
        }
      }
    } else if (action === Action.SELECTING && selectionBoxStart) {
      // Update selection box visual
      setStartPoint(currentPoint);
    } else if (action === Action.DRAWING) {
      if (tool === Tool.PENCIL) {
        const lastElement = elements[elements.length - 1];
        if (lastElement && lastElement.type === Tool.PENCIL) {
          const newElements = [...elements];
          const currentPoints = lastElement.points || [];
          
          // Validate point before adding: prevent (0,0) and duplicate consecutive points
          const shouldAddPoint = !(currentPoint.x === 0 && currentPoint.y === 0) && (
            currentPoints.length === 0 ||
            (currentPoints[currentPoints.length - 1].x !== currentPoint.x ||
             currentPoints[currentPoints.length - 1].y !== currentPoint.y)
          );
          
          if (shouldAddPoint) {
            const updatedElement = {
              ...lastElement,
              points: [...currentPoints, currentPoint],
              x2: currentPoint.x,
              y2: currentPoint.y
            };
            newElements[newElements.length - 1] = updatedElement;
            setElements(newElements, true);
          }
        }
      }
    }

    // Update cursor based on hover
    if (tool === Tool.SELECTION && !action) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const hoveredElement = getElementAtPosition(currentPoint.x, currentPoint.y, elements);
      if (hoveredElement) {
        const { position } = isPointNearElement(currentPoint.x, currentPoint.y, hoveredElement);
        canvas.style.cursor = position ? getCursorForPosition(position) : 'default';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    // Zoom with Ctrl+Wheel
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate zoom change
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));
      
      console.log(`Zoom: ${(zoom * 100).toFixed(0)}% → ${(newZoom * 100).toFixed(0)}%`);
      
      // Zoom towards mouse position
      const scale = newZoom / zoom;
      setPanOffset(prev => ({
        x: mouseX - (mouseX - prev.x) * scale,
        y: mouseY - (mouseY - prev.y) * scale,
      }));
      setZoom(newZoom);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Stop panning
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (!startPoint) return;

    const endPoint = getMousePos(e);
    
    if (action === Action.SELECTING && selectionBoxStart) {
      const selectedElements = getElementsInSelectionBox(
        selectionBoxStart.x,
        selectionBoxStart.y,
        endPoint.x,
        endPoint.y,
        elements
      );
      
      if (e.shiftKey) {
        setSelectedElementIds(prev => [
          ...prev,
          ...selectedElements.filter(el => !prev.includes(el.id)).map(el => el.id)
        ]);
      } else {
        setSelectedElementIds(selectedElements.map(el => el.id));
      }
      
      setSelectionBoxStart(null);
    } else if (action === Action.DRAWING && tool !== Tool.PENCIL) {
      const newElement = createElement(
        Date.now(),
        startPoint.x,
        startPoint.y,
        endPoint.x,
        endPoint.y,
        tool,
        settings
      );

      if (newElement) {
        setElements([...elements, newElement]);
      }
    } else if (action === Action.MOVING || action === Action.RESIZING) {
      // Finalize the move/resize
      setElements(elements, false);
    }

    setAction(Action.NONE);
    setStartPoint(null);
    setResizeInfo(null);
    setDragPreviewOffset(null);
  };

  const handleDelete = () => {
    const newElements = elements.filter(el => !selectedElementIds.includes(el.id));
    setElements(newElements);
    setSelectedElementIds([]);
  };

  const handleCopy = () => {
    const selected = elements.filter(el => selectedElementIds.includes(el.id));
    setClipboard(selected);
  };

  const handleCut = () => {
    handleCopy();
    handleDelete();
  };

  const handlePaste = () => {
    if (clipboard.length === 0) return;
    
    const baseId = Date.now();
    const newElements = clipboard.map((element, index) => ({
      ...element,
      id: baseId + index,
      x1: element.x1 + 20,
      y1: element.y1 + 20,
      x2: element.x2 + 20,
      y2: element.y2 + 20,
      ...(element.type === Tool.PENCIL && element.points
        ? { points: element.points.map(p => ({ x: p.x + 20, y: p.y + 20 })) }
        : {}),
    }));
    
    setElements([...elements, ...newElements]);
    setSelectedElementIds(newElements.map(el => el.id));
  };

  const handleBringForward = () => {
    if (selectedElementIds.length !== 1) return;
    const id = selectedElementIds[0];
    const index = elements.findIndex(el => el.id === id);
    if (index < elements.length - 1) {
      const newElements = [...elements];
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
      setElements(newElements);
    }
  };

  const handleSendBackward = () => {
    if (selectedElementIds.length !== 1) return;
    const id = selectedElementIds[0];
    const index = elements.findIndex(el => el.id === id);
    if (index > 0) {
      const newElements = [...elements];
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
      setElements(newElements);
    }
  };

  const handleClear = () => {
    if (confirm('Clear entire canvas? This cannot be undone.')) {
      setElements([]);
      setSelectedElementIds([]);
    }
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    exportToPNG(canvas, `drewit-${Date.now()}`);
    setShowExportMenu(false);
  };

  const handleExportSVG = () => {
    exportToSVG(elements, `drewit-${Date.now()}`);
    setShowExportMenu(false);
  };

  const handleExportJSON = async () => {
    // Use local storage service to export if available
    await localStorageService.exportAsFile(projectName, elements);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    exportToPDF(canvas, `drewit-${Date.now()}`);
    setShowExportMenu(false);
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromJSON(file);
      if (confirm(`Import "${data.name}" with ${data.elements.length} elements? This will replace current drawing.`)) {
        setElements(data.elements);
        setSelectedElementIds([]);
      }
    } catch (error) {
      alert('Failed to import file: ' + (error as Error).message);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative bg-gray-50">
      {/* Top Toolbar - Tools */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex items-center space-x-1">
          {/* Save Status Indicator */}
          <div className="px-3 py-2 text-sm flex items-center space-x-2">
            {saveStatus === 'saving' && (
              <>
                <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full"></div>
                <span className="text-gray-600">Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <span className="text-green-500">✓</span>
                <span className="text-gray-600">Saved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <span className="text-red-500">⚠</span>
                <span className="text-red-600">Save failed</span>
              </>
            )}
          </div>
          
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          
          {/* Drawing Tools */}
          <div className="flex space-x-1">
            <ToolButton tool={Tool.SELECTION} currentTool={tool} setTool={setTool} icon="cursor" title="Select (V)" />
            <ToolButton tool={Tool.RECTANGLE} currentTool={tool} setTool={setTool} icon="rectangle" title="Rectangle (R)" />
            <ToolButton tool={Tool.ELLIPSE} currentTool={tool} setTool={setTool} icon="circle" title="Circle (C)" />
            <ToolButton tool={Tool.DIAMOND} currentTool={tool} setTool={setTool} icon="diamond" title="Diamond (D)" />
            <ToolButton tool={Tool.LINE} currentTool={tool} setTool={setTool} icon="line" title="Line (L)" />
            <ToolButton tool={Tool.ARROW} currentTool={tool} setTool={setTool} icon="arrow" title="Arrow (A)" />
            <ToolButton tool={Tool.PENCIL} currentTool={tool} setTool={setTool} icon="pencil" title="Pencil (P)" />
            <ToolButton tool={Tool.TEXT} currentTool={tool} setTool={setTool} icon="text" title="Text (T)" />
            <ToolButton tool={Tool.ERASER} currentTool={tool} setTool={setTool} icon="eraser" title="Eraser (E)" />
          </div>
          
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          
          {/* Action buttons */}
          <div className="flex space-x-1">
            <ActionButton onClick={undo} disabled={!canUndo} icon="undo" title="Undo (Ctrl+Z)" />
            <ActionButton onClick={redo} disabled={!canRedo} icon="redo" title="Redo (Ctrl+Y)" />
          </div>

          {selectedElementIds.length > 0 && (
            <>
              <div className="w-px h-6 bg-gray-300 mx-2"></div>
              <div className="flex space-x-1">
                <ActionButton onClick={handleBringForward} icon="bring-forward" title="Bring Forward" />
                <ActionButton onClick={handleSendBackward} icon="send-backward" title="Send Backward" />
                <ActionButton onClick={handleDelete} icon="trash" title="Delete (Del)" />
              </div>
            </>
          )}

          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          
          <div className="flex space-x-1 relative">
            <ActionButton 
              onClick={() => setShowExportMenu(!showExportMenu)} 
              icon="download" 
              title="Export" 
            />
            <ActionButton 
              onClick={() => fileInputRef.current?.click()} 
              icon="upload" 
              title="Import" 
            />
            <ActionButton onClick={handleClear} icon="clear" title="Clear Canvas" />
            
            {/* Export Menu */}
            {showExportMenu && (
              <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 min-w-[160px]">
                <button
                  onClick={handleExportPNG}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                >
                  <span>📷</span>
                  <span>Export as PNG</span>
                </button>
                <button
                  onClick={handleExportSVG}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                >
                  <span>🎨</span>
                  <span>Export as SVG</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                >
                  <span>💾</span>
                  <span>Export as .drewit</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                >
                  <span>📄</span>
                  <span>Print as PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".drewit,application/json"
        onChange={handleImportJSON}
        style={{ display: 'none' }}
      />

      {/* Settings Panel */}
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-10">
        <ToolSettingsPanel settings={settings} onUpdateSettings={updateSettings} />
      </div>
      
      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ 
            cursor: isPanning 
              ? 'grabbing' 
              : spacePressed 
                ? 'grab' 
                : tool === Tool.SELECTION 
                  ? 'default' 
                  : 'crosshair' 
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        />
      </div>

      {/* Info panel */}
      {selectedElementIds.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md px-4 py-2 text-sm text-gray-600">
          {selectedElementIds.length} element{selectedElementIds.length > 1 ? 's' : ''} selected
        </div>
      )}
      
      {/* Test Infinite Canvas Button */}
      {elements.length === 0 && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md px-4 py-3">
          <button
            onClick={() => {
              // Create test elements at various distant coordinates
              const testElements: SketchElement[] = [
                // Origin
                createElement(1, 0, 0, 100, 100, Tool.RECTANGLE, settings),
                // Far right
                createElement(2, 1000, 0, 1100, 100, Tool.ELLIPSE, settings),
                // Far down
                createElement(3, 0, 1000, 100, 1100, Tool.DIAMOND, settings),
                // Far diagonal
                createElement(4, 2000, 2000, 2100, 2100, Tool.RECTANGLE, settings),
                // Negative coordinates (up-left)
                createElement(5, -500, -500, -400, -400, Tool.ELLIPSE, settings),
                // Text markers
                createElement(6, 0, -100, 100, -50, Tool.LINE, settings),
              ];
              setElements(testElements, false);
              alert('✅ Created test elements at various coordinates!\n\n' +
                '- Origin (0, 0)\n' +
                '- Far right (1000, 0)\n' +
                '- Far down (0, 1000)\n' +
                '- Far diagonal (2000, 2000)\n' +
                '- Negative coords (-500, -500)\n\n' +
                'Use Spacebar + Drag to pan and find them all!\n' +
                'Use Ctrl + Mouse Wheel to zoom out and see the big picture!');
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
          >
            🧪 Test Infinite Canvas
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Creates elements at distant coordinates
          </p>
        </div>
      )}
    </div>
  );
};

// Helper components
const ToolButton = ({ tool, currentTool, setTool, icon, title }: any) => (
  <button
    onClick={() => setTool(tool)}
    className={`p-3 rounded-lg transition-all ${
      tool === currentTool 
        ? 'bg-blue-600 text-white shadow-sm' 
        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
    }`}
    title={title}
  >
    <ToolIcon name={icon} />
  </button>
);

const ActionButton = ({ onClick, disabled, icon, title }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="p-3 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
    title={title}
  >
    <ToolIcon name={icon} />
  </button>
);

const ToolIcon = ({ name }: { name: string }) => {
  const icons: Record<string, React.ReactElement> = {
    cursor: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    rectangle: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/></svg>,
    circle: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/></svg>,
    diamond: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 2l10 10-10 10L2 12 12 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    line: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" strokeWidth="2"/></svg>,
    arrow: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 12h14m-7-7l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    pencil: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m18 2 4 4-14 14H4v-4L18 2z" strokeWidth="2"/></svg>,
    text: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 7V4h16v3M9 20h6M12 4v16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    eraser: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 2l6 6-10 10H6l-4-4 10-10 4-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    undo: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v6h6m-3-3a9 9 0 0 1 9-9 9 9 0 0 1 9 9 9 9 0 0 1-9 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    redo: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m21 7-6-6v4a9 9 0 0 0-9 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    trash: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 6h18l-2 13H5L3 6z" strokeWidth="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="2"/></svg>,
    download: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5l5 5 5-5m-5 5V3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    upload: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m14-7l-5-5-5 5m5-5v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    clear: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'bring-forward': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16V4m0 0L3 8m4-4l4 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 20H8" strokeWidth="2" strokeLinecap="round"/></svg>,
    'send-backward': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 8v12m0 0l-4-4m4 4l4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 4H8" strokeWidth="2" strokeLinecap="round"/></svg>,
  };
  return icons[name] || <div className="w-5 h-5" />;
};
