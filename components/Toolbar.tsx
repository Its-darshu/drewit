import React, { useState } from 'react';
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
  onGroup?: () => void;
  onUngroup?: () => void;
  onAlignLeft?: () => void;
  onAlignRight?: () => void;
  onAlignTop?: () => void;
  onAlignBottom?: () => void;
  onAlignCenterH?: () => void;
  onAlignCenterV?: () => void;
  onDistributeH?: () => void;
  onDistributeV?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onToggleGrid?: () => void;
  onToggleSnapToGrid?: () => void;
  gridEnabled?: boolean;
  snapToGridEnabled?: boolean;
  selectedCount: number;
  zoom: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
}

const tools: { name: Tool; icon: string; label: string }[] = [
  { name: Tool.SELECTION, icon: 'move', label: 'Select (V)' },
  { name: Tool.RECTANGLE, icon: 'rectangle', label: 'Rectangle (R)' },
  { name: Tool.ELLIPSE, icon: 'circle', label: 'Ellipse (C)' },
  { name: Tool.DIAMOND, icon: 'diamond', label: 'Diamond (D)' },
  { name: Tool.LINE, icon: 'line', label: 'Line (L)' },
  { name: Tool.ARROW, icon: 'arrow', label: 'Arrow (A)' },
  { name: Tool.PENCIL, icon: 'pencil', label: 'Pencil (P)' },
  { name: Tool.TEXT, icon: 'text', label: 'Text (T)' },
  { name: Tool.ERASER, icon: 'eraser', label: 'Eraser (E)' },
];

export const Toolbar: React.FC<ToolbarProps> = ({ 
  tool, setTool, undo, redo, canUndo, canRedo, clearCanvas, exportCanvas,
  onGroup, onUngroup, onAlignLeft, onAlignRight, onAlignTop, onAlignBottom,
  onAlignCenterH, onAlignCenterV, onDistributeH, onDistributeV,
  onBringToFront, onSendToBack, onBringForward, onSendBackward,
  onToggleGrid, onToggleSnapToGrid, gridEnabled, snapToGridEnabled,
  selectedCount, zoom, onZoomIn, onZoomOut, onZoomReset
}) => {
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 mt-4">
      <div className="bg-white rounded-lg shadow-lg p-2 flex items-center gap-2">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          {tools.map(({ name, icon, label }) => (
            <button
              key={name}
              onClick={() => setTool(name)}
              title={label}
              className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${
                tool === name ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
              aria-label={label}
            >
              <Icon name={icon} />
            </button>
          ))}
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <button 
            onClick={undo} 
            disabled={!canUndo} 
            title="Undo (Ctrl+Z)"
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            aria-label="Undo"
          >
            <Icon name="undo" />
          </button>
          <button 
            onClick={redo} 
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            aria-label="Redo"
          >
            <Icon name="redo" />
          </button>
        </div>

        {/* Group/Ungroup */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <button 
              onClick={onGroup}
              disabled={selectedCount < 2}
              title="Group (Ctrl+G)"
              className="p-2 rounded-md hover:bg-gray-100 text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
              aria-label="Group"
            >
              <Icon name="group" />
            </button>
            <button 
              onClick={onUngroup}
              title="Ungroup (Ctrl+Shift+G)"
              className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="Ungroup"
            >
              <Icon name="ungroup" />
            </button>
          </div>
        )}

        {/* Align & Distribute */}
        {selectedCount > 1 && (
          <div className="relative flex items-center gap-1 border-r pr-2 mr-2">
            <button 
              onClick={() => setShowAlignMenu(!showAlignMenu)}
              title="Align & Distribute"
              className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="Align"
            >
              <Icon name="align" />
            </button>
            
            {showAlignMenu && (
              <div className="absolute top-12 left-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 grid grid-cols-3 gap-1 z-50">
                <button onClick={() => { onAlignLeft?.(); setShowAlignMenu(false); }} className="p-2 hover:bg-gray-100 rounded" title="Align Left">
                  <Icon name="align-left" />
                </button>
                <button onClick={() => { onAlignCenterH?.(); setShowAlignMenu(false); }} className="p-2 hover:bg-gray-100 rounded" title="Align Center H">
                  <Icon name="align-center-h" />
                </button>
                <button onClick={() => { onAlignRight?.(); setShowAlignMenu(false); }} className="p-2 hover:bg-gray-100 rounded" title="Align Right">
                  <Icon name="align-right" />
                </button>
                <button onClick={() => { onAlignTop?.(); setShowAlignMenu(false); }} className="p-2 hover:bg-gray-100 rounded" title="Align Top">
                  <Icon name="align-top" />
                </button>
                <button onClick={() => { onAlignCenterV?.(); setShowAlignMenu(false); }} className="p-2 hover:bg-gray-100 rounded" title="Align Center V">
                  <Icon name="align-center-v" />
                </button>
                <button onClick={() => { onAlignBottom?.(); setShowAlignMenu(false); }} className="p-2 hover:bg-gray-100 rounded" title="Align Bottom">
                  <Icon name="align-bottom" />
                </button>
                <button onClick={() => { onDistributeH?.(); setShowAlignMenu(false); }} className="p-2 hover:bg-gray-100 rounded col-span-3" title="Distribute Horizontally">
                  <Icon name="distribute-h" />
                </button>
                <button onClick={() => { onDistributeV?.(); setShowAlignMenu(false); }} className="p-2 hover:bg-gray-100 rounded col-span-3" title="Distribute Vertically">
                  <Icon name="distribute-v" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Layer Order */}
        {selectedCount > 0 && (
          <div className="relative flex items-center gap-1 border-r pr-2 mr-2">
            <button 
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              title="Layer Order"
              className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="Layers"
            >
              <Icon name="layers" />
            </button>
            
            {showLayerMenu && (
              <div className="absolute top-12 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-44 z-50">
                <button onClick={() => { onBringToFront?.(); setShowLayerMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between">
                  <span>Bring to Front</span>
                  <span className="text-xs text-gray-400">Ctrl+]</span>
                </button>
                <button onClick={() => { onBringForward?.(); setShowLayerMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
                  Bring Forward
                </button>
                <button onClick={() => { onSendBackward?.(); setShowLayerMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
                  Send Backward
                </button>
                <button onClick={() => { onSendToBack?.(); setShowLayerMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between">
                  <span>Send to Back</span>
                  <span className="text-xs text-gray-400">Ctrl+[</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Grid & Snap */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <button 
            onClick={onToggleGrid}
            title="Toggle Grid"
            className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${
              gridEnabled ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
            }`}
            aria-label="Toggle Grid"
          >
            <Icon name="grid" />
          </button>
          <button 
            onClick={onToggleSnapToGrid}
            title="Snap to Grid"
            className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${
              snapToGridEnabled ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
            }`}
            aria-label="Snap to Grid"
          >
            <Icon name="magnet" />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <button  
            onClick={onZoomOut}
            title="Zoom Out"
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Zoom Out"
          >
            <Icon name="zoom-out" />
          </button>
          <span className="text-sm text-gray-600 font-medium min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button 
            onClick={onZoomIn}
            title="Zoom In"
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Zoom In"
          >
            <Icon name="zoom-in" />
          </button>
          <button 
            onClick={onZoomReset}
            title="Reset Zoom"
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors text-xs"
            aria-label="Reset Zoom"
          >
            1:1
          </button>
        </div>

        {/* Clear & Export */}
        <div className="flex items-center gap-1">
          <button 
            onClick={clearCanvas} 
            title="Clear Canvas"
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Clear Canvas"
          >
            <Icon name="trash" />
          </button>
          <button 
            onClick={exportCanvas} 
            title="Export"
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Export as PNG"
          >
            <Icon name="export" />
          </button>
        </div>
      </div>
    </div>
  );
};
