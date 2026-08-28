import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { api } from '../../api';
import type { ServerGroup, StudioServer } from '../../types';

const EMPTY: Omit<StudioServer, 'id'> = {
  name: '', host: 'localhost', port: 5432, username: 'postgres',
  password: '', database: 'postgres', ssl_mode: 'disable', server_group_id: null,
};

interface ConnectForm {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl_mode: string;
  server_group_id: number | string;
}

interface ConnectDialogProps {
  server?: StudioServer | null;
  groupId?: number | null;
  groups: ServerGroup[];
  onSaved: () => void;
  onClose: () => void;
}

export default function ConnectDialog({ server, groupId, groups, onSaved, onClose }: ConnectDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ConnectForm>(() =>
    (server
      ? { ...EMPTY, ...server, password: server.password || '', server_group_id: server.server_group_id ?? '' }
      : { ...EMPTY, server_group_id: groupId ?? '' }) as ConnectForm,
  );
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof ConnectForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const buildPayload = (): Omit<StudioServer, 'id'> => ({
    ...form,
    port: Number(form.port),
    server_group_id: form.server_group_id ? Number(form.server_group_id) : null,
  });

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const payload = buildPayload();
      if (server) {
        await api.put(`/servers/${server.id}`, payload);
      } else {
        await api.post('/servers', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const testConnection = async () => {
    setError(null);
    setTestMessage(null);
    setTestBusy(true);
    try {
      await api.testServer(buildPayload());
      setTestMessage(t('dialog.connect.success'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTestBusy(false);
    }
  };

  return (
    <Modal title={server ? t('dialog.connect.title.edit') : t('dialog.connect.title.new')} onClose={onClose}>
      <div className="form">
        <div className="form-row">
          <label>{t('dialog.connect.name')}</label>
          <input value={form.name} onChange={set('name')} placeholder={t('dialog.connect.placeholder.name')} autoFocus />
        </div>
        <div className="form-row">
          <label>{t('dialog.connect.group')}</label>
          <select value={form.server_group_id} onChange={set('server_group_id')}>
            <option value="">Servers</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>{t('dialog.connect.host')}</label>
            <input value={form.host} onChange={set('host')} />
          </div>
          <div className="form-row">
            <label>{t('dialog.connect.port')}</label>
            <input type="number" value={form.port} onChange={set('port')} />
          </div>
        </div>
        <div className="form-row">
          <label>{t('dialog.connect.username')}</label>
          <input value={form.username} onChange={set('username')} />
        </div>
        <div className="form-row">
          <label>{t('dialog.connect.password')}</label>
          <input type="password" value={form.password} onChange={set('password')} placeholder={t('dialog.connect.password_hint')} />
        </div>
        <div className="form-row">
          <label>{t('dialog.connect.database')}</label>
          <input value={form.database} onChange={set('database')} />
        </div>
        <div className="form-row">
          <label>SSL Mode</label>
          <select value={form.ssl_mode} onChange={set('ssl_mode')}>
            <option value="disable">disable</option>
            <option value="require">require</option>
            <option value="verify-ca">verify-ca</option>
            <option value="verify-full">verify-full</option>
          </select>
        </div>
        {testMessage && <div className="form-success">{testMessage}</div>}
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>{t('dialog.cancel.button')}</button>
          <button className="btn" disabled={testBusy || busy || !form.name} onClick={testConnection}>
            {testBusy ? t('dialog.connect.testing') : t('dialog.connect.test')}
          </button>
          <button className="btn primary" disabled={busy || !form.name} onClick={submit}>
            {busy ? t('dialog.connect.saving') : t('dialog.connect.save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
