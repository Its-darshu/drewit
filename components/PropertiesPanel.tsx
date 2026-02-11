import React from 'react';
import { SketchElement, FillStyle, StrokeStyle, Arrowhead, TextAlign } from '../types';

interface PropertiesPanelProps {
  selectedElements: SketchElement[];
  onUpdateElements: (updates: Partial<SketchElement>) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElements,
  onUpdateElements,
}) => {
  if (selectedElements.length === 0) {
    return null;
  }

  const element = selectedElements[0];
  
  const fillStyles: FillStyle[] = ['solid', 'hachure', 'cross-hatch', 'zigzag'];
  const strokeStyles: StrokeStyle[] = ['solid', 'dashed', 'dotted'];
  const arrowheads: (Arrowhead | 'none')[] = ['none', 'arrow', 'bar', 'dot', 'triangle'];

  return (
    <div className="absolute right-4 top-20 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64 space-y-4 z-50">
      <h3 className="text-sm font-semibold text-gray-800 border-b pb-2">Properties</h3>
      
      {/* Stroke Color */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Stroke</label>
        <input
          type="color"
          value={element.strokeColor}
          onChange={(e) => onUpdateElements({ strokeColor: e.target.value })}
          className="w-full h-8 rounded border border-gray-300 cursor-pointer"
        />
      </div>

      {/* Fill Color */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Fill</label>
        <input
          type="color"
          value={element.fillColor}
          onChange={(e) => onUpdateElements({ fillColor: e.target.value })}
          className="w-full h-8 rounded border border-gray-300 cursor-pointer"
        />
      </div>

      {/* Background Color */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Background</label>
        <input
          type="color"
          value={element.backgroundColor}
          onChange={(e) => onUpdateElements({ backgroundColor: e.target.value })}
          className="w-full h-8 rounded border border-gray-300 cursor-pointer"
        />
      </div>

      {/* Stroke Width */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Stroke Width: {element.strokeWidth}px
        </label>
        <input
          type="range"
          min="1"
          max="20"
          value={element.strokeWidth}
          onChange={(e) => onUpdateElements({ strokeWidth: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Opacity */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Opacity: {Math.round(element.opacity * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={element.opacity * 100}
          onChange={(e) => onUpdateElements({ opacity: parseInt(e.target.value) / 100 })}
          className="w-full"
        />
      </div>

      {/* Roughness */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Roughness: {element.roughness}
        </label>
        <input
          type="range"
          min="0"
          max="3"
          step="0.1"
          value={element.roughness}
          onChange={(e) => onUpdateElements({ roughness: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Fill Style */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Fill Style</label>
        <select
          value={element.fillStyle}
          onChange={(e) => onUpdateElements({ fillStyle: e.target.value as FillStyle })}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        >
          {fillStyles.map(style => (
            <option key={style} value={style}>{style}</option>
          ))}
        </select>
      </div>

      {/* Stroke Style */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Stroke Style</label>
        <select
          value={element.strokeStyle}
          onChange={(e) => onUpdateElements({ strokeStyle: e.target.value as StrokeStyle })}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        >
          {strokeStyles.map(style => (
            <option key={style} value={style}>{style}</option>
          ))}
        </select>
      </div>

      {/* Arrow-specific properties */}
      {element.type === 'ARROW' && 'startArrowhead' in element && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Arrowhead</label>
            <select
              value={element.startArrowhead || 'none'}
              onChange={(e) => onUpdateElements({ startArrowhead: e.target.value === 'none' ? null : e.target.value as Arrowhead })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {arrowheads.map(head => (
                <option key={head} value={head}>{head}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Arrowhead</label>
            <select
              value={element.endArrowhead || 'none'}
              onChange={(e) => onUpdateElements({ endArrowhead: e.target.value === 'none' ? null : e.target.value as Arrowhead })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {arrowheads.map(head => (
                <option key={head} value={head}>{head}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Text-specific properties */}
      {element.type === 'TEXT' && 'fontSize' in element && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Font Size: {element.fontSize}px
            </label>
            <input
              type="range"
              min="8"
              max="96"
              value={element.fontSize}
              onChange={(e) => onUpdateElements({ fontSize: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Text Align</label>
            <div className="flex space-x-2">
              {(['left', 'center', 'right'] as TextAlign[]).map(align => (
                <button
                  key={align}
                  onClick={() => onUpdateElements({ textAlign: align })}
                  className={`flex-1 px-2 py-1 text-xs rounded border ${
                    element.textAlign === align
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {align[0].toUpperCase() + align.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Lock/Unlock */}
      <div className="pt-2 border-t">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={element.locked}
            onChange={(e) => onUpdateElements({ locked: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-xs text-gray-700">Lock element</span>
        </label>
      </div>
    </div>
  );
};
