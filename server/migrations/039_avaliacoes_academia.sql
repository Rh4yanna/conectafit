CREATE TABLE IF NOT EXISTS avaliacoes_academia (
 id BIGSERIAL PRIMARY KEY,
 academia_id INTEGER NOT NULL REFERENCES usuarios(id),
 matricula_id INTEGER NOT NULL REFERENCES matriculas_academia(id),
 autor_id INTEGER NOT NULL REFERENCES usuarios(id),
 data DATE NOT NULL,
 responsavel TEXT NOT NULL,
 objetivos TEXT NOT NULL DEFAULT '',
 observacoes TEXT NOT NULL DEFAULT '',
 medidas JSONB NOT NULL,
 chave_cliente UUID NOT NULL,
 criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(academia_id,chave_cliente)
);
CREATE INDEX IF NOT EXISTS avaliacoes_academia_aluno ON avaliacoes_academia(academia_id,matricula_id,data DESC);
