BEGIN;
ALTER TABLE sessoes_treino
 ADD COLUMN dificuldade smallint CHECK(dificuldade BETWEEN 1 AND 5),
 ADD COLUMN satisfacao smallint CHECK(satisfacao BETWEEN 1 AND 5),
 ADD COLUMN sensacao_durante text NOT NULL DEFAULT '',
 ADD COLUMN sensacao_apos text NOT NULL DEFAULT '';
CREATE TABLE respostas_feedback_personal (
 id bigserial PRIMARY KEY,
 sessao_id bigint NOT NULL REFERENCES sessoes_treino(id) ON DELETE CASCADE,
 personal_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 ciclo integer NOT NULL,
 resposta text NOT NULL CHECK(length(resposta) BETWEEN 1 AND 3000),
 criada_em timestamptz NOT NULL DEFAULT now(),
 UNIQUE(sessao_id,personal_id,ciclo)
);
CREATE INDEX feedbacks_sessoes_finalizadas ON sessoes_treino(aluno_id,finalizada_em DESC) WHERE status IN ('concluida','incompleta');
COMMIT;
