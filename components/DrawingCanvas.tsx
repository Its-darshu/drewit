import React, { useRef, useEffect, useState } from 'react';
import { SketchElement, Tool } from '../types';
import { drawElement, createElement } from '../services/drawingService';
import { useHistory } from '../hooks/useHistory';
import rough from 'roughjs/bundled/rough.esm';

// DrawingCanvas component for the sketch interface
export const DrawingCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements, undo, redo, canUndo, canRedo] = useHistory<SketchElement>([]);
  const [tool, setTool] = useState<Tool>(Tool.RECTANGLE);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Clear and redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create rough canvas
    const roughCanvas = rough.canvas(canvas);
    
    // Draw all elements
    elements.forEach(element => {
      drawElement(roughCanvas, ctx, element);
    });
  }, [elements]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(e);
    setIsDrawing(true);
    setStartPoint(point);
    
    if (tool === Tool.PENCIL) {
      // Start a new pencil stroke
      const newElement = createElement(
        Date.now(),
        point.x,
        point.y,
        point.x,
        point.y,
        tool
      );
      
      if (newElement) {
        const newElements = [...elements, newElement];
        setElements(newElements, true);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;

    const currentPoint = getMousePos(e);
    
    if (tool === Tool.PENCIL) {
      // For pencil, add points continuously
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
        setElements(newElements, true); // overwrite for smooth drawing
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;

    const endPoint = getMousePos(e);
    
    if (tool === Tool.PENCIL) {
      // Pencil drawing is already handled, just finalize
      setElements(elements, false); // Finalize for history
    } else {
      // For other tools, create element on mouse up
      const newElement = createElement(
        Date.now(),
        startPoint.x,
        startPoint.y,
        endPoint.x,
        endPoint.y,
        tool
      );

      if (newElement) {
        const newElements = [...elements, newElement];
        setElements(newElements);
      }
    }

    setIsDrawing(false);
    setStartPoint(null);
  };

  const handleUndo = () => {
    undo();
  };

  const handleRedo = () => {
    redo();
  };

  const handleClear = () => {
    setElements([]);
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Centered floating toolbar */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex items-center space-x-1">
          {/* Drawing Tools */}
          <div className="flex space-x-1">
            <button
              onClick={() => setTool(Tool.RECTANGLE)}
              className={`p-3 rounded-lg transition-all ${
                tool === Tool.RECTANGLE 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              title="Rectangle"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
              </svg>
            </button>
            <button
              onClick={() => setTool(Tool.LINE)}
              className={`p-3 rounded-lg transition-all ${
                tool === Tool.LINE 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              title="Line"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2"/>
              </svg>
            </button>
            <button
              onClick={() => setTool(Tool.ELLIPSE)}
              className={`p-3 rounded-lg transition-all ${
                tool === Tool.ELLIPSE 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              title="Circle"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              </svg>
            </button>
            <button
              onClick={() => setTool(Tool.PENCIL)}
              className={`p-3 rounded-lg transition-all ${
                tool === Tool.PENCIL 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              title="Pencil"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="m18 2 4 4-14 14H4v-4L18 2z" strokeWidth="2"/>
              </svg>
            </button>
          </div>
          
          {/* Divider */}
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          
          {/* Action buttons */}
          <div className="flex space-x-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-3 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Undo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 7v6h6" strokeWidth="2"/>
                <path d="m21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" strokeWidth="2"/>
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-3 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Redo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="m21 7-6-6v4a9 9 0 00-9 9 9 9 0 006-2.3l3 3.3" strokeWidth="2"/>
              </svg>
            </button>
            <button
              onClick={handleClear}
              className="p-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all"
              title="Clear Canvas"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 6h18l-2 13H5L3 6z" strokeWidth="2"/>
                <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeWidth="2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Canvas */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>
    </div>
  );
};