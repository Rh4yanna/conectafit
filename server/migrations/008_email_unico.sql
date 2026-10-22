BEGIN;
-- Mantém contas antigas e impede reutilizar qualquer e-mail já registrado.
-- A chave primária também protege contra cadastros simultâneos.
CREATE TABLE IF NOT EXISTS emails_cadastrados (
  email TEXT PRIMARY KEY
);
INSERT INTO emails_cadastrados(email)
  SELECT DISTINCT lower(trim(email)) FROM usuarios ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION reservar_email_usuario() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF lower(trim(NEW.email)) = lower(trim(OLD.email)) THEN RETURN NEW; END IF;
  END IF;
  INSERT INTO emails_cadastrados(email) VALUES(lower(trim(NEW.email)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS usuarios_reservar_email ON usuarios;
CREATE TRIGGER usuarios_reservar_email BEFORE INSERT OR UPDATE OF email ON usuarios
  FOR EACH ROW EXECUTE FUNCTION reservar_email_usuario();
COMMIT;
