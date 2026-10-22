ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS excluida_em TIMESTAMPTZ;
ALTER TABLE perfis_personal ADD COLUMN IF NOT EXISTS email_contato TEXT;
ALTER TABLE perfis_nutri ADD COLUMN IF NOT EXISTS email_contato TEXT;
