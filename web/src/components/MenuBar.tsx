import { Fa } from '../icons';
import type { MenuDef, MenuId, MenuItem } from '../types';

interface MenuBarProps {
  items: MenuDef[];
  openMenu: MenuId;
  onOpenMenu: (id: MenuId) => void;
}

function renderItem(it: MenuItem, close: () => void) {
  if (it.sep) return <div key="sep" className="dropdown-sep" />;
  return (
    <button
      key={it.label}
      className={`dropdown-item ${it.enabled === false ? 'disabled' : ''}`}
      onClick={() => { close(); if (it.enabled !== false && it.onClick) it.onClick(); }}
    >
      {it.icon && <Fa name={it.icon} />}
      {it.label}
    </button>
  );
}

export default function MenuBar({ items, openMenu, onOpenMenu }: MenuBarProps) {
  return (
    <nav className="relative z-30 flex h-[30px] shrink-0 items-stretch border-b border-menu-border bg-menu-bg" onMouseLeave={() => onOpenMenu(null)}>
      {items.map((m) => (
        <div key={m.id} className="relative">
          <button
            className={`h-full px-4 text-sm leading-[30px] text-text ${openMenu === m.id ? 'bg-[#e2e6ec]' : ''} hover:bg-[#e2e6ec]`}
            onClick={() => onOpenMenu(openMenu === m.id ? null : m.id)}
            onMouseEnter={() => openMenu && onOpenMenu(m.id)}
          >
            {m.label}
          </button>
          {openMenu === m.id && (
            <div className="absolute top-full left-0 min-w-[220px] bg-menu-bg py-1 shadow-[0_4px_14px_rgba(0,0,0,0.16)] border border-menu-border">
              {m.items.map((it, i) => renderItem(it, () => onOpenMenu(null)))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
