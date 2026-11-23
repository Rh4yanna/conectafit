CREATE TABLE IF NOT EXISTS funcionarios_academia (
 id BIGSERIAL PRIMARY KEY, academia_id BIGINT NOT NULL REFERENCES usuarios(id), autor_id BIGINT NOT NULL REFERENCES usuarios(id),
 equipe_id BIGINT REFERENCES equipe_academia(id), nome VARCHAR(120) NOT NULL, email VARCHAR(254) NOT NULL,
 telefone VARCHAR(30) NOT NULL DEFAULT '', cargo VARCHAR(100) NOT NULL DEFAULT '', setor TEXT NOT NULL CHECK(setor IN ('recepcao','professores','limpeza','lideranca','marketing')),
 turno TEXT NOT NULL CHECK(turno IN ('manha','tarde','noite','outro')), entrada TIME, saida TIME,
 dias JSONB NOT NULL DEFAULT '[]', observacoes TEXT NOT NULL DEFAULT '', ativo BOOLEAN NOT NULL DEFAULT TRUE, papel_solicitado TEXT CHECK(papel_solicitado IN ('gestor','recepcao','professor')),
 convite_hash TEXT UNIQUE, convite_expira TIMESTAMPTZ, versao INTEGER NOT NULL DEFAULT 1,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(academia_id,email)
);
CREATE INDEX IF NOT EXISTS funcionarios_academia_unidade ON funcionarios_academia(academia_id,setor,nome);
CREATE TABLE IF NOT EXISTS turnos_equipe_academia (
 academia_id BIGINT PRIMARY KEY REFERENCES usuarios(id), horarios JSONB NOT NULL DEFAULT '{}', atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
