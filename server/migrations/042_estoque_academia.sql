BEGIN;
CREATE TABLE produtos_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id),
 nome TEXT NOT NULL, categoria TEXT NOT NULL, custo NUMERIC(12,2) NOT NULL CHECK(custo>=0),
 preco NUMERIC(12,2) NOT NULL CHECK(preco>=0), quantidade INTEGER NOT NULL DEFAULT 0 CHECK(quantidade>=0),
 minimo INTEGER NOT NULL DEFAULT 0 CHECK(minimo>=0), ativo BOOLEAN NOT NULL DEFAULT true,
 versao INTEGER NOT NULL DEFAULT 1, UNIQUE(academia_id,nome)
);
CREATE TABLE movimentos_estoque_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id),
 produto_id BIGINT NOT NULL REFERENCES produtos_academia(id), autor_id BIGINT NOT NULL REFERENCES usuarios(id),
 tipo TEXT NOT NULL CHECK(tipo IN ('entrada','saida','venda','devolucao')),
 quantidade INTEGER NOT NULL CHECK(quantidade>0), motivo TEXT NOT NULL,
 preco_unitario NUMERIC(12,2), lancamento_id BIGINT UNIQUE REFERENCES lancamentos_academia(id),
 chave_cliente UUID, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(academia_id,chave_cliente)
);
CREATE INDEX movimentos_estoque_periodo ON movimentos_estoque_academia(academia_id,criado_em DESC);
COMMIT;
