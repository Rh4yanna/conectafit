CREATE TABLE IF NOT EXISTS compromissos_profissionais (
 id BIGSERIAL PRIMARY KEY,
 profissional_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 data DATE NOT NULL,
 horario TIME NOT NULL,
 observacao TEXT NOT NULL CHECK(length(observacao) BETWEEN 1 AND 2000),
 criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(profissional_id,data,horario)
);
