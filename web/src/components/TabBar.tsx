import { useEffect, useRef, useState } from 'react';
import { Fa } from '../icons';
import type { AppTab } from '../types';

interface TabBarProps {
  tabs: AppTab[];
  activeTab: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

const MIN_W = 120;
const MAX_W = 600;

function kindIcon(kind: string, node?: AppTab['node']) {
  if (kind === 'query') return 'sql';
  if (kind === 'dashboard-server') return 'server';
  if (kind === 'dashboard-database') return 'database';
  return node?.icon || 'table';
}

export default function TabBar({ tabs, activeTab, onSelect, onClose }: TabBarProps) {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const drag = useRef<{ id: string; startX: number; startW: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      const w = Math.min(MAX_W, Math.max(MIN_W, d.startW + (e.clientX - d.startX)));
      setWidths((prev) => ({ ...prev, [d.id]: w }));
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <div className="flex shrink-0 items-end gap-[3px] overflow-x-auto border-b border-border bg-tab-bg px-1 pt-1">
      {tabs.map((t) => (
        <div
          key={t.id}
          className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-t-md border border-border px-2 text-[#4a5560] ${
            activeTab === t.id ? 'border-b-panel-bg bg-panel-bg text-[#1f2937]' : 'bg-tab-bg hover:bg-[#d7dbe1]'
          }`}
          style={{ width: widths[t.id] ?? 180 }}
          onClick={() => onSelect(t.id)}
        >
          <span className="text-xs text-pg-blue"><Fa name={kindIcon(t.kind, t.node)} /></span>
          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis pl-0.5 pr-1">{t.title}</span>
          <button
            className="inline-flex cursor-pointer border-none bg-transparent p-0 text-muted hover:text-danger"
            onClick={(e) => { e.stopPropagation(); onClose(t.id); }}
            title="Fechar"
          >
            <Fa name="close" />
          </button>
          <span
            className="mr-[-7px] h-full w-[5px] cursor-col-resize select-none"
            title="Arraste para redimensionar"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              drag.current = { id: t.id, startX: e.clientX, startW: widths[t.id] ?? 180 };
            }}
          />
        </div>
      ))}
    </div>
  );
}
