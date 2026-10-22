BEGIN;
CREATE OR REPLACE FUNCTION notificar_gestao_profissional() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE profissional bigint; caminho text;
BEGIN
 IF TG_TABLE_NAME IN ('conexoes_alunos','conexoes_nutri') THEN
  IF TG_TABLE_NAME='conexoes_alunos' THEN profissional:=NEW.personal_id;caminho:='/personal/dashboard?aba=solicitacoes';ELSE profissional:=NEW.nutri_id;caminho:='/nutri/dashboard?aba=solicitacoes';END IF;
  IF NEW.status='pendente' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
   PERFORM notificar_rotina(profissional,'solicitacoes',TG_TABLE_NAME||':'||NEW.id||':'||NEW.ciclo,'Você recebeu uma solicitação de conexão',caminho);
  END IF;
 ELSIF TG_TABLE_NAME='conversas_treino' THEN
  IF NEW.tipo='duvida' THEN PERFORM notificar_rotina(NEW.personal_id,'respostas','duvida:treino:'||NEW.id,'Um aluno enviou uma dúvida sobre treino','/personal/dashboard?aba=alunos');END IF;
 ELSIF TG_TABLE_NAME='duvidas_alimentares' THEN
  PERFORM notificar_rotina(NEW.nutri_id,'respostas','duvida:refeicao:'||NEW.id,'Um paciente enviou uma dúvida sobre refeição','/nutri/dashboard?aba=pacientes');
 ELSIF TG_TABLE_NAME='agenda_profissional' THEN
  SELECT CASE WHEN tipo_usuario='nutri' THEN '/nutri/dashboard?aba=agenda' ELSE '/personal/dashboard?aba=agenda' END INTO caminho FROM usuarios WHERE id=NEW.profissional_id;
  IF TG_OP='INSERT' OR NEW.versao<>OLD.versao THEN PERFORM notificar_rotina(NEW.profissional_id,'compromissos','gestao:agenda:'||NEW.id||':'||NEW.versao,'Atendimento: '||NEW.status,caminho);END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER aviso_solicitacao_nutri AFTER INSERT OR UPDATE ON conexoes_nutri FOR EACH ROW EXECUTE FUNCTION notificar_gestao_profissional();
CREATE TRIGGER aviso_duvida_nutri AFTER INSERT ON duvidas_alimentares FOR EACH ROW EXECUTE FUNCTION notificar_gestao_profissional();
COMMIT;
