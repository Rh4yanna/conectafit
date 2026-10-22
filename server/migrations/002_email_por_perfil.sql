BEGIN;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'usuarios'::regclass
      AND conname = 'usuarios_email_tipo_key'
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT usuarios_email_tipo_key UNIQUE (email, tipo_usuario);
  END IF;
END $$;

COMMIT;
