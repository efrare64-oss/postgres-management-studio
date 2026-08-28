import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface AboutDialogProps {
  onClose: () => void;
}

export default function AboutDialog({ onClose }: AboutDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal title={t('about.title')} onClose={onClose}>
      <div className="about">
        <div className="mb-3 flex items-center gap-3">
          <img src="/logo.svg" alt={t('app.name')} className="h-12 w-12" draggable="false" />
          <div>
            <p className="m-0"><strong>{t('app.name')}</strong></p>
            <p className="m-0 text-sm text-muted">{t('about.description')}</p>
          </div>
        </div>
        <p>{t('about.version')} 0.4.0 • Stack: Go, React + TypeScript + Vite 8. + Tailwind 4.</p>
      </div>
    </Modal>
  );
}
