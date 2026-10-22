BEGIN;
ALTER TABLE planos_alimentares ADD COLUMN origem VARCHAR(16) NOT NULL DEFAULT 'pessoal' CHECK(origem IN ('pessoal','nutricionista'));
ALTER TABLE planos_alimentares ADD COLUMN autoria TEXT;
ALTER TABLE planos_alimentares ADD COLUMN versao INTEGER NOT NULL DEFAULT 1;
ALTER TABLE planos_alimentares ADD COLUMN vigente BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE planos_alimentares ADD COLUMN excluido_em TIMESTAMPTZ;
UPDATE planos_alimentares p SET origem='nutricionista',autoria=u.nome FROM usuarios u WHERE u.id=p.nutri_id;
CREATE UNIQUE INDEX plano_alimentar_vigente ON planos_alimentares(aluno_id) WHERE vigente AND excluido_em IS NULL;
CREATE TABLE versoes_alimentares (
  plano_id BIGINT NOT NULL REFERENCES planos_alimentares(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL,
  conteudo JSONB NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(plano_id,versao)
);
INSERT INTO versoes_alimentares(plano_id,versao,conteudo)
SELECT p.id,1,jsonb_build_object('titulo',p.titulo,'descricao',p.descricao,'meta_calorias',p.meta_calorias,'origem',p.origem,'autoria',p.autoria,
 'refeicoes',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id,'nome',r.nome,'horario',r.horario,'detalhes',r.descricao,'alimentos',r.alimentos) ORDER BY r.ordem,r.id) FROM refeicoes_plano r WHERE r.plano_id=p.id),'[]'::jsonb))
FROM planos_alimentares p;
CREATE TABLE diario_alimentar (
 id BIGSERIAL PRIMARY KEY,
 aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 chave_cliente UUID NOT NULL,
 plano_id BIGINT REFERENCES planos_alimentares(id) ON DELETE SET NULL,
 plano_versao INTEGER,
 refeicao_id TEXT,
 contexto JSONB,
 data DATE NOT NULL,
 horario TIME,
 nome VARCHAR(100) NOT NULL,
 status VARCHAR(16) NOT NULL CHECK(status IN ('realizada','parcial','nao_realizada')),
 observacoes TEXT NOT NULL DEFAULT '',
 dificuldades TEXT NOT NULL DEFAULT '',
 fome SMALLINT CHECK(fome BETWEEN 0 AND 10),
 saciedade SMALLINT CHECK(saciedade BETWEEN 0 AND 10),
 foto TEXT,
 versao INTEGER NOT NULL DEFAULT 1,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(aluno_id,chave_cliente)
);
CREATE INDEX diario_aluno_data ON diario_alimentar(aluno_id,data DESC,id DESC);
CREATE TABLE duvidas_alimentares (
 id BIGSERIAL PRIMARY KEY,
 aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 nutri_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
 chave_cliente UUID NOT NULL,
 plano_id BIGINT REFERENCES planos_alimentares(id) ON DELETE SET NULL,
 contexto JSONB NOT NULL,
 pergunta TEXT NOT NULL,
 resposta TEXT,
 criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 respondida_em TIMESTAMPTZ,
 UNIQUE(aluno_id,chave_cliente)
);
COMMIT;
