BEGIN;
CREATE TABLE atendimentos_nutricionais (
 id BIGSERIAL PRIMARY KEY,
 nutri_id BIGINT NOT NULL REFERENCES usuarios(id),
 aluno_id BIGINT NOT NULL REFERENCES usuarios(id),
 ciclo INTEGER NOT NULL,
 data_atendimento DATE NOT NULL,
 conteudo JSONB NOT NULL,
 retifica_id BIGINT REFERENCES atendimentos_nutricionais(id),
 motivo_retificacao TEXT,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK ((retifica_id IS NULL AND motivo_retificacao IS NULL) OR (retifica_id IS NOT NULL AND length(trim(motivo_retificacao)) >= 10))
);
CREATE INDEX atendimentos_nutricionais_busca ON atendimentos_nutricionais(nutri_id,aluno_id,ciclo,data_atendimento DESC,id DESC);
COMMIT;
