BEGIN;
CREATE TABLE primeiros_passos (
 usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
 concluidos JSONB NOT NULL DEFAULT '[]', recolhido BOOLEAN NOT NULL DEFAULT false,
 versao INT NOT NULL DEFAULT 1, atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE atividade_conta (
 id BIGSERIAL PRIMARY KEY, usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
 metodo TEXT NOT NULL, rota TEXT NOT NULL, status INT NOT NULL, criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX atividade_conta_usuario_idx ON atividade_conta(usuario_id,id DESC);
COMMIT;
