import { useEffect, useRef } from 'react';
import { Fa } from '../icons';
import type { TreeNode } from '../types';

export interface ContextItem {
  label?: string;
  icon?: string;
  danger?: boolean;
  sep?: boolean;
  onClick?: () => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  node: TreeNode;
  items: ContextItem[];
}

interface ContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
}

export default function ContextMenu({ menu, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const style: React.CSSProperties = {
    left: Math.min(menu.x, window.innerWidth - 240),
    top: Math.min(menu.y, window.innerHeight - menu.items.length * 30 - 16),
  };

  return (
    <div ref={ref} className="fixed z-[100] min-w-[210px] bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.18)] border border-menu-border" style={style}>
      {menu.items.map((item, i) => (
        item.sep ? (
          <div key={i} className="mx-2 my-1 border-t border-[#e5e7eb]" />
        ) : (
        <button
          key={i}
          className={`flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3 py-1.5 text-left text-[13px] text-[#1f2937] hover:bg-[#e8eef5] ${item.danger ? 'text-danger' : ''}`}
          onClick={() => { onClose(); item.onClick?.(); }}
        >
          {item.icon && <Fa name={item.icon} />}
          {item.label}
        </button>
        )
      ))}
    </div>
  );
}
