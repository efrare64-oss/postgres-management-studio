import { useTheme } from '../contexts/ThemeContext';
import { Fa } from '../icons';

interface HeaderProps {
  version: string;
}

export default function Header({ version }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex h-[46px] shrink-0 items-center justify-between bg-gradient-to-b from-pg-header-top to-pg-header-bottom px-3.5 text-white">
      <div className="flex items-center gap-2 text-[15px] font-medium tracking-wide whitespace-nowrap">
        <img src="/logo.svg" alt="Postgres Management Studio" className="h-6 w-6" draggable="false" />
        <span>Postgres Management Studio</span>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleTheme}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border-none bg-white/10 text-white hover:bg-white/20"
          title={theme === 'light' ? 'Alternar para tema escuro' : 'Alternar para tema claro'}
        >
          <Fa name={theme === 'light' ? 'moon' : 'sun'} />
        </button>
        <span className="text-xs text-[#c3d7e8]">{version}</span>
      </div>
    </header>
  );
}
