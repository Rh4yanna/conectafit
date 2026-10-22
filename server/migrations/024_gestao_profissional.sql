BEGIN;
ALTER TABLE conexoes_alunos ADD COLUMN interesse jsonb NOT NULL DEFAULT '{}';
ALTER TABLE conexoes_nutri ADD COLUMN interesse jsonb NOT NULL DEFAULT '{}';
ALTER TABLE ofertas_servicos ADD COLUMN servicos jsonb NOT NULL DEFAULT '[]';
ALTER TABLE preferencias_notificacao ADD COLUMN solicitacoes boolean NOT NULL DEFAULT true;
ALTER TABLE notificacoes DROP CONSTRAINT notificacoes_categoria_check;
ALTER TABLE notificacoes ADD CONSTRAINT notificacoes_categoria_check CHECK(categoria IN ('planos','respostas','compromissos','checkins','solicitacoes'));
CREATE TABLE convites_personal (
 id bigserial PRIMARY KEY, personal_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE, expira_em timestamptz NOT NULL DEFAULT now()+interval '7 days',
 revogado boolean NOT NULL DEFAULT false, utilizado_por bigint REFERENCES usuarios(id) ON DELETE SET NULL,
 utilizado_em timestamptz, criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE importacoes_personal (
 id bigserial PRIMARY KEY, personal_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 conteudo jsonb NOT NULL, modelos_ids jsonb, criada_em timestamptz NOT NULL DEFAULT now(),
 confirmada_em timestamptz
);
CREATE FUNCTION notificar_gestao_profissional() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='conexoes_alunos' THEN
  IF NEW.status='pendente' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
   PERFORM notificar_rotina(NEW.personal_id,'solicitacoes','conexao:'||NEW.id||':'||NEW.ciclo,'Você recebeu uma solicitação de conexão','/personal/dashboard?aba=solicitacoes');
  END IF;
 ELSIF TG_TABLE_NAME='conversas_treino' THEN
  IF NEW.tipo='duvida' THEN PERFORM notificar_rotina(NEW.personal_id,'respostas','duvida:treino:'||NEW.id,'Um aluno enviou uma dúvida sobre treino','/personal/dashboard?aba=alunos'); END IF;
 ELSIF TG_TABLE_NAME='agenda_profissional' THEN
  IF EXISTS(SELECT 1 FROM usuarios WHERE id=NEW.profissional_id AND tipo_usuario='personal') AND (TG_OP='INSERT' OR NEW.versao<>OLD.versao) THEN
   PERFORM notificar_rotina(NEW.profissional_id,'compromissos','gestao:agenda:'||NEW.id||':'||NEW.versao,'Atendimento: '||NEW.status,'/personal/dashboard?aba=agenda');
  END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER aviso_solicitacao_personal AFTER INSERT OR UPDATE ON conexoes_alunos FOR EACH ROW EXECUTE FUNCTION notificar_gestao_profissional();
CREATE TRIGGER aviso_duvida_personal AFTER INSERT ON conversas_treino FOR EACH ROW EXECUTE FUNCTION notificar_gestao_profissional();
CREATE TRIGGER aviso_agenda_personal AFTER INSERT OR UPDATE ON agenda_profissional FOR EACH ROW EXECUTE FUNCTION notificar_gestao_profissional();
COMMIT;
