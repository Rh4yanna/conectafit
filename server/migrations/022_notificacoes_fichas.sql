CREATE OR REPLACE FUNCTION eventos_rotina() RETURNS trigger LANGUAGE plpgsql AS $$
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
  IF a->>'origem'='personal' AND (TG_OP='INSERT' OR (a->'exercicios',a->'titulo',a->'dias_semana',a->'versao_profissional') IS DISTINCT FROM (anterior->'exercicios',anterior->'titulo',anterior->'dias_semana',anterior->'versao_profissional')) THEN
   PERFORM notificar_rotina((a->>'usuario_id')::bigint,'planos',chave_evento||':'||txid_current(),CASE WHEN a->>'arquivada'='true' THEN 'Seu profissional arquivou uma ficha de treino' ELSE 'Seu profissional publicou uma ficha de treino' END,'/aluno/treinos?ficha='||(a->>'id'));
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
