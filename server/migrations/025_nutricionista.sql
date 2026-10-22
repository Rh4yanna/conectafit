BEGIN;
ALTER TABLE conexoes_nutri ADD COLUMN permite_diario boolean NOT NULL DEFAULT false;
ALTER TABLE conexoes_nutri ADD COLUMN permite_fotos_refeicoes boolean NOT NULL DEFAULT false;
ALTER TABLE planos_alimentares ADD COLUMN avaliacao_referencia jsonb;
ALTER TABLE planos_alimentares ADD COLUMN revisao_em date;
ALTER TABLE refeicoes_plano ADD COLUMN orientacoes text NOT NULL DEFAULT '';
CREATE TABLE anamneses_nutri (
 id bigserial PRIMARY KEY,nutri_id bigint NOT NULL REFERENCES usuarios(id),aluno_id bigint NOT NULL REFERENCES usuarios(id),
 ciclo integer NOT NULL,conteudo jsonb NOT NULL,versao integer NOT NULL DEFAULT 1,atualizada_em timestamptz NOT NULL DEFAULT now(),UNIQUE(nutri_id,aluno_id,ciclo)
);
CREATE TABLE revisoes_anamnese (anamnese_id bigint NOT NULL REFERENCES anamneses_nutri(id) ON DELETE CASCADE,versao integer NOT NULL,conteudo jsonb NOT NULL,motivo text NOT NULL,criada_em timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(anamnese_id,versao));
CREATE TABLE rascunhos_alimentares (id bigserial PRIMARY KEY,nutri_id bigint NOT NULL REFERENCES usuarios(id),aluno_id bigint NOT NULL REFERENCES usuarios(id),ciclo integer NOT NULL,conteudo jsonb NOT NULL,versao integer NOT NULL DEFAULT 1,atualizado_em timestamptz NOT NULL DEFAULT now());
CREATE TABLE modelos_alimentares (id bigserial PRIMARY KEY,nutri_id bigint NOT NULL REFERENCES usuarios(id),conteudo jsonb NOT NULL,criado_em timestamptz NOT NULL DEFAULT now());
CREATE TABLE retornos_nutri (id bigserial PRIMARY KEY,nutri_id bigint NOT NULL REFERENCES usuarios(id),aluno_id bigint NOT NULL REFERENCES usuarios(id),ciclo integer NOT NULL,tipo text NOT NULL CHECK(tipo IN ('orientacao','ajuste','retorno')),texto text NOT NULL,referencia jsonb NOT NULL,chave_cliente uuid NOT NULL,criado_em timestamptz NOT NULL DEFAULT now(),UNIQUE(nutri_id,chave_cliente));
COMMIT;
