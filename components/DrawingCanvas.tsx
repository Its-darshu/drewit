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
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;

    const endPoint = getMousePos(e);
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
    <div className="w-full h-full flex flex-col">
      <div className="bg-white border-b p-4 flex items-center space-x-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setTool(Tool.RECTANGLE)}
            className={`px-3 py-2 rounded text-sm ${
              tool === Tool.RECTANGLE 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Rectangle
          </button>
          <button
            onClick={() => setTool(Tool.LINE)}
            className={`px-3 py-2 rounded text-sm ${
              tool === Tool.LINE 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setTool(Tool.ELLIPSE)}
            className={`px-3 py-2 rounded text-sm ${
              tool === Tool.ELLIPSE 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Circle
          </button>
        </div>
        
        <div className="flex space-x-2 ml-4">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="px-3 py-2 rounded text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="px-3 py-2 rounded text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Redo
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-2 rounded text-sm bg-red-500 text-white hover:bg-red-600"
          >
            Clear
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        />
      </div>
    </div>
  );
};