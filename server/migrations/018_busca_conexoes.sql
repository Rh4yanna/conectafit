BEGIN;
CREATE TABLE ofertas_servicos (
 usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
 especialidades JSONB NOT NULL DEFAULT '[]', objetivos JSONB NOT NULL DEFAULT '[]', modalidades JSONB NOT NULL DEFAULT '[]',
 atendimento JSONB NOT NULL DEFAULT '[]', disponibilidade JSONB NOT NULL DEFAULT '[]', aceita_novos BOOLEAN,
 recebe_visitas BOOLEAN NOT NULL DEFAULT FALSE, oferece_experimental BOOLEAN NOT NULL DEFAULT FALSE,
 valor_visita NUMERIC(10,2), valor_experimental NUMERIC(10,2), condicoes TEXT NOT NULL DEFAULT '',
 versao INTEGER NOT NULL DEFAULT 1, atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE conexoes_alunos ADD COLUMN encerrado_em TIMESTAMPTZ, ADD COLUMN ciclo INTEGER NOT NULL DEFAULT 1;
ALTER TABLE conexoes_nutri ADD COLUMN encerrado_em TIMESTAMPTZ, ADD COLUMN ciclo INTEGER NOT NULL DEFAULT 1;
CREATE TABLE historico_conexoes (
 id BIGSERIAL PRIMARY KEY, tipo VARCHAR(16) NOT NULL, conexao_id BIGINT NOT NULL,
 aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 profissional_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
 profissional_nome TEXT NOT NULL, evento TEXT NOT NULL, estado JSONB NOT NULL,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX historico_conexoes_aluno ON historico_conexoes(aluno_id,criado_em DESC,id DESC);
INSERT INTO historico_conexoes(tipo,conexao_id,aluno_id,profissional_id,profissional_nome,evento,estado)
 SELECT 'personal',c.id,c.aluno_id,c.personal_id,u.nome,'estado_inicial',to_jsonb(c) FROM conexoes_alunos c JOIN usuarios u ON u.id=c.personal_id
 UNION ALL SELECT 'nutricionista',c.id,c.aluno_id,c.nutri_id,u.nome,'estado_inicial',to_jsonb(c) FROM conexoes_nutri c JOIN usuarios u ON u.id=c.nutri_id;
CREATE FUNCTION registrar_historico_conexao() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE atual JSONB:=to_jsonb(NEW); anterior JSONB; profissional BIGINT; tipo_nome TEXT; evento_nome TEXT; nome_autor TEXT;
BEGIN
 IF TG_TABLE_NAME='conexoes_alunos' THEN profissional:=(atual->>'personal_id')::bigint;tipo_nome:='personal';ELSE profissional:=(atual->>'nutri_id')::bigint;tipo_nome:='nutricionista';END IF;
 IF TG_OP='INSERT' THEN evento_nome:='solicitacao'; ELSE
  anterior:=to_jsonb(OLD);
  IF atual->>'status' IS DISTINCT FROM anterior->>'status' THEN evento_nome:=atual->>'status';
  ELSIF atual->>'ativo' IS DISTINCT FROM anterior->>'ativo' THEN evento_nome:=CASE WHEN NEW.ativo THEN 'reativado' ELSE 'desativado' END;
  ELSIF (atual-'criado_em'-'encerrado_em') IS DISTINCT FROM (anterior-'criado_em'-'encerrado_em') THEN evento_nome:='permissoes';
  ELSE RETURN NEW; END IF;
 END IF;
 SELECT nome INTO nome_autor FROM usuarios WHERE id=profissional;
 INSERT INTO historico_conexoes(tipo,conexao_id,aluno_id,profissional_id,profissional_nome,evento,estado)
 VALUES(tipo_nome,NEW.id,NEW.aluno_id,profissional,COALESCE(nome_autor,'Profissional'),evento_nome,atual);
 RETURN NEW;
END; $$;
CREATE TRIGGER historico_conexao_personal AFTER INSERT OR UPDATE ON conexoes_alunos FOR EACH ROW EXECUTE FUNCTION registrar_historico_conexao();
CREATE TRIGGER historico_conexao_nutri AFTER INSERT OR UPDATE ON conexoes_nutri FOR EACH ROW EXECUTE FUNCTION registrar_historico_conexao();
CREATE TABLE solicitacoes_academia (
 id BIGSERIAL PRIMARY KEY, aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 academia_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 chave_cliente UUID NOT NULL, tipo VARCHAR(16) NOT NULL CHECK(tipo IN ('visita','experimental')),
 data DATE NOT NULL, horario TIME NOT NULL, observacoes TEXT NOT NULL DEFAULT '', resposta TEXT NOT NULL DEFAULT '',
 status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','confirmada','recusada','cancelada','realizada','nao_compareceu')),
 oferta JSONB NOT NULL, versao INTEGER NOT NULL DEFAULT 1, criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(aluno_id,chave_cliente)
);
CREATE UNIQUE INDEX visita_aberta ON solicitacoes_academia(aluno_id,academia_id,tipo) WHERE status IN ('pendente','confirmada');
CREATE TABLE historico_visitas (
 id BIGSERIAL PRIMARY KEY, solicitacao_id BIGINT NOT NULL REFERENCES solicitacoes_academia(id) ON DELETE CASCADE,
 status VARCHAR(20) NOT NULL, resposta TEXT NOT NULL DEFAULT '', criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMIT;
