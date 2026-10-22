ALTER TABLE duvidas_alimentares ADD COLUMN ciclo integer NOT NULL DEFAULT 1;
CREATE INDEX duvidas_nutri_ciclo ON duvidas_alimentares(nutri_id,aluno_id,ciclo,criada_em DESC);
