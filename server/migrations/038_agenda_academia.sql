CREATE TABLE IF NOT EXISTS agenda_academia (
 id BIGSERIAL PRIMARY KEY,
 academia_id INTEGER NOT NULL REFERENCES usuarios(id),
 matricula_id INTEGER REFERENCES matriculas_academia(id),
 titulo TEXT NOT NULL,
 tipo TEXT NOT NULL CHECK(tipo IN ('compromisso','avaliacao')),
 responsavel TEXT NOT NULL,
 inicio TIMESTAMPTZ NOT NULL,
 fim TIMESTAMPTZ NOT NULL CHECK(fim>inicio),
 observacao TEXT NOT NULL DEFAULT '',
 cancelado BOOLEAN NOT NULL DEFAULT false,
 versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS agenda_academia_periodo ON agenda_academia(academia_id,inicio);
