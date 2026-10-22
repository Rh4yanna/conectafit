ALTER TABLE solicitacoes_academia ADD COLUMN IF NOT EXISTS lead_id bigint REFERENCES leads_academia(id);
CREATE OR REPLACE FUNCTION vincular_solicitacao_comercial() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pessoa record; interessado bigint;
BEGIN
 IF NEW.lead_id IS NOT NULL THEN RETURN NEW; END IF;
 SELECT nome,lower(email) AS email,telefone INTO pessoa FROM usuarios WHERE id=NEW.aluno_id;
 INSERT INTO leads_academia(academia_id,nome,email,telefone,origem,observacoes)
 VALUES(NEW.academia_id,pessoa.nome,pessoa.email,COALESCE(pessoa.telefone,''),'Perfil público','')
 ON CONFLICT(academia_id,lower(email)) WHERE email<>'' DO UPDATE SET email=EXCLUDED.email
 RETURNING id INTO interessado;
 NEW.lead_id:=interessado;
 INSERT INTO interacoes_leads_academia(lead_id,autor_id,relato)
 VALUES(interessado,NEW.aluno_id,'Solicitação pelo perfil público #'||NEW.id||': '||NEW.tipo||' em '||NEW.data||' às '||NEW.horario||'. Consulte a situação atual em Solicitações de visita.');
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS solicitacao_comercial ON solicitacoes_academia;
CREATE TRIGGER solicitacao_comercial BEFORE INSERT OR UPDATE OF lead_id ON solicitacoes_academia FOR EACH ROW EXECUTE FUNCTION vincular_solicitacao_comercial();
UPDATE solicitacoes_academia SET lead_id=NULL WHERE lead_id IS NULL;
