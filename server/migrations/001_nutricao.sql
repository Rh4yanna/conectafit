BEGIN;

CREATE TABLE IF NOT EXISTS perfis_nutri (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  crn VARCHAR(50),
  bio TEXT,
  cidade VARCHAR(120),
  contato VARCHAR(80),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conexoes_nutri (
  id BIGSERIAL PRIMARY KEY,
  nutri_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  objetivo VARCHAR(250),
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado', 'cancelado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (nutri_id, aluno_id)
);

CREATE TABLE IF NOT EXISTS planos_alimentares (
  id BIGSERIAL PRIMARY KEY,
  aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nutri_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  titulo VARCHAR(120) NOT NULL,
  descricao TEXT,
  meta_calorias INTEGER CHECK (meta_calorias IS NULL OR meta_calorias > 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refeicoes_plano (
  id BIGSERIAL PRIMARY KEY,
  plano_id BIGINT NOT NULL REFERENCES planos_alimentares(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  horario TIME,
  descricao TEXT,
  alimentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  ordem SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_planos_aluno_ativo ON planos_alimentares (aluno_id, ativo);
CREATE INDEX IF NOT EXISTS idx_conexoes_nutri_status ON conexoes_nutri (nutri_id, status);

COMMIT;
