BEGIN;
ALTER TABLE metas_aluno ADD COLUMN versao INTEGER NOT NULL DEFAULT 1;
CREATE TABLE revisoes_metas (
 aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 versao INTEGER NOT NULL, conteudo JSONB NOT NULL, motivo TEXT NOT NULL DEFAULT '',
 criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(aluno_id,versao)
);
INSERT INTO revisoes_metas(aluno_id,versao,conteudo,motivo) SELECT aluno_id,versao,to_jsonb(m),'Estado inicial do histórico de revisões' FROM metas_aluno m;
CREATE TABLE hidratacao_aluno (
 id BIGSERIAL PRIMARY KEY, aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 chave_cliente UUID NOT NULL, data DATE NOT NULL, horario TIME,
 quantidade_ml INTEGER NOT NULL CHECK(quantidade_ml BETWEEN 1 AND 5000),
 versao INTEGER NOT NULL DEFAULT 1, criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(aluno_id,chave_cliente)
);
CREATE INDEX hidratacao_aluno_data ON hidratacao_aluno(aluno_id,data DESC,id DESC);
CREATE TABLE objetivos_aluno (
 id BIGSERIAL PRIMARY KEY, aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 titulo VARCHAR(120) NOT NULL, indicador VARCHAR(30) NOT NULL,
 direcao VARCHAR(10) NOT NULL CHECK(direcao IN ('aumentar','reduzir')),
 alvo NUMERIC(12,2) NOT NULL CHECK(alvo>0), inicio DATE NOT NULL, prazo DATE NOT NULL CHECK(prazo>=inicio),
 etapas JSONB NOT NULL DEFAULT '[]', status VARCHAR(12) NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo','pausado','arquivado')),
 versao INTEGER NOT NULL DEFAULT 1, criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE revisoes_objetivos (
 objetivo_id BIGINT NOT NULL REFERENCES objetivos_aluno(id) ON DELETE CASCADE,
 versao INTEGER NOT NULL, conteudo JSONB NOT NULL, motivo TEXT NOT NULL,
 criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(objetivo_id,versao)
);
CREATE TABLE comentarios_evolucao (
 id BIGSERIAL PRIMARY KEY, aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 profissional_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
 autor_nome TEXT NOT NULL, autor_tipo VARCHAR(10) NOT NULL,
 alvo_tipo VARCHAR(12) NOT NULL CHECK(alvo_tipo IN ('medida','foto','objetivo','metas')),
 alvo_id BIGINT NOT NULL, referencia TEXT NOT NULL, comentario TEXT NOT NULL,
 chave_cliente UUID NOT NULL, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(profissional_id,chave_cliente)
);
CREATE INDEX comentarios_aluno ON comentarios_evolucao(aluno_id,criado_em DESC,id DESC);
COMMIT;
