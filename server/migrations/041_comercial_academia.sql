BEGIN;
CREATE TABLE leads_academia (
 id BIGSERIAL PRIMARY KEY,
 academia_id BIGINT NOT NULL REFERENCES usuarios(id),
 nome TEXT NOT NULL,
 telefone TEXT NOT NULL DEFAULT '',
 email TEXT NOT NULL DEFAULT '',
 origem TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'novo' CHECK(status IN ('novo','em_contato','visita_agendada','convertido','perdido')),
 observacoes TEXT NOT NULL DEFAULT '',
 matricula_id BIGINT REFERENCES matriculas_academia(id),
 versao INTEGER NOT NULL DEFAULT 1,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 convertido_em TIMESTAMPTZ
);
CREATE UNIQUE INDEX leads_academia_email ON leads_academia(academia_id,lower(email)) WHERE email<>'';
CREATE TABLE interacoes_leads_academia (
 id BIGSERIAL PRIMARY KEY,
 lead_id BIGINT NOT NULL REFERENCES leads_academia(id),
 autor_id BIGINT NOT NULL REFERENCES usuarios(id),
 relato TEXT NOT NULL,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE agenda_academia ADD COLUMN lead_id BIGINT REFERENCES leads_academia(id);
CREATE INDEX leads_academia_unidade ON leads_academia(academia_id,criado_em DESC);
COMMIT;
