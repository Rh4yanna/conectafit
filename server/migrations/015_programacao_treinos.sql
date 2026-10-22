BEGIN;
ALTER TABLE treinos ADD COLUMN IF NOT EXISTS dias_semana SMALLINT[] NOT NULL DEFAULT '{}';
ALTER TABLE treinos ADD CONSTRAINT treinos_dias_validos CHECK (dias_semana <@ ARRAY[0,1,2,3,4,5,6]::smallint[] AND cardinality(dias_semana)<=7);
CREATE INDEX IF NOT EXISTS sessoes_concluidas_aluno_data ON sessoes_treino(aluno_id,finalizada_em) WHERE status='concluida';
COMMIT;
