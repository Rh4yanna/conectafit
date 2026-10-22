BEGIN;
ALTER TABLE matriculas_academia ADD COLUMN IF NOT EXISTS telefone VARCHAR(30);
ALTER TABLE matriculas_academia ADD COLUMN IF NOT EXISTS plano VARCHAR(80);
ALTER TABLE matriculas_academia ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK(valor_mensal>=0);
ALTER TABLE matriculas_academia ADD COLUMN IF NOT EXISTS dia_vencimento SMALLINT NOT NULL DEFAULT 10 CHECK(dia_vencimento BETWEEN 1 AND 28);
CREATE TABLE IF NOT EXISTS mensalidades_academia (
  id BIGSERIAL PRIMARY KEY,
  matricula_id BIGINT NOT NULL REFERENCES matriculas_academia(id) ON DELETE CASCADE,
  competencia DATE NOT NULL CHECK(EXTRACT(DAY FROM competencia)=1),
  vencimento DATE NOT NULL,
  valor NUMERIC(10,2) NOT NULL CHECK(valor>0),
  pago_em DATE,
  UNIQUE(matricula_id,competencia)
);
ALTER TABLE lancamentos_academia ADD COLUMN IF NOT EXISTS mensalidade_id BIGINT UNIQUE REFERENCES mensalidades_academia(id) ON DELETE RESTRICT;
COMMIT;
