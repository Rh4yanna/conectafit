BEGIN;
ALTER TABLE treinos ADD COLUMN revisao_em date;
CREATE TABLE conversas_treino (
 id bigserial PRIMARY KEY, aluno_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 personal_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, ciclo integer NOT NULL,
 sessao_id bigint REFERENCES sessoes_treino(id) ON DELETE SET NULL, referencia jsonb NOT NULL,
 tipo text NOT NULL CHECK(tipo IN ('duvida','orientacao','revisao','retorno')),
 texto text NOT NULL CHECK(length(texto) BETWEEN 1 AND 3000),
 resposta text, respondida_em timestamptz, chave_cliente uuid NOT NULL,
 criado_em timestamptz NOT NULL DEFAULT now(), UNIQUE(aluno_id,personal_id,chave_cliente)
);
CREATE INDEX conversas_treino_aluno ON conversas_treino(aluno_id,criado_em DESC);
CREATE INDEX conversas_treino_personal ON conversas_treino(personal_id,aluno_id,ciclo);
COMMIT;
