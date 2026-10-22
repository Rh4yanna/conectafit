BEGIN;
ALTER TABLE agenda_profissional ADD COLUMN status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','confirmado','remarcacao','cancelado','realizado','ausente')),
 ADD COLUMN versao INTEGER NOT NULL DEFAULT 1, ADD COLUMN orientacoes TEXT NOT NULL DEFAULT '',
 ADD COLUMN proposta JSONB, ADD COLUMN motivo TEXT NOT NULL DEFAULT '', ADD COLUMN alterado_por BIGINT,
 ADD COLUMN atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE agenda_profissional SET status='confirmado' WHERE aluno_id IS NULL;
CREATE TABLE historico_agenda (
 id BIGSERIAL PRIMARY KEY, agenda_id BIGINT NOT NULL REFERENCES agenda_profissional(id) ON DELETE CASCADE,
 estado JSONB NOT NULL, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO historico_agenda(agenda_id,estado) SELECT id,to_jsonb(a)-'observacao' FROM agenda_profissional a;
CREATE INDEX agenda_aluno_data ON agenda_profissional(aluno_id,data);
CREATE TABLE checkins_semanais (
 id BIGSERIAL PRIMARY KEY, aluno_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 semana DATE NOT NULL, dificuldades TEXT NOT NULL DEFAULT '', conquistas TEXT NOT NULL DEFAULT '',
 proximo_passo TEXT NOT NULL DEFAULT '', energia SMALLINT CHECK(energia BETWEEN 1 AND 5),
 destinatarios JSONB NOT NULL DEFAULT '[]', versao INTEGER NOT NULL DEFAULT 1,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(aluno_id,semana)
);
CREATE TABLE respostas_checkin (
 id BIGSERIAL PRIMARY KEY, checkin_id BIGINT NOT NULL REFERENCES checkins_semanais(id) ON DELETE CASCADE,
 profissional_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL, autor_nome TEXT NOT NULL,
 referencia JSONB NOT NULL, resposta TEXT NOT NULL, chave_cliente UUID NOT NULL,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(profissional_id,chave_cliente)
);
CREATE TABLE preferencias_notificacao (
 usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
 planos BOOLEAN NOT NULL DEFAULT TRUE, respostas BOOLEAN NOT NULL DEFAULT TRUE,
 compromissos BOOLEAN NOT NULL DEFAULT TRUE, checkins BOOLEAN NOT NULL DEFAULT TRUE, versao INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE notificacoes (
 id BIGSERIAL PRIMARY KEY, usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 categoria TEXT NOT NULL CHECK(categoria IN ('planos','respostas','compromissos','checkins')),
 chave TEXT NOT NULL, titulo TEXT NOT NULL, destino TEXT NOT NULL,
 criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), lida_em TIMESTAMPTZ, UNIQUE(usuario_id,chave)
);
CREATE INDEX notificacoes_usuario ON notificacoes(usuario_id,criada_em DESC,id DESC);
CREATE FUNCTION notificar_rotina(destinatario BIGINT, categoria_nome TEXT, chave_evento TEXT, titulo_evento TEXT, rota TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
 IF destinatario IS NULL THEN RETURN; END IF;
 IF COALESCE((SELECT (to_jsonb(p)->>categoria_nome)::boolean FROM preferencias_notificacao p WHERE usuario_id=destinatario),TRUE) THEN
  INSERT INTO notificacoes(usuario_id,categoria,chave,titulo,destino) VALUES(destinatario,categoria_nome,chave_evento,titulo_evento,rota) ON CONFLICT(usuario_id,chave) DO NOTHING;
 END IF;
END; $$;
CREATE FUNCTION eventos_rotina() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a JSONB:=to_jsonb(NEW); anterior JSONB; destino BIGINT; chave_evento TEXT; rota TEXT;
BEGIN
 IF TG_OP='UPDATE' THEN anterior:=to_jsonb(OLD); END IF;
 chave_evento:=TG_TABLE_NAME||':'||(a->>'id')||':'||COALESCE(a->>'versao',a->>'respondida_em','1');
 IF TG_TABLE_NAME='agenda_profissional' THEN
  IF TG_OP='UPDATE' AND NEW.versao=OLD.versao THEN RETURN NEW; END IF;
  INSERT INTO historico_agenda(agenda_id,estado) VALUES(NEW.id,a-'observacao');
  UPDATE notificacoes SET lida_em=COALESCE(lida_em,NOW()) WHERE chave LIKE 'lembrete:agenda:'||NEW.id||':%';
  PERFORM notificar_rotina(NEW.aluno_id,'compromissos',chave_evento,'Atendimento: '||NEW.status,'/aluno/rotina#agenda');
 ELSIF TG_TABLE_NAME='treinos' THEN
  IF a->>'origem'='personal' AND (TG_OP='INSERT' OR (a->'exercicios',a->'titulo',a->'dias_semana') IS DISTINCT FROM (anterior->'exercicios',anterior->'titulo',anterior->'dias_semana')) THEN
   PERFORM notificar_rotina((a->>'usuario_id')::bigint,'planos',chave_evento||':'||txid_current(),'Seu profissional publicou uma ficha de treino','/aluno/treinos?ficha='||(a->>'id'));
  END IF;
 ELSIF TG_TABLE_NAME='planos_alimentares' THEN
  IF NEW.origem='nutricionista' AND (TG_OP='INSERT' OR NEW.versao<>OLD.versao) THEN
   PERFORM notificar_rotina(NEW.aluno_id,'planos',chave_evento,'Seu nutricionista publicou um plano alimentar','/aluno/dietas');
  END IF;
 ELSIF TG_TABLE_NAME='duvidas_alimentares' THEN
  IF NEW.resposta IS NOT NULL AND (TG_OP='INSERT' OR OLD.resposta IS DISTINCT FROM NEW.resposta) THEN
   PERFORM notificar_rotina(NEW.aluno_id,'respostas',chave_evento,'Sua dúvida sobre alimentação recebeu uma resposta','/aluno/rotina#retornos');
  END IF;
 ELSIF TG_TABLE_NAME='comentarios_evolucao' THEN
  PERFORM notificar_rotina(NEW.aluno_id,'respostas',chave_evento,'Você recebeu um comentário sobre sua evolução','/aluno/rotina#retornos');
 ELSIF TG_TABLE_NAME='respostas_checkin' THEN
  SELECT aluno_id INTO destino FROM checkins_semanais WHERE id=NEW.checkin_id;
  PERFORM notificar_rotina(destino,'respostas',chave_evento,'Seu check-in recebeu um retorno profissional','/aluno/rotina#retornos');
 ELSIF TG_TABLE_NAME='solicitacoes_academia' THEN
  IF TG_OP='UPDATE' AND NEW.versao<>OLD.versao THEN
   PERFORM notificar_rotina(NEW.aluno_id,'compromissos',chave_evento,'Solicitação à academia: '||NEW.status,'/aluno/conexoes');
  END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER evento_agenda AFTER INSERT OR UPDATE ON agenda_profissional FOR EACH ROW EXECUTE FUNCTION eventos_rotina();
CREATE TRIGGER evento_treino AFTER INSERT OR UPDATE ON treinos FOR EACH ROW EXECUTE FUNCTION eventos_rotina();
CREATE TRIGGER evento_plano AFTER INSERT OR UPDATE ON planos_alimentares FOR EACH ROW EXECUTE FUNCTION eventos_rotina();
CREATE TRIGGER evento_duvida AFTER INSERT OR UPDATE ON duvidas_alimentares FOR EACH ROW EXECUTE FUNCTION eventos_rotina();
CREATE TRIGGER evento_evolucao AFTER INSERT ON comentarios_evolucao FOR EACH ROW EXECUTE FUNCTION eventos_rotina();
CREATE TRIGGER evento_checkin AFTER INSERT ON respostas_checkin FOR EACH ROW EXECUTE FUNCTION eventos_rotina();
CREATE TRIGGER evento_visita AFTER UPDATE ON solicitacoes_academia FOR EACH ROW EXECUTE FUNCTION eventos_rotina();
CREATE FUNCTION encerrar_agenda_vinculo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE profissional BIGINT;
BEGIN
 IF (NEW.status<>'aceito' OR NOT NEW.ativo) AND OLD.status='aceito' AND OLD.ativo THEN
  profissional:=COALESCE((to_jsonb(NEW)->>'personal_id')::bigint,(to_jsonb(NEW)->>'nutri_id')::bigint);
  UPDATE agenda_profissional SET status='cancelado',proposta=NULL,motivo='Acompanhamento encerrado ou desativado.',versao=versao+1,atualizado_em=NOW(),alterado_por=NULL
   WHERE profissional_id=profissional AND aluno_id=NEW.aluno_id AND status IN ('pendente','confirmado','remarcacao') AND data+hora_fim>NOW() AT TIME ZONE 'America/Sao_Paulo';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER encerrar_agenda_personal AFTER UPDATE ON conexoes_alunos FOR EACH ROW EXECUTE FUNCTION encerrar_agenda_vinculo();
CREATE TRIGGER encerrar_agenda_nutri AFTER UPDATE ON conexoes_nutri FOR EACH ROW EXECUTE FUNCTION encerrar_agenda_vinculo();
COMMIT;
