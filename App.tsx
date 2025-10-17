import React, { useState, useLayoutEffect, useRef, useEffect, useCallback } from 'react';
import rough from 'roughjs/bin/rough';
import { RoughCanvas } from 'roughjs/bin/canvas';
import { Toolbar } from './components/Toolbar';
import { Tool, Action, SketchElement, Point, AppState } from './types';
import { 
  createElement, 
  drawElement, 
  isPointNearElement, 
  getResizedCoordinates, 
  adjustElementCoordinates,
  getElementAtPosition,
  getCursorForPosition,
  resizeElement
} from './services/drawingService';
import { useHistory } from './hooks/useHistory';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    tool: Tool.SELECTION,
    action: Action.NONE,
    selectedElementId: null,
  });
  const [elements, setElements, undo, redo, canUndo, canRedo] = useHistory([]);
  
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // Use a ref for elements to pass into event listeners without causing re-renders
  const elementsRef = useRef(elements);
  elementsRef.current = elements;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const roughCanvas: RoughCanvas = rough.canvas(canvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaledWidth = canvas.width * zoom;
    const scaledHeight = canvas.height * zoom;
    const scaledOffsetX = (scaledWidth - canvas.width) / 2;
    const scaledOffsetY = (scaledHeight - canvas.height) / 2;

    ctx.save();
    ctx.translate(panOffset.x * zoom - scaledOffsetX, panOffset.y * zoom - scaledOffsetY);
    ctx.scale(zoom, zoom);

    elementsRef.current.forEach(element => {
      drawElement(roughCanvas, ctx, element);
      if (appState.selectedElementId === element.id) {
        const margin = 4;
        ctx.strokeStyle = '#0d89ec';
        ctx.lineWidth = 1;
        const [x1, y1, x2, y2] = getResizedCoordinates(element);
        ctx.strokeRect(x1 - margin, y1 - margin, x2 - x1 + margin * 2, y2 - y1 + margin * 2);
      }
    });
    ctx.restore();
  }, [elements, appState.selectedElementId, panOffset, zoom]);
  
  // Load from local storage
  useEffect(() => {
    try {
      const savedElements = localStorage.getItem('sketchboard-elements');
      if (savedElements) {
        const parsedElements = JSON.parse(savedElements);
        if (Array.isArray(parsedElements)) {
          setElements(parsedElements, true);
        }
      }
    } catch (error) {
        console.error("Failed to parse elements from localStorage", error);
        localStorage.removeItem('sketchboard-elements');
    }
  }, [setElements]);

  // Save to local storage
  useEffect(() => {
    if (elements) {
      localStorage.setItem('sketchboard-elements', JSON.stringify(elements));
    }
  }, [elements]);

  useEffect(() => {
    const textArea = textAreaRef.current;
    const canvas = canvasRef.current;
    if (appState.action === Action.WRITING && textArea && canvas) {
        const selectedElement = elements.find(el => el.id === appState.selectedElementId);
        if(selectedElement && selectedElement.type === Tool.TEXT) {
            const scaledWidth = canvas.width * zoom;
            const scaledHeight = canvas.height * zoom;
            const zoomOffsetX = (scaledWidth - canvas.width) / 2;
            const zoomOffsetY = (scaledHeight - canvas.height) / 2;

            const [x1, y1] = getResizedCoordinates(selectedElement);
            textArea.style.top = `${(y1 - 2) * zoom + panOffset.y * zoom - zoomOffsetY}px`;
            textArea.style.left = `${x1 * zoom + panOffset.x * zoom - zoomOffsetX}px`;
            textArea.style.font = `${selectedElement.fontSize * zoom}px Virgil`;
            textArea.focus();
            textArea.value = selectedElement.text || '';
        }
    }
  }, [appState.action, appState.selectedElementId, elements, zoom, panOffset]);


  const getMouseCoordinates = (event: React.MouseEvent<HTMLCanvasElement>): Point => {
    const clientX = event.clientX;
    const clientY = event.clientY;
    const canvas = canvasRef.current!;
    const { left, top } = canvas.getBoundingClientRect();
    const canvasX = clientX - left;
    const canvasY = clientY - top;
    
    const scaledWidth = canvas.width * zoom;
    const scaledHeight = canvas.height * zoom;
    const zoomOffsetX = (scaledWidth - canvas.width) / 2;
    const zoomOffsetY = (scaledHeight - canvas.height) / 2;

    return {
      x: (canvasX - (panOffset.x * zoom - zoomOffsetX)) / zoom,
      y: (canvasY - (panOffset.y * zoom - zoomOffsetY)) / zoom,
    };
  };

  const updateElement = useCallback((id: number, updates: Partial<SketchElement>) => {
    const elementsCopy = [...elementsRef.current];
    const index = elementsCopy.findIndex(el => el.id === id);
    if (index !== -1) {
      const updatedElement = { ...elementsCopy[index], ...updates };
      elementsCopy[index] = updatedElement;
      setElements(elementsCopy, true);
    }
  }, [setElements]);

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (appState.action === Action.WRITING) return;

    const { x, y } = getMouseCoordinates(event);
    
    if (event.button === 1) { // Middle mouse button
      setAppState(prevState => ({ ...prevState, action: Action.PANNING, startPoint: {x, y} }));
      return;
    }

    if (appState.tool === Tool.SELECTION) {
      const element = getElementAtPosition(x, y, elements);
      if (element) {
        const { position } = isPointNearElement(x, y, element);
        const startPoint = { x, y };
        if (position) {
          setAppState({
            action: Action.RESIZING,
            tool: Tool.SELECTION,
            selectedElementId: element.id,
            startPoint,
            resizePosition: position,
          });
        } else {
          setAppState({ action: Action.MOVING, tool: Tool.SELECTION, selectedElementId: element.id, startPoint });
        }
      } else {
        setAppState({ ...appState, selectedElementId: null });
      }
    } else {
      const id = Date.now();
      const newElement = createElement(id, x, y, x, y, appState.tool);
      if (newElement) {
        setElements(prev => [...prev, newElement]);
        setAppState(prevState => ({
          ...prevState,
          action: prevState.tool === Tool.TEXT ? Action.WRITING : Action.DRAWING,
          selectedElementId: id,
          startPoint: { x, y },
        }));
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMouseCoordinates(event);
    
    if(appState.tool === Tool.SELECTION) {
      const element = getElementAtPosition(x, y, elements);
      event.currentTarget.style.cursor = element ? getCursorForPosition(isPointNearElement(x, y, element).position) : 'default';
    }

    if (appState.action === Action.DRAWING) {
      const selectedElement = elementsRef.current.find(el => el.id === appState.selectedElementId);
      if (selectedElement) {
        const { x1, y1 } = selectedElement;
        const updatedElement = { ...selectedElement, x2: x, y2: y };
        if (updatedElement.type === Tool.PENCIL) {
          updatedElement.points = [...(updatedElement.points || [{x: x1, y: y1}]), {x, y}];
        }
        const index = elementsRef.current.findIndex(el => el.id === appState.selectedElementId);
        const elementsCopy = [...elementsRef.current];
        elementsCopy[index] = updatedElement;
        setElements(elementsCopy, true);
      }
    } else if (appState.action === Action.MOVING) {
      const selectedElement = elementsRef.current.find(el => el.id === appState.selectedElementId);
      if (selectedElement && appState.startPoint) {
        const dx = x - appState.startPoint.x;
        const dy = y - appState.startPoint.y;

        if (selectedElement.type === Tool.PENCIL && selectedElement.points) {
          const newPoints = selectedElement.points.map(point => ({ x: point.x + dx, y: point.y + dy }));
          const { minX, minY, maxX, maxY } = newPoints.reduce(
            (acc, p) => ({
              minX: Math.min(acc.minX, p.x),
              minY: Math.min(acc.minY, p.y),
              maxX: Math.max(acc.maxX, p.x),
              maxY: Math.max(acc.maxY, p.y),
            }),
            { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
          );
          updateElement(selectedElement.id, { points: newPoints, x1: minX, y1: minY, x2: maxX, y2: maxY });
        } else if (selectedElement.type !== Tool.PENCIL) {
          const { id, x1, y1, x2, y2 } = selectedElement;
          updateElement(id, { x1: x1 + dx, y1: y1 + dy, x2: x2 + dx, y2: y2 + dy });
        }
        setAppState(prevState => ({ ...prevState, startPoint: { x, y } }));
      }
    } else if (appState.action === Action.RESIZING) {
      const selectedElement = elementsRef.current.find(el => el.id === appState.selectedElementId);
      if (selectedElement && appState.resizePosition) {
        const resized = resizeElement(x, y, appState.resizePosition, selectedElement);
        if (resized) {
          updateElement(selectedElement.id, resized);
        }
      }
    } else if (appState.action === Action.PANNING && appState.startPoint) {
        const dx = (x - appState.startPoint.x);
        const dy = (y - appState.startPoint.y);
        setPanOffset(prev => ({x: prev.x + dx, y: prev.y + dy}));
    }
  };

  const handleMouseUp = () => {
    if (appState.action === Action.DRAWING || appState.action === Action.RESIZING || appState.action === Action.MOVING) {
        const selectedElement = elementsRef.current.find(el => el.id === appState.selectedElementId);
        if (selectedElement) {
            const adjustedElement = adjustElementCoordinates(selectedElement);
            const index = elementsRef.current.findIndex(el => el.id === appState.selectedElementId);
            const elementsCopy = [...elementsRef.current];
            elementsCopy[index] = adjustedElement;
            setElements(elementsCopy, false); // Final state for history
        }
    }
    
    if (appState.action !== Action.WRITING) {
        setAppState(prevState => ({...prevState, action: Action.NONE, resizePosition: undefined }));
    }
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMouseCoordinates(event);
    const element = getElementAtPosition(x, y, elementsRef.current);

    if (element && element.type === Tool.TEXT) {
      setAppState({
        ...appState,
        action: Action.WRITING,
        selectedElementId: element.id,
      });
      event.preventDefault();
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    const selectedElement = elements.find(el => el.id === appState.selectedElementId);
    if (selectedElement && selectedElement.type === Tool.TEXT) {
      const text = event.target.value;
      if (text === '') {
        const elementsCopy = elements.filter(el => el.id !== appState.selectedElementId);
        setElements(elementsCopy, false);
      } else {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
          // Measure text to update element bounds for accurate selection
          ctx.font = `${selectedElement.fontSize}px Virgil`;
          const textMetrics = ctx.measureText(text);
          const width = textMetrics.width;
          const height = selectedElement.fontSize || 24; // Simple approximation for height
          updateElement(appState.selectedElementId!, {
            text,
            x2: selectedElement.x1 + width,
            y2: selectedElement.y1 + height,
          });
        } else {
          // Fallback if context is not available
          updateElement(appState.selectedElementId!, { text });
        }
      }
    }
    setAppState(prevState => ({ ...prevState, action: Action.NONE, selectedElementId: null }));
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    const { deltaY } = event;
    const zoomFactor = 0.99;
    if (deltaY < 0) { // zoom in
        setZoom(prev => Math.min(prev / zoomFactor, 20));
    } else { // zoom out
        setZoom(prev => Math.max(prev * zoomFactor, 0.1));
    }
  };

  const handleClearCanvas = () => {
    setElements([]);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas to draw on without transformations
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    if (elements.length === 0) {
      // If canvas is empty, export a blank canvas of the current view size
      minX = 0; minY = 0;
      maxX = canvas.width; maxY = canvas.height;
    } else {
      elements.forEach(el => {
        const [x1, y1, x2, y2] = getResizedCoordinates(el);
        minX = Math.min(minX, x1);
        minY = Math.min(minY, y1);
        maxX = Math.max(maxX, x2);
        maxY = Math.max(maxY, y2);
      });
    }
    
    const padding = 20;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    tempCanvas.width = width;
    tempCanvas.height = height;

    const roughTempCanvas = rough.canvas(tempCanvas);
    tempCtx.translate(-minX + padding, -minY + padding);

    elements.forEach(el => drawElement(roughTempCanvas, tempCtx, el));
    
    const dataUrl = tempCanvas.toDataURL("image/png");
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = "sketchboard.png";
    a.click();
  };
  
  return (
    <div className="w-screen h-screen bg-gray-100 flex flex-col font-sans">
      <Toolbar 
        tool={appState.tool} 
        setTool={(tool) => setAppState({ ...appState, tool })}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        clearCanvas={handleClearCanvas}
        exportCanvas={handleExport}
      />
      
      {appState.action === Action.WRITING ? (
        <textarea
          ref={textAreaRef}
          onBlur={handleBlur}
          className="absolute p-0 m-0 border-0 outline-none resize-none bg-transparent overflow-hidden whitespace-pre z-10 font-virgil"
        />
      ) : null}

      <canvas
        id="canvas"
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="flex-grow"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        Canvas
      </canvas>
    </div>
  );
};

export default App;