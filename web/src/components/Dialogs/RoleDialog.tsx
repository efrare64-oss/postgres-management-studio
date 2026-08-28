import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { api } from '../../api';
import { Fa } from '../../icons';
import type { Role } from '../../types';

interface RoleDialogProps {
  serverId: number | null;
  role?: Role | null;
  onSaved: () => void;
  onClose: () => void;
}

interface RoleForm {
  name: string;
  password: string;
  superuser: boolean;
  create_db: boolean;
  can_login: boolean;
  replication: boolean;
  conn_limit: number;
}

export default function RoleDialog({ serverId, role, onSaved, onClose }: RoleDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<RoleForm>(role
    ? {
        name: role.name,
        password: '',
        superuser: role.superuser,
        create_db: role.create_db,
        can_login: role.can_login,
        replication: role.replication,
        conn_limit: role.conn_limit || -1,
      }
    : {
        name: '', password: '', superuser: false, create_db: false,
        can_login: true, replication: false, conn_limit: -1,
      });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof RoleForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (!serverId) {
        setError(t('dialog.role.required_server'));
        setBusy(false);
        return;
      }
      const payload = {
        name: form.name,
        password: form.password,
        superuser: form.superuser,
        create_db: form.create_db,
        can_login: form.can_login,
        replication: form.replication,
        conn_limit: Number(form.conn_limit),
      };
      if (role) {
        await api.patch(`/servers/${serverId}/roles/${encodeURIComponent(role.name)}`, payload);
      } else {
        if (!form.name.trim()) { setError(t('dialog.role.required_name')); setBusy(false); return; }
        await api.post(`/servers/${serverId}/roles`, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (k: 'can_login' | 'superuser' | 'create_db' | 'replication', label: string) => (
    <label className="col-check">
      <input type="checkbox" checked={form[k]} onChange={set(k)} /> {label}
    </label>
  );

  return (
    <Modal title={role ? t('dialog.role.title_edit', { name: role.name }) : t('dialog.role.title_new')} onClose={onClose}>
      <div className="form">
        <div className="form-row">
          <label>{t('dialog.role.name')}</label>
          <input value={form.name} onChange={set('name')} disabled={!!role} autoFocus />
        </div>
        <div className="form-row">
          <label>{t('dialog.role.password')}</label>
          <input type="password" value={form.password} onChange={set('password')} placeholder={t('dialog.role.password_hint')} />
        </div>
        <div className="form-row">
          <label>{t('dialog.role.conn_limit')}</label>
          <input type="number" value={form.conn_limit} onChange={set('conn_limit')} />
        </div>
        <div className="form-row check-group">
          {toggle('can_login', t('dialog.role.can_login'))}
          {toggle('superuser', t('dialog.role.superuser'))}
          {toggle('create_db', t('dialog.role.create_db'))}
          {toggle('replication', t('dialog.role.replication'))}
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose} title={t('dialog.cancel.button')}><Fa name="cancel" /> {t('dialog.cancel.button')}</button>
          <button className="btn primary" disabled={busy} onClick={submit} title={t('dialog.role.save')}>
            {busy ? t('dialog.role.saving') : <><Fa name="save" /> {t('dialog.role.save')}</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
