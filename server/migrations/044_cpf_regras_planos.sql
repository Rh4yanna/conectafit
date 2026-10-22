BEGIN;
ALTER TABLE matriculas_academia ADD COLUMN cpf TEXT CHECK(cpf IS NULL OR cpf ~ '^[0-9]{11}$');
CREATE UNIQUE INDEX matriculas_cpf_unidade ON matriculas_academia(academia_id,cpf) WHERE cpf IS NOT NULL;
ALTER TABLE planos_comerciais ADD COLUMN regras_acesso JSONB NOT NULL DEFAULT '{}';
ALTER TABLE planos_comerciais ADD COLUMN beneficios TEXT NOT NULL DEFAULT '';
COMMIT;
