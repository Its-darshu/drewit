/**
 * Excalidraw-style properties sidebar.
 * Shows contextual properties based on selected element type.
 */

import React from 'react';
import { SketchElement, Tool, FillStyle, StrokeStyle, Arrowhead } from '../types';

interface ExcalidrawPropertiesProps {
  selectedElements: SketchElement[];
  onUpdate: (updates: Partial<SketchElement>) => void;
  activeTool: Tool;
}

// ─── Color Presets ──────────────────────────────────────────────────
const STROKE_COLORS = [
  '#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00',
  '#6741d9', '#0c8599', '#e8590c', '#862e9c', '#495057',
];

const FILL_COLORS = [
  'transparent', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99',
  '#d0bfff', '#99e9f2', '#ffd8a8', '#eebefa', '#dee2e6',
];

const BG_COLORS = [
  'transparent', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99',
  '#d0bfff', '#99e9f2', '#ffd8a8', '#eebefa', '#dee2e6',
];

const STROKE_WIDTHS = [1, 2, 4];
const ROUGHNESS_LEVELS = [0, 1, 2];
const FILL_STYLES: { value: FillStyle; label: string }[] = [
  { value: 'hachure', label: 'Hachure' },
  { value: 'cross-hatch', label: 'Cross-hatch' },
  { value: 'solid', label: 'Solid' },
];
const STROKE_STYLES: { value: StrokeStyle; label: string; dash: string }[] = [
  { value: 'solid', label: 'Solid', dash: '' },
  { value: 'dashed', label: 'Dashed', dash: '6 4' },
  { value: 'dotted', label: 'Dotted', dash: '2 4' },
];

// ─── Main Component ─────────────────────────────────────────────────

export const ExcalidrawProperties: React.FC<ExcalidrawPropertiesProps> = ({
  selectedElements,
  onUpdate,
  activeTool,
}) => {
  if (selectedElements.length !== 1) return null;

  const el = selectedElements[0];
  const isShape = [Tool.RECTANGLE, Tool.ELLIPSE, Tool.DIAMOND].includes(el.type as Tool);
  const isLine = el.type === Tool.LINE || el.type === Tool.ARROW;
  const isText = el.type === Tool.TEXT;

  return (
    <div className="drewit-properties">
      {/* Stroke Color */}
      <PropertySection label="Stroke">
        <ColorGrid
          colors={STROKE_COLORS}
          selected={el.strokeColor}
          onSelect={(color) => onUpdate({ strokeColor: color })}
        />
      </PropertySection>

      {/* Background Color (shapes only) */}
      {isShape && (
        <PropertySection label="Background">
          <ColorGrid
            colors={BG_COLORS}
            selected={el.backgroundColor}
            onSelect={(color) => onUpdate({ backgroundColor: color })}
            showTransparent
          />
        </PropertySection>
      )}

      {/* Fill Color */}
      {isShape && (
        <PropertySection label="Fill">
          <ColorGrid
            colors={FILL_COLORS}
            selected={el.fillColor}
            onSelect={(color) => onUpdate({ fillColor: color })}
            showTransparent
          />
        </PropertySection>
      )}

      {/* Stroke Width */}
      <PropertySection label="Stroke width">
        <div className="drewit-prop-btn-group">
          {STROKE_WIDTHS.map(w => (
            <button
              key={w}
              className={`drewit-prop-btn ${el.strokeWidth === w ? 'active' : ''}`}
              onClick={() => onUpdate({ strokeWidth: w })}
              title={`${w}px`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth={w} strokeLinecap="round" />
              </svg>
            </button>
          ))}
        </div>
      </PropertySection>

      {/* Stroke Style */}
      <PropertySection label="Stroke style">
        <div className="drewit-prop-btn-group">
          {STROKE_STYLES.map(s => (
            <button
              key={s.value}
              className={`drewit-prop-btn ${el.strokeStyle === s.value ? 'active' : ''}`}
              onClick={() => onUpdate({ strokeStyle: s.value })}
              title={s.label}
            >
              <svg width="24" height="20" viewBox="0 0 28 20">
                <line
                  x1="2" y1="10" x2="26" y2="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={s.dash}
                />
              </svg>
            </button>
          ))}
        </div>
      </PropertySection>

      {/* Fill Style (shapes only) */}
      {isShape && (
        <PropertySection label="Fill style">
          <div className="drewit-prop-btn-group">
            {FILL_STYLES.map(s => (
              <button
                key={s.value}
                className={`drewit-prop-btn ${el.fillStyle === s.value ? 'active' : ''}`}
                onClick={() => onUpdate({ fillStyle: s.value })}
                title={s.label}
              >
                <span className="drewit-prop-btn-label">{s.label.substring(0, 4)}</span>
              </button>
            ))}
          </div>
        </PropertySection>
      )}

      {/* Roughness */}
      <PropertySection label="Sloppiness">
        <div className="drewit-prop-btn-group">
          {ROUGHNESS_LEVELS.map(r => (
            <button
              key={r}
              className={`drewit-prop-btn ${el.roughness === r ? 'active' : ''}`}
              onClick={() => onUpdate({ roughness: r })}
              title={['Architect', 'Artist', 'Cartoonist'][r]}
            >
              <SlopIcon level={r} />
            </button>
          ))}
        </div>
      </PropertySection>

      {/* Opacity */}
      <PropertySection label={`Opacity — ${Math.round(el.opacity * 100)}%`}>
        <input
          type="range"
          min="0"
          max="100"
          value={el.opacity * 100}
          onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) / 100 })}
          className="drewit-slider"
        />
      </PropertySection>

      {/* Arrow endpoints */}
      {el.type === Tool.ARROW && 'startArrowhead' in el && (
        <PropertySection label="Arrowheads">
          <div className="drewit-prop-row">
            <ArrowheadPicker
              label="Start"
              value={el.startArrowhead}
              onChange={(v) => onUpdate({ startArrowhead: v } as any)}
            />
            <ArrowheadPicker
              label="End"
              value={el.endArrowhead}
              onChange={(v) => onUpdate({ endArrowhead: v } as any)}
            />
          </div>
        </PropertySection>
      )}

      {/* Text properties */}
      {isText && 'fontSize' in el && (
        <>
          <PropertySection label={`Font size — ${el.fontSize}px`}>
            <input
              type="range"
              min="8"
              max="120"
              value={el.fontSize}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) } as any)}
              className="drewit-slider"
            />
          </PropertySection>

          <PropertySection label="Text align">
            <div className="drewit-prop-btn-group">
              {(['left', 'center', 'right'] as const).map(align => (
                <button
                  key={align}
                  className={`drewit-prop-btn ${el.textAlign === align ? 'active' : ''}`}
                  onClick={() => onUpdate({ textAlign: align } as any)}
                >
                  <TextAlignIcon align={align} />
                </button>
              ))}
            </div>
          </PropertySection>
        </>
      )}

      {/* Rotation display */}
      {el.angle !== undefined && el.angle !== 0 && (
        <PropertySection label={`Angle — ${Math.round((el.angle * 180) / Math.PI)}°`}>
          <button
            className="drewit-prop-btn-full"
            onClick={() => onUpdate({ angle: 0 })}
          >
            Reset rotation
          </button>
        </PropertySection>
      )}

      {/* Lock */}
      <PropertySection label="">
        <label className="drewit-lock-label">
          <input
            type="checkbox"
            checked={el.locked}
            onChange={(e) => onUpdate({ locked: e.target.checked })}
          />
          <span>Lock</span>
        </label>
      </PropertySection>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────

const PropertySection: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="drewit-prop-section">
    {label && <div className="drewit-prop-label">{label}</div>}
    {children}
  </div>
);

const ColorGrid: React.FC<{
  colors: string[];
  selected: string;
  onSelect: (color: string) => void;
  showTransparent?: boolean;
}> = ({ colors, selected, onSelect, showTransparent }) => (
  <div className="drewit-color-grid">
    {colors.map((color, i) => (
      <button
        key={i}
        className={`drewit-color-swatch ${selected === color ? 'active' : ''}`}
        style={{
          backgroundColor: color === 'transparent' ? '#fff' : color,
          backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%), linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%)' : undefined,
          backgroundSize: color === 'transparent' ? '8px 8px' : undefined,
          backgroundPosition: color === 'transparent' ? '0 0, 4px 4px' : undefined,
        }}
        onClick={() => onSelect(color)}
        title={color}
      />
    ))}
    <input
      type="color"
      value={selected === 'transparent' ? '#000000' : selected}
      onChange={(e) => onSelect(e.target.value)}
      className="drewit-color-custom"
      title="Custom color"
    />
  </div>
);

const ArrowheadPicker: React.FC<{
  label: string;
  value: Arrowhead;
  onChange: (v: Arrowhead) => void;
}> = ({ label, value, onChange }) => {
  const options: { value: Arrowhead; label: string }[] = [
    { value: null, label: 'None' },
    { value: 'arrow', label: 'Arrow' },
    { value: 'bar', label: 'Bar' },
    { value: 'dot', label: 'Dot' },
    { value: 'triangle', label: 'Triangle' },
  ];

  return (
    <div className="drewit-arrowhead-picker">
      <span className="drewit-prop-sublabel">{label}</span>
      <select
        value={value || 'none'}
        onChange={(e) => onChange(e.target.value === 'none' ? null : e.target.value as Arrowhead)}
        className="drewit-select"
      >
        {options.map(o => (
          <option key={o.label} value={o.value || 'none'}>{o.label}</option>
        ))}
      </select>
    </div>
  );
};

const SlopIcon: React.FC<{ level: number }> = ({ level }) => {
  // Simple visual representation of roughness
  const svgs = [
    // Architect (smooth)
    <svg key={0} width="20" height="20" viewBox="0 0 24 24"><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2"/></svg>,
    // Artist (medium)
    <svg key={1} width="20" height="20" viewBox="0 0 24 24"><path d="M4 12c2-1 4 1 6 0s4 1 6 0 2-1 4 0" stroke="currentColor" strokeWidth="2" fill="none"/></svg>,
    // Cartoonist (rough)
    <svg key={2} width="20" height="20" viewBox="0 0 24 24"><path d="M4 12c1-2 2 2 4 0s2 2 4 0 2 2 4 0 2 2 4 0" stroke="currentColor" strokeWidth="2" fill="none"/></svg>,
  ];
  return svgs[level] || svgs[0];
};

const TextAlignIcon: React.FC<{ align: string }> = ({ align }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1={align === 'right' ? '9' : '3'} y1="12" x2={align === 'left' ? '15' : '21'} y2="12" />
    <line x1={align === 'right' ? '6' : align === 'center' ? '5' : '3'} y1="18" x2={align === 'left' ? '18' : align === 'center' ? '19' : '21'} y2="18" />
  </svg>
);

export default ExcalidrawProperties;
