import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
  top: number;
  left: number;
  onClose: () => void;
  items: {
    label: string;
    icon?: string;
    action: () => void;
    shortcut?: string;
    separator?: boolean;
    disabled?: boolean;
  }[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ top, left, onClose, items }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 py-1 min-w-[200px] z-[9999]"
      style={{ top: `${top}px`, left: `${left}px` }}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return <div key={index} className="border-t border-gray-200 my-1" />;
        }

        return (
          <button
            key={index}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            disabled={item.disabled}
            className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-blue-50 transition-colors ${
              item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center space-x-2">
              {item.icon && <span className="text-gray-600">{item.icon}</span>}
              <span className="text-sm text-gray-800">{item.label}</span>
            </div>
            {item.shortcut && (
              <span className="text-xs text-gray-400">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
