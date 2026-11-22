ALTER TABLE agenda_academia DROP CONSTRAINT IF EXISTS agenda_academia_tipo_check;
ALTER TABLE agenda_academia ADD CONSTRAINT agenda_academia_tipo_check CHECK (tipo IN ('compromisso','avaliacao','evento','feriado','manutencao','outro'));
