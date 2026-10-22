BEGIN;
CREATE TABLE avaliacoes_personal (
 id BIGSERIAL PRIMARY KEY, personal_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, ciclo INTEGER NOT NULL,
 conteudo JSONB NOT NULL, versao INTEGER NOT NULL DEFAULT 1,
 criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(personal_id,aluno_id,ciclo)
);
CREATE TABLE revisoes_avaliacao_personal (
 avaliacao_id BIGINT NOT NULL REFERENCES avaliacoes_personal(id) ON DELETE CASCADE,
 versao INTEGER NOT NULL, conteudo JSONB NOT NULL, motivo TEXT NOT NULL, criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(avaliacao_id,versao)
);
CREATE TABLE demonstracoes_personal (
 id BIGSERIAL PRIMARY KEY, personal_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 chave_cliente UUID NOT NULL, catalogo_id TEXT, nome TEXT NOT NULL, grupo TEXT NOT NULL,
 equipamentos JSONB NOT NULL DEFAULT '[]', variacao TEXT NOT NULL DEFAULT '', instrucoes TEXT NOT NULL,
 mime TEXT NOT NULL CHECK(mime IN ('video/mp4','video/webm')), tamanho INTEGER NOT NULL CHECK(tamanho BETWEEN 1 AND 10485760),
 conteudo BYTEA NOT NULL, arquivada BOOLEAN NOT NULL DEFAULT FALSE, criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(personal_id,chave_cliente)
);
ALTER TABLE treinos ADD COLUMN versao_profissional INTEGER NOT NULL DEFAULT 1,
 ADD COLUMN avaliacao_referencia JSONB;
CREATE TABLE revisoes_fichas_personal (
 treino_id BIGINT NOT NULL REFERENCES treinos(id) ON DELETE CASCADE, versao INTEGER NOT NULL,
 conteudo JSONB NOT NULL, motivo TEXT NOT NULL, criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(treino_id,versao)
);
COMMIT;
