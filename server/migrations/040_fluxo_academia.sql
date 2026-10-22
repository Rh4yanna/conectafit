CREATE TABLE IF NOT EXISTS acessos_academia (
 id BIGSERIAL PRIMARY KEY,
 academia_id BIGINT NOT NULL REFERENCES usuarios(id),
 matricula_id BIGINT NOT NULL REFERENCES matriculas_academia(id),
 entrada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 saida TIMESTAMPTZ,
 autor_entrada BIGINT NOT NULL REFERENCES usuarios(id),
 autor_saida BIGINT REFERENCES usuarios(id),
 CHECK(saida IS NULL OR saida>=entrada)
);
CREATE UNIQUE INDEX IF NOT EXISTS acessos_academia_aberto ON acessos_academia(matricula_id) WHERE saida IS NULL;
CREATE INDEX IF NOT EXISTS acessos_academia_periodo ON acessos_academia(academia_id,entrada DESC);
