BEGIN;
CREATE FUNCTION dados_historico_perfil(d JSONB) RETURNS JSONB LANGUAGE SQL IMMUTABLE AS $$
 SELECT COALESCE(jsonb_object_agg(key,value),'{}') FROM jsonb_each(d)
 WHERE key IN ('nome','email','telefone','cidade','endereco','contato','whatsapp','instagram','formacao','sobre_mim','bio','crn','cnpj','preco_diaria','preco_semanal','preco_mensal','preco_anual','modalidades');
$$;
CREATE TABLE historico_perfis (
 id BIGSERIAL PRIMARY KEY, usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 origem TEXT NOT NULL, versao INT NOT NULL, dados JSONB NOT NULL,
 autor_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(usuario_id,origem,versao)
);
INSERT INTO historico_perfis(usuario_id,origem,versao,dados,autor_id)
 SELECT id,'conta',1,dados_historico_perfil(to_jsonb(u)),id FROM usuarios u;
INSERT INTO historico_perfis(usuario_id,origem,versao,dados,autor_id)
 SELECT usuario_id,'personal',1,dados_historico_perfil(to_jsonb(p)),usuario_id FROM perfis_personal p;
INSERT INTO historico_perfis(usuario_id,origem,versao,dados,autor_id)
 SELECT usuario_id,'nutri',1,dados_historico_perfil(to_jsonb(p)),usuario_id FROM perfis_nutri p;
INSERT INTO historico_perfis(usuario_id,origem,versao,dados,autor_id)
 SELECT usuario_id,'academia',1,dados_historico_perfil(to_jsonb(p)),usuario_id FROM perfis_academia p;
CREATE FUNCTION registrar_historico_perfil() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE dono BIGINT; tipo TEXT; conteudo JSONB;
BEGIN
 conteudo := dados_historico_perfil(to_jsonb(NEW));
 IF TG_OP='UPDATE' AND conteudo=dados_historico_perfil(to_jsonb(OLD)) THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='usuarios' THEN dono:=NEW.id;tipo:='conta';
 ELSE dono:=NEW.usuario_id;tipo:=CASE TG_TABLE_NAME WHEN 'perfis_personal' THEN 'personal' WHEN 'perfis_nutri' THEN 'nutri' ELSE 'academia' END; END IF;
 PERFORM id FROM usuarios WHERE id=dono FOR UPDATE;
 INSERT INTO historico_perfis(usuario_id,origem,versao,dados,autor_id)
 SELECT dono,tipo,COALESCE(max(versao),0)+1,conteudo,dono FROM historico_perfis WHERE usuario_id=dono AND origem=tipo;
 RETURN NEW;
END;
$$;
CREATE TRIGGER historico_perfil AFTER INSERT OR UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION registrar_historico_perfil();
CREATE TRIGGER historico_perfil AFTER INSERT OR UPDATE ON perfis_personal FOR EACH ROW EXECUTE FUNCTION registrar_historico_perfil();
CREATE TRIGGER historico_perfil AFTER INSERT OR UPDATE ON perfis_nutri FOR EACH ROW EXECUTE FUNCTION registrar_historico_perfil();
CREATE TRIGGER historico_perfil AFTER INSERT OR UPDATE ON perfis_academia FOR EACH ROW EXECUTE FUNCTION registrar_historico_perfil();
COMMIT;
