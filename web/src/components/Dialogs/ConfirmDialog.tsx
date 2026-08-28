import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel, danger, busy: externalBusy, onConfirm, onClose }: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = externalBusy ?? busy;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} width={440}>
      <div className="form">
        <p className="text-[13px] text-[#374151]">{message}</p>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>{t('dialog.cancel.button')}</button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} disabled={running} onClick={submit}>
            {running ? '...' : (confirmLabel ?? t('dialog.confirm.button'))}
          </button>
        </div>
      </div>
    </Modal>
  );
}
