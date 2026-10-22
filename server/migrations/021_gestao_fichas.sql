ALTER TABLE treinos ADD COLUMN IF NOT EXISTS arquivada boolean NOT NULL DEFAULT false;
ALTER TABLE treinos ADD COLUMN IF NOT EXISTS inicio_em date;
ALTER TABLE treinos ADD COLUMN IF NOT EXISTS fim_em date;
ALTER TABLE treinos ADD CONSTRAINT periodo_treino_valido CHECK (fim_em IS NULL OR inicio_em IS NULL OR fim_em >= inicio_em);
CREATE TABLE rascunhos_fichas_personal (
 id bigserial PRIMARY KEY, personal_id integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 aluno_id integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, ciclo integer NOT NULL,
 conteudo jsonb NOT NULL, versao integer NOT NULL DEFAULT 1, atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE modelos_fichas_personal (
 id bigserial PRIMARY KEY, personal_id integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 conteudo jsonb NOT NULL, criado_em timestamptz NOT NULL DEFAULT now()
);
