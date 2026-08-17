interface StatusBarProps {
  text: string;
  error?: boolean;
  right?: string;
}

export default function StatusBar({ text, error, right }: StatusBarProps) {
  return (
    <footer className="flex h-6 shrink-0 items-center justify-between border-t border-border-soft bg-[#eef0f3] px-2.5 text-xs text-[#4b5563]">
      <span className={`${error ? 'text-danger' : ''}`}>{text}</span>
      <span className="text-muted">{right}</span>
    </footer>
  );
}
