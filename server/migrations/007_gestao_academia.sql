BEGIN;
CREATE TABLE IF NOT EXISTS matriculas_academia (
  id BIGSERIAL PRIMARY KEY,
  academia_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  aluno_nome VARCHAR(120) NOT NULL,
  aluno_email VARCHAR(254) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(academia_id, aluno_email)
);
CREATE TABLE IF NOT EXISTS lancamentos_academia (
  id BIGSERIAL PRIMARY KEY,
  academia_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(10) NOT NULL CHECK(tipo IN ('receita','despesa')),
  descricao VARCHAR(200) NOT NULL,
  valor NUMERIC(12,2) NOT NULL CHECK(valor > 0),
  data DATE NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lancamentos_academia_data_idx ON lancamentos_academia(academia_id,data);
COMMIT;
