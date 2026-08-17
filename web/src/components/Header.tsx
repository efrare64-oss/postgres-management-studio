interface HeaderProps {
  version: string;
}

export default function Header({ version }: HeaderProps) {
  return (
    <header className="flex h-[46px] shrink-0 items-center justify-between bg-gradient-to-b from-pg-header-top to-pg-header-bottom px-3.5 text-white">
      <div className="flex items-center gap-2 text-[15px] font-medium tracking-wide whitespace-nowrap">
        <img src="/logo.svg" alt="Postgres Management Studio" className="h-6 w-6" draggable="false" />
        <span>Postgres Management Studio</span>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-[#c3d7e8]">{version}</span>
      </div>
    </header>
  );
}
