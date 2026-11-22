CREATE TABLE IF NOT EXISTS feedbacks_academia (
 id BIGSERIAL PRIMARY KEY,
 academia_id BIGINT NOT NULL REFERENCES usuarios(id),
 matricula_id BIGINT NOT NULL REFERENCES matriculas_academia(id),
 nota SMALLINT NOT NULL CHECK(nota BETWEEN 1 AND 5),
 comentario TEXT NOT NULL DEFAULT '',
 foto_url TEXT,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(academia_id,matricula_id)
);
CREATE INDEX IF NOT EXISTS feedbacks_academia_unidade ON feedbacks_academia(academia_id,criado_em DESC,id DESC);
