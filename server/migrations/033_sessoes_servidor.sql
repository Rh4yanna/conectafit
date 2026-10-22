BEGIN;
CREATE TABLE IF NOT EXISTS sessoes_conta (
  token_hash CHAR(64) PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  versao_sessao INTEGER NOT NULL,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_em TIMESTAMPTZ NOT NULL,
  revogada_em TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sessoes_conta_usuario_idx ON sessoes_conta(usuario_id);
CREATE INDEX IF NOT EXISTS sessoes_conta_expiracao_idx ON sessoes_conta(expira_em);
COMMIT;
