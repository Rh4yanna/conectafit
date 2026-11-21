BEGIN;
CREATE TABLE itens_lista_compras (
 id BIGSERIAL PRIMARY KEY,
 aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 plano_id BIGINT NOT NULL REFERENCES planos_alimentares(id) ON DELETE CASCADE,
 nome VARCHAR(120) NOT NULL,
 quantidade NUMERIC(12,2) CHECK (quantidade > 0),
 unidade VARCHAR(20) NOT NULL DEFAULT 'un',
 categoria VARCHAR(30) NOT NULL DEFAULT 'Outros',
 comprado BOOLEAN NOT NULL DEFAULT FALSE,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX itens_lista_compras_dono ON itens_lista_compras(aluno_id,plano_id,id);
CREATE TABLE exemplos_treino_aluno (
 id BIGSERIAL PRIMARY KEY,
 aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 chave TEXT NOT NULL,
 titulo TEXT NOT NULL,
 inicio TIMESTAMPTZ NOT NULL,
 fim TIMESTAMPTZ NOT NULL,
 exercicios JSONB NOT NULL,
 observacoes TEXT NOT NULL,
 feedbacks JSONB NOT NULL DEFAULT '[]',
 UNIQUE(aluno_id,chave)
);
CREATE TABLE orientacoes_aluno (
 aluno_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
 cardio TEXT NOT NULL DEFAULT '',
 treino TEXT NOT NULL DEFAULT ''
);
CREATE TABLE substituicoes_aluno (
 id BIGSERIAL PRIMARY KEY,
 aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 plano_id BIGINT NOT NULL REFERENCES planos_alimentares(id) ON DELETE CASCADE,
 original VARCHAR(120) NOT NULL,
 escolhida VARCHAR(120) NOT NULL,
 atualizada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(aluno_id,plano_id,original)
);
COMMIT;
