import React, { useState } from 'react';
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
        setError('Selecione um servidor.');
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
        if (!form.name.trim()) { setError('Informe o nome da role.'); setBusy(false); return; }
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
    <Modal title={role ? `Editar role: ${role.name}` : 'Nova role'} onClose={onClose}>
      <div className="form">
        <div className="form-row">
          <label>Nome</label>
          <input value={form.name} onChange={set('name')} disabled={!!role} autoFocus />
        </div>
        <div className="form-row">
          <label>Senha</label>
          <input type="password" value={form.password} onChange={set('password')} placeholder="Deixe em branco para manter" />
        </div>
        <div className="form-row">
          <label>Limite de conexões</label>
          <input type="number" value={form.conn_limit} onChange={set('conn_limit')} />
        </div>
        <div className="form-row check-group">
          {toggle('can_login', 'Pode logar')}
          {toggle('superuser', 'Superuser')}
          {toggle('create_db', 'Criar banco')}
          {toggle('replication', 'Replicação')}
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose} title="Cancelar"><Fa name="cancel" /> Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit} title="Salvar role">
            {busy ? 'Salvando...' : <><Fa name="save" /> Salvar</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
