import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

const PRESET_COLORS = [
  '#000000', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#ffffff',
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(color);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomColor(color);
  }, [color]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleColorSelect = (selectedColor: string) => {
    onChange(selectedColor);
    setCustomColor(selectedColor);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
        title={label || 'Color'}
      >
        <div
          className="w-6 h-6 rounded border-2 border-gray-300"
          style={{ backgroundColor: color === 'transparent' ? '#ffffff' : color }}
        >
          {color === 'transparent' && (
            <div className="w-full h-full flex items-center justify-center text-xs text-red-500">
              ✕
            </div>
          )}
        </div>
        {label && <span className="text-sm text-gray-700">{label}</span>}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 min-w-[240px]">
          {/* Custom color input */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Custom Color</label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={customColor === 'transparent' ? '#ffffff' : customColor}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="w-12 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    onChange(e.target.value);
                  }
                }}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Transparent option */}
          <button
            onClick={() => handleColorSelect('transparent')}
            className={`w-full mb-2 px-2 py-1 text-sm rounded border-2 transition-colors ${
              color === 'transparent'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            No Fill (Transparent)
          </button>

          {/* Preset colors */}
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                onClick={() => handleColorSelect(presetColor)}
                className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                  color === presetColor ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                }`}
                style={{ backgroundColor: presetColor }}
                title={presetColor}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
