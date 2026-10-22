CREATE TABLE vendas_academia (
 id bigserial PRIMARY KEY, academia_id bigint NOT NULL REFERENCES usuarios(id),
 cliente text NOT NULL, total numeric(12,2) NOT NULL CHECK(total>0),
 chave_cliente uuid NOT NULL, pedido jsonb NOT NULL, autor_id bigint NOT NULL REFERENCES usuarios(id),
 criado_em timestamptz NOT NULL DEFAULT now(), UNIQUE(academia_id,chave_cliente)
);
CREATE TABLE itens_venda_academia (
 id bigserial PRIMARY KEY, venda_id bigint NOT NULL REFERENCES vendas_academia(id), produto_id bigint NOT NULL REFERENCES produtos_academia(id),
 nome text NOT NULL, quantidade integer NOT NULL CHECK(quantidade>0), devolvida integer NOT NULL DEFAULT 0,
 preco numeric(12,2) NOT NULL CHECK(preco>0), CHECK(devolvida BETWEEN 0 AND quantidade), UNIQUE(venda_id,produto_id)
);
CREATE TABLE parcelas_venda_academia (
 id bigserial PRIMARY KEY, venda_id bigint NOT NULL REFERENCES vendas_academia(id), numero integer NOT NULL,
 vencimento date NOT NULL, valor_original numeric(12,2) NOT NULL, valor numeric(12,2) NOT NULL CHECK(valor>=0),
 recebido numeric(12,2) NOT NULL DEFAULT 0 CHECK(recebido>=0 AND recebido<=valor), UNIQUE(venda_id,numero)
);
CREATE TABLE devolucoes_venda_academia (
 id bigserial PRIMARY KEY, venda_id bigint NOT NULL REFERENCES vendas_academia(id), item_id bigint NOT NULL REFERENCES itens_venda_academia(id),
 quantidade integer NOT NULL CHECK(quantidade>0), valor numeric(12,2) NOT NULL, reembolso numeric(12,2) NOT NULL,
 motivo text NOT NULL, chave_cliente uuid NOT NULL, autor_id bigint NOT NULL REFERENCES usuarios(id),
 criado_em timestamptz NOT NULL DEFAULT now(), UNIQUE(venda_id,chave_cliente)
);
ALTER TABLE lancamentos_academia ADD COLUMN venda_id bigint REFERENCES vendas_academia(id);
ALTER TABLE lancamentos_academia ADD COLUMN parcela_venda_id bigint REFERENCES parcelas_venda_academia(id);
