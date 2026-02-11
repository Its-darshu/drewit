import { useEffect } from 'react';
import { Tool } from '../types';

interface KeyboardShortcutsConfig {
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onDuplicate?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onToggleGrid?: () => void;
  setTool?: (tool: Tool) => void;
  onSave?: () => void;
  onExport?: () => void;
}

export const useKeyboardShortcuts = (config: KeyboardShortcutsConfig) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey, altKey } = e;
      const cmdOrCtrl = ctrlKey || metaKey;
      
      // Prevent shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Tool Selection
      if (!cmdOrCtrl && !shiftKey && !altKey) {
        switch (key.toLowerCase()) {
          case 'v':
            config.setTool?.(Tool.SELECTION);
            e.preventDefault();
            break;
          case 'r':
            config.setTool?.(Tool.RECTANGLE);
            e.preventDefault();
            break;
          case 'c':
            config.setTool?.(Tool.ELLIPSE);
            e.preventDefault();
            break;
          case 'd':
            config.setTool?.(Tool.DIAMOND);
            e.preventDefault();
            break;
          case 'l':
            config.setTool?.(Tool.LINE);
            e.preventDefault();
            break;
          case 'a':
            config.setTool?.(Tool.ARROW);
            e.preventDefault();
            break;
          case 'p':
            config.setTool?.(Tool.PENCIL);
            e.preventDefault();
            break;
          case 't':
            config.setTool?.(Tool.TEXT);
            e.preventDefault();
            break;
          case 'e':
            config.setTool?.(Tool.ERASER);
            e.preventDefault();
            break;
        }
      }

      // Ctrl/Cmd + Key Shortcuts
      if (cmdOrCtrl && !shiftKey) {
        switch (key.toLowerCase()) {
          case 'c':
            config.onCopy?.();
            e.preventDefault();
            break;
          case 'x':
            config.onCut?.();
            e.preventDefault();
            break;
          case 'v':
            config.onPaste?.();
            e.preventDefault();
            break;
          case 'a':
            config.onSelectAll?.();
            e.preventDefault();
            break;
          case 'd':
            config.onDuplicate?.();
            e.preventDefault();
            break;
          case 'g':
            config.onGroup?.();
            e.preventDefault();
            break;
          case 'z':
            config.onUndo?.();
            e.preventDefault();
            break;
          case 'y':
            config.onRedo?.();
            e.preventDefault();
            break;
          case 's':
            config.onSave?.();
            e.preventDefault();
            break;
          case 'e':
            config.onExport?.();
            e.preventDefault();
            break;
          case ']':
            config.onBringToFront?.();
            e.preventDefault();
            break;
          case '[':
            config.onSendToBack?.();
            e.preventDefault();
            break;
          case '=':
          case '+':
            config.onZoomIn?.();
            e.preventDefault();
            break;
          case '-':
          case '_':
            config.onZoomOut?.();
            e.preventDefault();
            break;
          case '0':
            config.onZoomReset?.();
            e.preventDefault();
            break;
          case '\'':
            config.onToggleGrid?.();
            e.preventDefault();
            break;
        }
      }

      // Ctrl/Cmd + Shift + Key Shortcuts
      if (cmdOrCtrl && shiftKey) {
        switch (key.toLowerCase()) {
          case 'g':
            config.onUngroup?.();
            e.preventDefault();
            break;
          case 'z':
            config.onRedo?.();
            e.preventDefault();
            break;
          case ']':
            config.onBringForward?.();
            e.preventDefault();
            break;
          case '[':
            config.onSendBackward?.();
            e.preventDefault();
            break;
        }
      }

      // Delete/Backspace
      if (key === 'Delete' || key === 'Backspace') {
        if (!cmdOrCtrl && !shiftKey && !altKey) {
          config.onDelete?.();
          e.preventDefault();
        }
      }

      // Escape - deselect/cancel
      if (key === 'Escape') {
        config.setTool?.(Tool.SELECTION);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config]);
};
