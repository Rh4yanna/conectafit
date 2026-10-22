BEGIN;

DROP TRIGGER IF EXISTS usuarios_reservar_email ON usuarios;
DROP FUNCTION IF EXISTS reservar_email_usuario();
DROP TABLE IF EXISTS emails_cadastrados;

-- Mesmo e-mail pode identificar contas de perfis diferentes.
-- Impede duplicatas no mesmo perfil, inclusive com diferenças de maiúsculas.
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_perfil_normalizado_key
  ON usuarios (lower(trim(email)), lower(trim(tipo_usuario)));

COMMIT;
