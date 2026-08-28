import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Fa } from '../icons';
import { api } from '../api';

interface HeaderProps {
  version: string;
}

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'ja', label: 'JA' },
  { code: 'es', label: 'ES' },
  { code: 'ko', label: 'KO' },
  { code: 'ru', label: 'RU' },
  { code: 'it', label: 'IT' },
  { code: 'fr', label: 'FR' },
  { code: 'zh-Hans', label: '简' },
  { code: 'zh-Hant', label: '繁' },
  { code: 'pt-BR', label: 'PT' },
];

export default function Header({ version }: HeaderProps) {
  const { i18n, t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const handleLanguageChange = async (lang: string) => {
    await i18n.changeLanguage(lang);
    try {
      await api.put('/config/language', { language: lang });
    } catch {
      // ignore save error
    }
  };

  return (
    <header className="flex h-[46px] shrink-0 items-center justify-between border-b border-border bg-panel-bg px-3.5">
      <div className="flex items-center gap-2 text-[15px] font-medium tracking-wide whitespace-nowrap text-text">
        <img src="/logo.svg" alt={t('app.name')} className="h-6 w-6" draggable="false" />
        <span>{t('app.name')}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <select
          value={i18n.language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="h-7 cursor-pointer rounded border border-border bg-transparent px-1.5 text-[12px] text-text outline-none hover:border-pg-blue focus:border-pg-blue"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <button
          onClick={toggleTheme}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-border bg-transparent text-muted hover:bg-tb-hover hover:text-text"
          title={theme === 'light' ? t('theme.toggle.dark') : t('theme.toggle.light')}
        >
          <Fa name={theme === 'light' ? 'moon' : 'sun'} />
        </button>
        <span className="text-xs text-muted">{version}</span>
      </div>
    </header>
  );
}
