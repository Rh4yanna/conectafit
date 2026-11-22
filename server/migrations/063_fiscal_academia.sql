CREATE TABLE IF NOT EXISTS configuracoes_fiscais_academia (
 academia_id BIGINT PRIMARY KEY REFERENCES usuarios(id), dados JSONB NOT NULL DEFAULT '{}', atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS documentos_fiscais_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), autor_id BIGINT NOT NULL REFERENCES usuarios(id),
 mensalidade_id BIGINT REFERENCES mensalidades_academia(id), matricula_id BIGINT REFERENCES matriculas_academia(id),
 chave_cliente UUID NOT NULL, dados JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'rascunho' CHECK(status IN ('rascunho','pendente_envio','processando','autorizada','rejeitada','cancelamento_solicitado','cancelada','erro_integracao')),
 numero TEXT, serie TEXT, emitida_em TIMESTAMPTZ, mensagem TEXT, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(academia_id,chave_cliente)
);
CREATE UNIQUE INDEX IF NOT EXISTS fiscal_mensalidade_ativa ON documentos_fiscais_academia(academia_id,mensalidade_id) WHERE mensalidade_id IS NOT NULL AND status NOT IN ('cancelada','rejeitada');
CREATE INDEX IF NOT EXISTS fiscal_academia_data ON documentos_fiscais_academia(academia_id,criado_em DESC);
CREATE TABLE IF NOT EXISTS eventos_fiscais_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), documento_id BIGINT NOT NULL REFERENCES documentos_fiscais_academia(id), autor_id BIGINT NOT NULL REFERENCES usuarios(id), tipo TEXT NOT NULL, descricao TEXT NOT NULL, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
