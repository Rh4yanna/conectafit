BEGIN;
CREATE TABLE IF NOT EXISTS sessoes_treino (
  id BIGSERIAL PRIMARY KEY,
  aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  treino_id BIGINT REFERENCES treinos(id) ON DELETE SET NULL,
  titulo VARCHAR(120) NOT NULL,
  exercicios JSONB NOT NULL,
  observacoes TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'em_andamento'
    CHECK (status IN ('em_andamento','pausada','concluida','incompleta')),
  versao INTEGER NOT NULL DEFAULT 1,
  iniciada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalizada_em TIMESTAMPTZ,
  retomada_em TIMESTAMPTZ DEFAULT NOW(),
  segundos_ativos INTEGER NOT NULL DEFAULT 0 CHECK (segundos_ativos >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS uma_sessao_ativa_por_aluno ON sessoes_treino(aluno_id)
  WHERE status IN ('em_andamento','pausada');
CREATE INDEX IF NOT EXISTS historico_sessoes_aluno ON sessoes_treino(aluno_id, iniciada_em DESC, id DESC);
COMMIT;
