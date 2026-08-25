export function procedureTemplate(schema: string): string {
  return [
    'CREATE OR REPLACE PROCEDURE ' + schema + '.procedure_name()',
    'LANGUAGE plpgsql',
    'AS $$',
    'BEGIN',
    '',
    'END;',
    '$$;',
    '',
    '-- Para executar:',
    '-- CALL ' + schema + '.procedure_name();',
    '',
  ].join('\n');
}

export function functionTemplate(schema: string, returnType = 'void'): string {
  return [
    'CREATE OR REPLACE FUNCTION ' + schema + '.function_name()',
    'RETURNS ' + returnType,
    'LANGUAGE plpgsql',
    'VOLATILE',
    'AS $$',
    'BEGIN',
    '',
    'END;',
    '$$;',
    '',
  ].join('\n');
}

export function viewTemplate(schema: string, materialized = false): string {
  if (materialized) {
    return [
      'CREATE MATERIALIZED VIEW ' + schema + '.matview_name AS',
      'SELECT',
      '',
    ].join('\n');
  }
  return [
    'CREATE OR REPLACE VIEW ' + schema + '.view_name AS',
    'SELECT',
    '',
  ].join('\n');
}

export function sequenceTemplate(schema: string): string {
  return [
    'CREATE SEQUENCE ' + schema + '.sequence_name',
    '    AS bigint',
    '    START WITH 1',
    '    INCREMENT BY 1',
    '    NO MINVALUE',
    '    NO MAXVALUE',
    '    CACHE 1;',
    '',
  ].join('\n');
}

export function indexTemplate(schema: string, table: string): string {
  return [
    'CREATE INDEX idx_' + table + '_column_name',
    '    ON ' + schema + '.' + table + ' (column_name);',
    '',
  ].join('\n');
}

export function columnTemplate(schema: string, table: string): string {
  return [
    'ALTER TABLE ' + schema + '.' + table,
    '    ADD COLUMN column_name datatype;',
    '',
  ].join('\n');
}

export function constraintTemplate(schema: string, table: string): string {
  return [
    'ALTER TABLE ' + schema + '.' + table,
    '    ADD CONSTRAINT constraint_name PRIMARY KEY (column_name);',
    '-- Outras formas:',
    '-- ADD CONSTRAINT ... FOREIGN KEY (col) REFERENCES outra_tabela (col) ON DELETE CASCADE;',
    '-- ADD CONSTRAINT ... UNIQUE (col);',
    '-- ADD CONSTRAINT ... CHECK (condicao);',
    '',
  ].join('\n');
}

export function triggerTemplate(schema: string, table: string): string {
  return [
    'CREATE OR REPLACE TRIGGER trigger_name',
    '    AFTER INSERT OR UPDATE OR DELETE ON ' + schema + '.' + table,
    '    FOR EACH ROW',
    '    EXECUTE FUNCTION ' + schema + '.function_name();',
    '',
  ].join('\n');
}

export function policyTemplate(schema: string, table: string): string {
  return [
    'CREATE POLICY policy_name ON ' + schema + '.' + table,
    '    FOR ALL',
    '    TO public',
    '    USING (true)',
    '    WITH CHECK (true);',
    '',
  ].join('\n');
}

export function ruleTemplate(schema: string, table: string): string {
  return [
    'CREATE OR REPLACE RULE rule_name AS',
    '    ON INSERT TO ' + schema + '.' + table,
    '    DO INSTEAD NOTHING;',
    '',
  ].join('\n');
}



