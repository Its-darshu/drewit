import React from 'react';
import { ColorPicker } from './ColorPicker';
import { ToolSettings } from '../hooks/useToolSettings';

interface ToolSettingsPanelProps {
  settings: ToolSettings;
  onUpdateSettings: (settings: Partial<ToolSettings>) => void;
}

export const ToolSettingsPanel: React.FC<ToolSettingsPanelProps> = ({
  settings,
  onUpdateSettings,
}) => {
  return (
    <div className="flex items-center space-x-3 px-3 py-2 bg-white rounded-lg border border-gray-200">
      {/* Stroke Color */}
      <ColorPicker
        color={settings.strokeColor}
        onChange={(color) => onUpdateSettings({ strokeColor: color })}
        label="Stroke"
      />

      {/* Fill Color */}
      <ColorPicker
        color={settings.fillColor}
        onChange={(color) => onUpdateSettings({ fillColor: color })}
        label="Fill"
      />

      {/* Stroke Width */}
      <div className="flex items-center space-x-2">
        <label className="text-sm text-gray-700 whitespace-nowrap">Width:</label>
        <input
          type="range"
          min="1"
          max="20"
          value={settings.strokeWidth}
          onChange={(e) => onUpdateSettings({ strokeWidth: Number(e.target.value) })}
          className="w-24"
        />
        <span className="text-sm text-gray-600 w-8 text-right">{settings.strokeWidth}px</span>
      </div>

      {/* Opacity */}
      <div className="flex items-center space-x-2">
        <label className="text-sm text-gray-700">Opacity:</label>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.opacity * 100}
          onChange={(e) => onUpdateSettings({ opacity: Number(e.target.value) / 100 })}
          className="w-24"
        />
        <span className="text-sm text-gray-600 w-10 text-right">{Math.round(settings.opacity * 100)}%</span>
      </div>
    </div>
  );
};
