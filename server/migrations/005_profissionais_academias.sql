BEGIN;

ALTER TABLE perfis_nutri ADD COLUMN IF NOT EXISTS foto_perfil TEXT;
ALTER TABLE perfis_nutri ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30);
ALTER TABLE perfis_nutri ADD COLUMN IF NOT EXISTS instagram VARCHAR(100);
ALTER TABLE perfis_nutri ADD COLUMN IF NOT EXISTS formacao TEXT;
ALTER TABLE perfis_nutri ADD COLUMN IF NOT EXISTS preco_diaria NUMERIC(10,2);
ALTER TABLE perfis_nutri ADD COLUMN IF NOT EXISTS preco_semanal NUMERIC(10,2);
ALTER TABLE perfis_nutri ADD COLUMN IF NOT EXISTS preco_mensal NUMERIC(10,2);
ALTER TABLE perfis_nutri ADD COLUMN IF NOT EXISTS preco_anual NUMERIC(10,2);

ALTER TABLE perfis_academia ADD COLUMN IF NOT EXISTS preco_diaria NUMERIC(10,2);
ALTER TABLE perfis_academia ADD COLUMN IF NOT EXISTS preco_mensal NUMERIC(10,2);
ALTER TABLE perfis_academia ADD COLUMN IF NOT EXISTS preco_anual NUMERIC(10,2);
ALTER TABLE perfis_academia ADD COLUMN IF NOT EXISTS modalidades JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE perfis_academia ADD COLUMN IF NOT EXISTS videos JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS agenda_profissional (
  id BIGSERIAL PRIMARY KEY,
  profissional_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  aluno_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  aluno_nome VARCHAR(120) NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  tipo VARCHAR(30) NOT NULL DEFAULT 'Presencial',
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (hora_fim > hora_inicio)
);
CREATE INDEX IF NOT EXISTS idx_agenda_profissional_data ON agenda_profissional(profissional_id,data);

CREATE TABLE IF NOT EXISTS visitas_perfil (
  id BIGSERIAL PRIMARY KEY,
  perfil_usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  visitante_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  visitado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visitas_perfil ON visitas_perfil(perfil_usuario_id,visitado_em);

COMMIT;
