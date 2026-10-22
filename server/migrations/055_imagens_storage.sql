BEGIN;
CREATE TABLE imagens_storage (
 id UUID PRIMARY KEY,
 dono_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
 autor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
 finalidade TEXT NOT NULL CHECK(finalidade IN ('perfil','galeria','evolucao','refeicao')),
 caminho TEXT NOT NULL UNIQUE,
 bucket TEXT NOT NULL,
 sha256 TEXT NOT NULL,
 mime TEXT NOT NULL,
 tamanho INTEGER NOT NULL CHECK(tamanho>0 AND tamanho<=4194304),
 estado TEXT NOT NULL DEFAULT 'pendente' CHECK(estado IN ('pendente','pronta','excluida')),
 criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX imagens_storage_dono ON imagens_storage(dono_id,finalidade,sha256);
COMMIT;
