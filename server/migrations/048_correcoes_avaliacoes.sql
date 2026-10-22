ALTER TABLE avaliacoes_academia ADD COLUMN corrige_id bigint UNIQUE REFERENCES avaliacoes_academia(id);
ALTER TABLE avaliacoes_academia ADD COLUMN motivo_correcao text NOT NULL DEFAULT '';
