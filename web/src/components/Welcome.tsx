import { useTranslation } from 'react-i18next';

export default function Welcome() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center text-muted">
      <img src="/logo.svg" alt="Postgres Management Studio" className="h-20 w-20 drop-shadow" draggable="false" />
      <p className="text-xl text-[#374151]">{t('welcome.title')}</p>
      <p className="max-w-[500px] text-sm leading-relaxed">
        {t('welcome.description')}
      </p>
    </div>
  );
}
