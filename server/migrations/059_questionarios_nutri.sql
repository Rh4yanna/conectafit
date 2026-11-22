BEGIN;
CREATE TABLE questionarios_nutri (
 id BIGSERIAL PRIMARY KEY, nutri_id BIGINT NOT NULL REFERENCES usuarios(id), aluno_id BIGINT NOT NULL REFERENCES usuarios(id), ciclo INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('rascunho','enviado','respondido','revisado')),
 perguntas JSONB NOT NULL, respostas JSONB, versao INTEGER NOT NULL DEFAULT 1,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT now(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX questionarios_nutri_paciente ON questionarios_nutri(aluno_id,status,atualizado_em DESC);
COMMIT;
