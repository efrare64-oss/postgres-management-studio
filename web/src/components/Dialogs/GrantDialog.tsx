import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { api } from '../../api';

const PRIVILEGES = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'USAGE', 'EXECUTE', 'ALL'];

interface GrantDialogProps {
  serverId: number;
  database: string;
  objectKind?: string;
  objectName?: string;
  schema?: string;
  onSaved: () => void;
  onClose: () => void;
}

export default function GrantDialog({ serverId, database, objectKind: initialKind, objectName: initialName, schema, onSaved, onClose }: GrantDialogProps) {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<{ name: string }[]>([]);
  const [objectKind, setObjectKind] = useState(initialKind || 'table');
  const [objectName, setObjectName] = useState(initialName || '');
  const [schemaName, setSchemaName] = useState(schema || 'public');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPrivs, setSelectedPrivs] = useState<string[]>([]);
  const [withGrant, setWithGrant] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.roles(serverId)
      .then(setRoles)
      .catch(() => setRoles([]));
  }, [serverId]);

  const toggleRole = (name: string) =>
    setSelectedRoles((rs) => (rs.includes(name) ? rs.filter((r) => r !== name) : [...rs, name]));

  const togglePriv = (p: string) =>
    setSelectedPrivs((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));

  const submit = async () => {
    setError(null);
    if (selectedRoles.length === 0) { setError(t('dialog.grants.required_role')); return; }
    if (selectedPrivs.length === 0) { setError(t('dialog.grants.required_priv')); return; }
    setBusy(true);
    try {
      await api.applyGrants(serverId, database, {
        privileges: selectedPrivs,
        object_kind: objectKind,
        object_name: objectKind === 'schema' || objectKind.startsWith('all_') ? schemaName : objectName,
        schema: schemaName,
        roles: selectedRoles,
        with_grant: withGrant,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const needsObjectName = !['schema', 'database', 'tablespace', 'all_tables', 'all_sequences', 'all_functions'].includes(objectKind);

  return (
    <Modal title={t('dialog.grants.title')} onClose={onClose} width={620}>
      <div className="form">
        <div className="form-row">
          <label>{t('dialog.grants.object_type')}</label>
          <select value={objectKind} onChange={(e) => setObjectKind(e.target.value)}>
            <option value="table">Table</option>
            <option value="schema">Schema</option>
            <option value="sequence">Sequence</option>
            <option value="function">Function</option>
            <option value="database">Database</option>
            <option value="all_tables">All Tables (schema)</option>
            <option value="all_sequences">All Sequences (schema)</option>
            <option value="all_functions">All Functions (schema)</option>
          </select>
        </div>
        <div className="form-row"><label>{t('dialog.grants.schema')}</label><input value={schemaName} onChange={(e) => setSchemaName(e.target.value)} /></div>
        {needsObjectName && (
          <div className="form-row"><label>{t('dialog.grants.object')}</label><input value={objectName} onChange={(e) => setObjectName(e.target.value)} autoFocus /></div>
        )}

        <h4 className="section-title">{t('dialog.grants.privileges')}</h4>
        <div className="flex flex-wrap gap-2">
          {PRIVILEGES.map((p) => (
            <label key={p} className="inline-flex items-center gap-1 text-[13px]">
              <input type="checkbox" checked={selectedPrivs.includes(p)} onChange={() => togglePriv(p)} /> {p}
            </label>
          ))}
        </div>

        <h4 className="section-title">{t('dialog.grants.roles')}</h4>
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <label key={r.name} className="inline-flex items-center gap-1 text-[13px]">
              <input type="checkbox" checked={selectedRoles.includes(r.name)} onChange={() => toggleRole(r.name)} /> {r.name}
            </label>
          ))}
        </div>

        <label className="mt-2 inline-flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={withGrant} onChange={(e) => setWithGrant(e.target.checked)} /> WITH GRANT OPTION
        </label>

        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>{t('dialog.cancel.button')}</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? t('dialog.grants.applying') : t('dialog.grants.apply')}</button>
        </div>
      </div>
    </Modal>
  );
}
