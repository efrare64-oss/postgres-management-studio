import { useEffect, useRef, useState } from 'react';
import { Fa } from '../icons';
import type { TreeNode } from '../types';

export interface ContextItem {
  label?: string;
  icon?: string;
  danger?: boolean;
  sep?: boolean;
  children?: ContextItem[];
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

function countItems(items: ContextItem[]): number {
  return items.filter((i) => !i.sep).length;
}

export default function ContextMenu({ menu, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);

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
    top: Math.min(menu.y, window.innerHeight - countItems(menu.items) * 30 - 16),
  };
  const openLeft = menu.x > window.innerWidth / 2;

  const renderItems = (items: ContextItem[], prefix: string): React.ReactNode => (
    items.map((item, i) => {
      const key = `${prefix}-${i}`;
      if (item.sep) return <div key={key} className="mx-2 my-1 border-t border-[#e5e7eb]" />;
      if (item.children && item.children.length) {
        return (
          <div key={key} className="relative" onMouseEnter={() => setOpenSub(key)}>
            <button
              className={`flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3 py-1.5 pr-2 text-left text-[13px] text-[#1f2937] hover:bg-[#e8eef5] ${item.danger ? 'text-danger' : ''}`}
            >
              {item.icon && <Fa name={item.icon} />}
              <span className="flex-1">{item.label}</span>
              <Fa name="submenu" />
            </button>
            {openSub === key && (
              <div className={`absolute top-0 z-10 min-w-[200px] border border-menu-border bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.18)] ${openLeft ? 'right-full' : 'left-full'}`}>
                {renderItems(item.children, key)}
              </div>
            )}
          </div>
        );
      }
      return (
        <button
          key={key}
          className={`flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3 py-1.5 text-left text-[13px] text-[#1f2937] hover:bg-[#e8eef5] ${item.danger ? 'text-danger' : ''}`}
          onClick={() => { onClose(); item.onClick?.(); }}
        >
          {item.icon && <Fa name={item.icon} />}
          {item.label}
        </button>
      );
    })
  );

  return (
    <div ref={ref} className="fixed z-[100] min-w-[210px] border border-menu-border bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.18)]" style={style}>
      {renderItems(menu.items, 'm')}
    </div>
  );
}