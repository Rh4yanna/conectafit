CREATE TABLE IF NOT EXISTS recursos_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id),
 tipo TEXT NOT NULL CHECK(tipo IN ('material','equipamento')), nome VARCHAR(120) NOT NULL,
 categoria VARCHAR(80) NOT NULL, descricao TEXT NOT NULL DEFAULT '', unidade VARCHAR(30) NOT NULL,
 quantidade NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK(quantidade>=0), minimo NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK(minimo>=0),
 localizacao VARCHAR(150) NOT NULL DEFAULT '', fornecedor VARCHAR(150) NOT NULL DEFAULT '', validade DATE,
 codigo_patrimonio VARCHAR(100), marca VARCHAR(100) NOT NULL DEFAULT '', modelo VARCHAR(100) NOT NULL DEFAULT '',
 numero_serie VARCHAR(120), aquisicao DATE, valor_aquisicao NUMERIC(12,2) CHECK(valor_aquisicao IS NULL OR valor_aquisicao>=0),
 conservacao VARCHAR(80) NOT NULL DEFAULT '', estado TEXT NOT NULL DEFAULT 'disponivel' CHECK(estado IN ('em_uso','disponivel','em_manutencao','fora_operacao','desativado')),
 observacoes TEXT NOT NULL DEFAULT '', ativo BOOLEAN NOT NULL DEFAULT TRUE, versao INTEGER NOT NULL DEFAULT 1, chave_cliente UUID NOT NULL,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(numero_serie IS NULL OR tipo='equipamento' AND quantidade<=1), UNIQUE(academia_id,chave_cliente)
);
CREATE UNIQUE INDEX IF NOT EXISTS recursos_patrimonio_codigo ON recursos_academia(academia_id,lower(codigo_patrimonio)) WHERE codigo_patrimonio IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS recursos_patrimonio_serie ON recursos_academia(academia_id,lower(numero_serie)) WHERE numero_serie IS NOT NULL;
CREATE INDEX IF NOT EXISTS recursos_academia_unidade ON recursos_academia(academia_id,tipo,nome);
CREATE TABLE IF NOT EXISTS movimentacoes_recursos_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), recurso_id BIGINT NOT NULL REFERENCES recursos_academia(id),
 autor_id BIGINT NOT NULL REFERENCES usuarios(id), tipo TEXT NOT NULL CHECK(tipo IN ('entrada','consumo','perda','ajuste','transferencia','baixa_patrimonial')),
 quantidade NUMERIC(12,3) NOT NULL CHECK(quantidade>=0), saldo_anterior NUMERIC(12,3) NOT NULL, saldo_posterior NUMERIC(12,3) NOT NULL,
 local_anterior VARCHAR(150) NOT NULL DEFAULT '', local_destino VARCHAR(150) NOT NULL DEFAULT '', data DATE NOT NULL,
 motivo TEXT NOT NULL, observacoes TEXT NOT NULL DEFAULT '', chave_cliente UUID NOT NULL, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(academia_id,chave_cliente)
);
CREATE INDEX IF NOT EXISTS movimentos_recursos_unidade ON movimentacoes_recursos_academia(academia_id,id DESC);
CREATE TABLE IF NOT EXISTS manutencoes_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), recurso_id BIGINT NOT NULL REFERENCES recursos_academia(id),
 autor_id BIGINT NOT NULL REFERENCES usuarios(id), tipo TEXT NOT NULL CHECK(tipo IN ('preventiva','corretiva')),
 solicitacao DATE NOT NULL, problema TEXT NOT NULL, responsavel VARCHAR(150) NOT NULL,
 prioridade TEXT NOT NULL CHECK(prioridade IN ('baixa','media','alta','urgente')),
 status TEXT NOT NULL CHECK(status IN ('pendente','agendada','em_andamento','concluida','cancelada')),
 prevista DATE, conclusao DATE, custo NUMERIC(12,2) CHECK(custo IS NULL OR custo>=0), observacoes TEXT NOT NULL DEFAULT '',
 versao INTEGER NOT NULL DEFAULT 1, chave_cliente UUID NOT NULL, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(status<>'concluida' OR conclusao IS NOT NULL), UNIQUE(academia_id,chave_cliente)
);
CREATE INDEX IF NOT EXISTS manutencoes_academia_unidade ON manutencoes_academia(academia_id,id DESC);
