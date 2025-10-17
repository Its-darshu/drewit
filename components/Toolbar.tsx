
import React from 'react';
import { Tool } from '../types';
import { Icon } from './Icon';

interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearCanvas: () => void;
  exportCanvas: () => void;
}

const tools: { name: Tool; icon: string }[] = [
  { name: Tool.SELECTION, icon: 'move' },
  { name: Tool.RECTANGLE, icon: 'rectangle' },
  { name: Tool.ELLIPSE, icon: 'circle' },
  { name: Tool.LINE, icon: 'line' },
  { name: Tool.ARROW, icon: 'arrow' },
  { name: Tool.PENCIL, icon: 'pencil' },
  { name: Tool.TEXT, icon: 'text' },
];

export const Toolbar: React.FC<ToolbarProps> = ({ 
  tool, setTool, undo, redo, canUndo, canRedo, clearCanvas, exportCanvas 
}) => {
  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 mt-4 bg-white rounded-lg shadow-md p-2 flex items-center gap-2">
      <div className="flex items-center gap-2 border-r pr-2 mr-2">
        {tools.map(({ name, icon }) => (
          <button
            key={name}
            onClick={() => setTool(name)}
            className={`p-2 rounded-md hover:bg-gray-100 ${tool === name ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
            aria-label={name.charAt(0) + name.slice(1).toLowerCase()}
          >
            <Icon name={icon} />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 border-r pr-2 mr-2">
        <button 
          onClick={undo} 
          disabled={!canUndo} 
          className="p-2 rounded-md hover:bg-gray-100 text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed"
          aria-label="Undo"
        >
          <Icon name="undo" />
        </button>
        <button 
          onClick={redo} 
          disabled={!canRedo} 
          className="p-2 rounded-md hover:bg-gray-100 text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed"
          aria-label="Redo"
        >
          <Icon name="redo" />
        </button>
      </div>
       <div className="flex items-center gap-2">
        <button 
          onClick={clearCanvas} 
          className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
          aria-label="Clear Canvas"
        >
          <Icon name="trash" />
        </button>
        <button 
          onClick={exportCanvas} 
          className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
          aria-label="Export as PNG"
        >
          <Icon name="export" />
        </button>
      </div>
    </div>
  );
};
