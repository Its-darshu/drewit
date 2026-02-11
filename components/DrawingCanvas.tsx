import React, { useRef, useEffect, useState } from 'react';
import { SketchElement, Tool, Action, Position } from '../types';
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
import { boardService } from '../services/boardService';
import { useAuth } from '../hooks/useAuth';
import { useToolSettings } from '../hooks/useToolSettings';
import { ToolSettingsPanel } from './ToolSettingsPanel';
import { ColorPicker } from './ColorPicker';
import rough from 'roughjs/bundled/rough.esm';

interface DrawingCanvasProps {
  boardId?: string;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ boardId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();
  const [elements, setElements, undo, redo, canUndo, canRedo] = useHistory<SketchElement>([]);
  const [tool, setTool] = useState<Tool>(Tool.SELECTION);
  const [action, setAction] = useState<Action>(Action.NONE);
  const [selectedElementIds, setSelectedElementIds] = useState<number[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [resizeInfo, setResizeInfo] = useState<{ position: Position; elementId: number } | null>(null);
  const { settings, updateSettings } = useToolSettings();
  const [clipboard, setClipboard] = useState<SketchElement[]>([]);
  const [selectionBoxStart, setSelectionBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load board data when boardId changes
  useEffect(() => {
    if (boardId && user) {
      const loadBoard = async () => {
        try {
          const board = await boardService.getBoard(boardId);
          if (board && board.elements) {
            setElements(board.elements, false);
          }
        } catch (error) {
          console.error('Failed to load board:', error);
        }
      };
      loadBoard();
    }
  }, [boardId, user]);

  // Auto-save when elements change
  useEffect(() => {
    if (boardId && user && elements.length > 0) {
      const saveBoard = async () => {
        if (isSaving) return;
        
        setIsSaving(true);
        try {
          await boardService.updateBoardElements(boardId, elements);
        } catch (error) {
          console.error('Failed to save board:', error);
        } finally {
          setIsSaving(false);
        }
      };

      const timeoutId = setTimeout(saveBoard, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [elements, boardId, user, isSaving]);

  // Rendering
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const roughCanvas = rough.canvas(canvas);
    
    // Draw all elements
    elements.forEach(element => {
      drawElement(roughCanvas, ctx, element);
    });

    // Draw selection bounds
    selectedElementIds.forEach(id => {
      const element = elements.find(el => el.id === id);
      if (element) {
        drawSelectionBounds(ctx, element);
      }
    });

    // Draw selection box
    if (selectionBoxStart && startPoint) {
      drawSelectionBox(ctx, selectionBoxStart.x, selectionBoxStart.y, startPoint.x, startPoint.y);
    }
  }, [elements, selectedElementIds, selectionBoxStart, startPoint]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      
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
      // Tool shortcuts
      else if (!ctrl) {
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, elements, clipboard, undo, redo]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
      
      if (newElement) {
        setElements([...elements, newElement], true);
      }
    } else {
      setAction(Action.DRAWING);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
          const updatedElement = {
            ...lastElement,
            points: [...(lastElement.points || []), currentPoint],
            x2: currentPoint.x,
            y2: currentPoint.y
          };
          newElements[newElements.length - 1] = updatedElement;
          setElements(newElements, true);
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

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
    
    const newElements = clipboard.map(element => ({
      ...element,
      id: Date.now() + Math.random(),
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

  const handleExportJSON = () => {
    exportToJSON(elements, `drewit-${Date.now()}`);
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
          {isSaving && (
            <div className="px-3 py-2 text-sm text-gray-600 flex items-center space-x-2">
              <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full"></div>
              <span>Saving...</span>
            </div>
          )}
          
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
          style={{ cursor: tool === Tool.SELECTION ? 'default' : 'crosshair' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>

      {/* Info panel */}
      {selectedElementIds.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md px-4 py-2 text-sm text-gray-600">
          {selectedElementIds.length} element{selectedElementIds.length > 1 ? 's' : ''} selected
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
