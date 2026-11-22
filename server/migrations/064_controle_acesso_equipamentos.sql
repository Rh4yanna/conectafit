CREATE TABLE IF NOT EXISTS equipamentos_acesso_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), nome VARCHAR(120) NOT NULL, identificacao VARCHAR(120) NOT NULL,
 fabricante VARCHAR(120) NOT NULL DEFAULT '', modelo VARCHAR(120) NOT NULL DEFAULT '', localizacao VARCHAR(150) NOT NULL DEFAULT '',
 ativo BOOLEAN NOT NULL DEFAULT TRUE, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(academia_id,identificacao)
);
CREATE TABLE IF NOT EXISTS politicas_acesso_academia (
 academia_id BIGINT PRIMARY KEY REFERENCES usuarios(id), regras JSONB NOT NULL DEFAULT '{}', atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS tentativas_acesso_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), matricula_id BIGINT NOT NULL REFERENCES matriculas_academia(id),
 autor_id BIGINT NOT NULL REFERENCES usuarios(id), motivo TEXT NOT NULL, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tentativas_acesso_periodo ON tentativas_acesso_academia(academia_id,criado_em DESC);
