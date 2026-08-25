import { Fa } from '../icons';
import type { ToolbarItem } from '../types';

interface ToolbarProps {
  items: ToolbarItem[];
}

export default function Toolbar({ items }: ToolbarProps) {
  return (
    <div className="flex h-[38px] shrink-0 items-center gap-0.5 border-b border-border-soft bg-toolbar-bg px-2 py-1">
      {items.map((t) => t.sep ? (
        <div key={t.key} className="mx-1.5 h-[22px] w-px bg-border-soft" />
      ) : (
        <button
          key={t.key}
          className="inline-flex h-7 w-8 cursor-pointer items-center justify-center rounded-[3px] border border-transparent bg-transparent text-[#4b5563] hover:border-[#b9c8d6] hover:bg-tb-hover hover:text-[#1f2937] disabled:cursor-default disabled:text-[#c3c9d0]"
          title={t.label}
          disabled={t.enabled === false}
          onClick={t.onClick}
        >
          <Fa name={t.icon || 'database'} />
        </button>
      ))}
      {/* <div className="ml-auto flex items-center gap-1.5 rounded-[3px] border border-border-soft bg-[#fafbfc] px-2 py-0.5             text-[#7d858e]">
        <Fa name="search" />
        <input placeholder="Quick search..." className="w-[170px] bg-transparent text-[13px] text-text outline-none" />
      </div> */}
    </div>
  );
}
