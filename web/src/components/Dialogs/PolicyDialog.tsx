import { useEffect, useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';

const COMMANDS = ['ALL', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'];

interface PolicyDialogProps {
  serverId: number;
  database: string;
  schema: string;
  table: string;
  policy?: string | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function PolicyDialog({ serverId, database, schema, table, policy, onSaved, onClose }: PolicyDialogProps) {
  const editing = !!policy;
  const [name, setName] = useState(policy ?? '');
  const [command, setCommand] = useState('ALL');
  const [roles, setRoles] = useState('');
  const [permissive, setPermissive] = useState(true);
  const [using, setUsing] = useState('');
  const [withCheck, setWithCheck] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!policy) return;
    let cancelled = false;
    api.policies(serverId, database, schema, table)
      .then((list) => {
        if (cancelled) return;
        const found = list.find((p) => p.name === policy);
        if (!found) return;
        setName(found.name);
        setCommand(found.command || 'ALL');
        setRoles(found.roles.join(', '));
        setPermissive(found.permissive);
        setUsing(found.using);
        setWithCheck(found.with_check);
      })
      .catch((err) => setError((err as Error).message));
    return () => { cancelled = true; };
  }, [policy, serverId, database, schema, table]);

  const submit = async () => {
    setError(null);
    if (!name.trim()) { setError('Informe o nome da policy.'); return; }
    const payload = {
      name: name.trim(),
      command,
      roles: roles.split(',').map((s) => s.trim()).filter(Boolean),
      permissive,
      using: using.trim(),
      with_check: withCheck.trim(),
    };
    setBusy(true);
    try {
      if (editing) {
        await api.replacePolicy(serverId, database, schema, table, policy!, payload);
      } else {
        await api.createPolicy(serverId, database, schema, table, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? `Editar policy ${policy}` : `Nova policy em ${table}`} onClose={onClose} width={560}>
      <div className="form">
        <div className="form-row"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="form-row">
          <label>Comando</label>
          <select value={command} onChange={(e) => setCommand(e.target.value)}>
            {COMMANDS.map((cmd) => <option key={cmd} value={cmd}>{cmd}</option>)}
          </select>
        </div>
        <div className="form-row"><label>Roles</label><input value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="role1, role2 (vazio = PUBLIC)" /></div>
        <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={permissive} onChange={(e) => setPermissive(e.target.checked)} /> PERMISSIVE</label>
        <div className="form-row"><label>USING</label><input value={using} onChange={(e) => setUsing(e.target.value)} placeholder="ex: tenant_id = current_setting('app.tenant')" /></div>
        <div className="form-row"><label>WITH CHECK</label><input value={withCheck} onChange={(e) => setWithCheck(e.target.value)} placeholder="ex: tenant_id = current_setting('app.tenant')" /></div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Salvando...' : editing ? 'Salvar' : 'Criar policy'}</button>
        </div>
      </div>
    </Modal>
  );
}
