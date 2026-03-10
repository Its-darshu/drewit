/**
 * Excalidraw-style toolbar component.
 * Rendered at the top-center of the canvas with a clean, modern design.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Tool } from '../types';

// ─── Types ──────────────────────────────────────────────────────────

interface ExcalidrawToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomToFit: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  selectedCount: number;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportJSON: () => void;
  onImport: () => void;
  onClear: () => void;
  saveStatus: 'saved' | 'saving' | 'error';
  projectName: string;
  onBack: () => void;
}

const TOOL_ITEMS: { tool: Tool; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { tool: Tool.SELECTION, label: 'Select', shortcut: 'V', icon: <SelectIcon /> },
  { tool: Tool.RECTANGLE, label: 'Rectangle', shortcut: 'R', icon: <RectIcon /> },
  { tool: Tool.ELLIPSE, label: 'Ellipse', shortcut: 'O', icon: <EllipseIcon /> },
  { tool: Tool.DIAMOND, label: 'Diamond', shortcut: 'D', icon: <DiamondIcon /> },
  { tool: Tool.LINE, label: 'Line', shortcut: 'L', icon: <LineIcon /> },
  { tool: Tool.ARROW, label: 'Arrow', shortcut: 'A', icon: <ArrowIcon /> },
  { tool: Tool.PENCIL, label: 'Pencil', shortcut: 'P', icon: <PencilIcon /> },
  { tool: Tool.TEXT, label: 'Text', shortcut: 'T', icon: <TextIcon /> },
  { tool: Tool.ERASER, label: 'Eraser', shortcut: 'E', icon: <EraserIcon /> },
];

// ─── Main Component ─────────────────────────────────────────────────

export const ExcalidrawToolbar: React.FC<ExcalidrawToolbarProps> = (props) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <>
      {/* ── Top-Left: Menu & Project ── */}
      <div className="drewit-top-left">
        <div className="drewit-panel drewit-panel-row" ref={menuRef}>
          <button
            className="drewit-btn drewit-menu-btn"
            onClick={() => setShowMenu(!showMenu)}
            title="Menu"
          >
            <HamburgerIcon />
          </button>
          <span className="drewit-project-name">{props.projectName}</span>
          <SaveIndicator status={props.saveStatus} />

          {showMenu && (
            <div className="drewit-dropdown drewit-menu-dropdown">
              <MenuItem icon="↩" label="Back to Projects" onClick={() => { props.onBack(); setShowMenu(false); }} />
              <MenuSeparator />
              <MenuItem icon="📷" label="Export as PNG" shortcut="Ctrl+Shift+E" onClick={() => { props.onExportPNG(); setShowMenu(false); }} />
              <MenuItem icon="🎨" label="Export as SVG" onClick={() => { props.onExportSVG(); setShowMenu(false); }} />
              <MenuItem icon="💾" label="Export as .drewit" onClick={() => { props.onExportJSON(); setShowMenu(false); }} />
              <MenuSeparator />
              <MenuItem icon="📂" label="Import" onClick={() => { props.onImport(); setShowMenu(false); }} />
              <MenuSeparator />
              <MenuItem icon="🗑️" label="Clear Canvas" onClick={() => { props.onClear(); setShowMenu(false); }} className="drewit-menu-danger" />
            </div>
          )}
        </div>
      </div>

      {/* ── Top-Center: Tool Palette ── */}
      <div className="drewit-top-center">
        <div className="drewit-panel drewit-tool-palette">
          {TOOL_ITEMS.map(({ tool, icon, label, shortcut }) => (
            <button
              key={tool}
              className={`drewit-tool-btn ${props.activeTool === tool ? 'drewit-tool-active' : ''}`}
              onClick={() => props.onToolChange(tool)}
              title={`${label} (${shortcut})`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── Top-Right: Actions ── */}
      <div className="drewit-top-right">
        <div className="drewit-panel drewit-panel-row">
          <button
            className="drewit-btn"
            onClick={props.onUndo}
            disabled={!props.canUndo}
            title="Undo (Ctrl+Z)"
          >
            <UndoIcon />
          </button>
          <button
            className="drewit-btn"
            onClick={props.onRedo}
            disabled={!props.canRedo}
            title="Redo (Ctrl+Y)"
          >
            <RedoIcon />
          </button>

          <div className="drewit-separator" />

          <button
            className={`drewit-btn ${props.showGrid ? 'drewit-btn-active' : ''}`}
            onClick={props.onToggleGrid}
            title="Toggle Grid (Ctrl+')"
          >
            <GridIcon />
          </button>
        </div>
      </div>

      {/* ── Bottom-Left: Zoom Controls ── */}
      <div className="drewit-bottom-left">
        <div className="drewit-panel drewit-panel-row drewit-zoom-bar">
          <button className="drewit-btn drewit-sm" onClick={props.onZoomOut} title="Zoom Out">
            <MinusIcon />
          </button>
          <button
            className="drewit-zoom-value"
            onClick={props.onZoomReset}
            title="Reset Zoom (Ctrl+0)"
          >
            {Math.round(props.zoom * 100)}%
          </button>
          <button className="drewit-btn drewit-sm" onClick={props.onZoomIn} title="Zoom In">
            <PlusIcon />
          </button>
          <button className="drewit-btn drewit-sm" onClick={props.onZoomToFit} title="Zoom to Fit (Ctrl+Shift+1)">
            <FitIcon />
          </button>
        </div>
      </div>

      {/* ── Bottom-Right: Selection Info ── */}
      {props.selectedCount > 0 && (
        <div className="drewit-bottom-right">
          <div className="drewit-panel drewit-panel-row drewit-selection-bar">
            <span className="drewit-selection-count">
              {props.selectedCount} selected
            </span>
            <div className="drewit-separator" />
            <button className="drewit-btn drewit-sm" onClick={props.onDuplicate} title="Duplicate (Ctrl+D)">
              <DuplicateIcon />
            </button>
            <button className="drewit-btn drewit-sm" onClick={props.onBringForward} title="Bring Forward">
              <BringForwardIcon />
            </button>
            <button className="drewit-btn drewit-sm" onClick={props.onSendBackward} title="Send Backward">
              <SendBackwardIcon />
            </button>
            <button className="drewit-btn drewit-sm drewit-btn-danger" onClick={props.onDelete} title="Delete (Del)">
              <DeleteIcon />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────

const SaveIndicator: React.FC<{ status: 'saved' | 'saving' | 'error' }> = ({ status }) => (
  <span className={`drewit-save-indicator drewit-save-${status}`}>
    {status === 'saving' && <span className="drewit-spin">◌</span>}
    {status === 'saved' && '✓'}
    {status === 'error' && '⚠'}
  </span>
);

const MenuItem: React.FC<{
  icon: string; label: string; shortcut?: string;
  onClick: () => void; className?: string;
}> = ({ icon, label, shortcut, onClick, className }) => (
  <button className={`drewit-menu-item ${className || ''}`} onClick={onClick}>
    <span className="drewit-menu-icon">{icon}</span>
    <span className="drewit-menu-label">{label}</span>
    {shortcut && <span className="drewit-menu-shortcut">{shortcut}</span>}
  </button>
);

const MenuSeparator: React.FC = () => <div className="drewit-menu-separator" />;

// ─── SVG Icons ──────────────────────────────────────────────────────

function SelectIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    </svg>
  );
}

function RectIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function EllipseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="12" rx="10" ry="8" />
    </svg>
  );
}

function DiamondIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l10 10-10 10L2 12z" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="5" y1="19" x2="19" y2="5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function FitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function BringForwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 11 12 6 7 11" />
      <polyline points="17 18 12 13 7 18" />
    </svg>
  );
}

function SendBackwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7 13 12 18 17 13" />
      <polyline points="7 6 12 11 17 6" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default ExcalidrawToolbar;
