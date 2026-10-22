import {Router} from 'express';
import {rota,permitir,erro,texto,dinheiro,chave,tx,auditar} from './academia-core.js';
const inteiro=(v,min=0)=>{if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v))||Number(v)<min||Number(v)>1000000)throw erro('Quantidade deve ser inteira e estar dentro do limite de 1.000.000.');return Number(v);};
export function rotasEstoqueAcademia(db){
 const r=Router();r.use('/estoque',rota(async(q,s,n)=>{permitir(q,'gestor');n();}));
 r.get('/estoque',rota(async(q,s)=>s.json((await db.query('SELECT * FROM produtos_academia WHERE academia_id=$1 ORDER BY nome,id',[q.unidade])).rows)));
 r.post('/estoque/produtos',rota(async(q,s)=>{
  const b=q.body,nome=texto(b.nome,120,true),categoria=texto(b.categoria,80,true),custo=dinheiro(b.custo)/100,preco=dinheiro(b.preco)/100,minimo=inteiro(b.minimo);if(typeof b.ativo!=='boolean')throw erro('Confira a situação do produto.');
  s.json(await tx(db,async c=>{let antes;if(b.id){antes=(await c.query('SELECT * FROM produtos_academia WHERE id=$1 AND academia_id=$2 FOR UPDATE',[b.id,q.unidade])).rows[0];if(!antes)throw erro('Produto não encontrado.',404);if(antes.versao!==b.versao)throw erro('Produto alterado. Atualize o estoque.',409);}
   const valores=[q.unidade,nome,categoria,custo,preco,minimo,b.ativo];const novo=(await c.query(antes?'UPDATE produtos_academia SET nome=$2,categoria=$3,custo=$4,preco=$5,minimo=$6,ativo=$7,versao=versao+1 WHERE academia_id=$1 AND id=$8 RETURNING *':'INSERT INTO produtos_academia(academia_id,nome,categoria,custo,preco,minimo,ativo) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',antes?[...valores,b.id]:valores)).rows[0];await auditar(c,q,'produto',novo.id,'salvar','Cadastro de produto',antes,novo);return novo;
  }));
 }));
 r.get('/estoque/movimentos',rota(async(q,s)=>{const offset=Number(q.query.offset||0);if(!Number.isSafeInteger(offset)||offset<0)throw erro('Página inválida.');s.json((await db.query('SELECT m.*,p.nome,u.nome AS autor FROM movimentos_estoque_academia m JOIN produtos_academia p ON p.id=m.produto_id JOIN usuarios u ON u.id=m.autor_id WHERE m.academia_id=$1 ORDER BY m.id DESC LIMIT 51 OFFSET $2',[q.unidade,offset])).rows);}));
 r.post('/estoque/movimentos',rota(async(q,s)=>{
  const b=q.body,quantidade=inteiro(b.quantidade,1),motivo=texto(b.motivo,1000,true);chave(b.chave_cliente);if(!['entrada','saida','venda'].includes(b.tipo))throw erro('Tipo de movimento inválido.');
  s.status(201).json(await tx(db,async c=>{
   const p=(await c.query('SELECT * FROM produtos_academia WHERE id=$1 AND academia_id=$2 FOR UPDATE',[b.produto_id,q.unidade])).rows[0];if(!p)throw erro('Produto não encontrado.',404);
   const anterior=(await c.query('SELECT * FROM movimentos_estoque_academia WHERE academia_id=$1 AND chave_cliente=$2',[q.unidade,b.chave_cliente])).rows[0];
   if(anterior){if(String(anterior.produto_id)!==String(p.id)||anterior.tipo!==b.tipo||anterior.quantidade!==quantidade||anterior.motivo!==motivo)throw erro('Identificador já utilizado.',409);return anterior;}
   if(!p.ativo)throw erro('Reative o produto antes de movimentá-lo.');
   const saldo=p.quantidade+(b.tipo==='entrada'?quantidade:-quantidade);if(saldo<0)throw erro('Estoque insuficiente.',409);if(saldo>1000000)throw erro('Saldo excede o limite permitido.');
   let lancamento=null;if(b.tipo==='venda'){const unitario=dinheiro(p.preco);if(dinheiro(b.preco_confirmado)!==unitario)throw erro('O preço foi alterado. Atualize o produto antes de confirmar a venda.',409);const total=unitario*quantidade;if(total<=0||total>9999999999)throw erro('Confira preço e quantidade da venda.');lancamento=(await c.query("INSERT INTO lancamentos_academia(academia_id,tipo,descricao,valor,data,categoria,autor_id,chave_cliente) VALUES($1,'receita',$2,$3,(NOW() AT TIME ZONE 'America/Sao_Paulo')::date,'venda',$4,$5) RETURNING *",[q.unidade,`Venda: ${p.nome} (${quantidade} un.)`,total/100,q.usuario.id,b.chave_cliente])).rows[0];await auditar(c,q,'lancamento',lancamento.id,'venda','Venda de produto recebida',null,lancamento);}
   const novo=(await c.query('INSERT INTO movimentos_estoque_academia(academia_id,produto_id,autor_id,tipo,quantidade,motivo,preco_unitario,lancamento_id,chave_cliente) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[q.unidade,p.id,q.usuario.id,b.tipo,quantidade,motivo,b.tipo==='venda'?p.preco:null,lancamento?.id||null,b.chave_cliente])).rows[0];await c.query('UPDATE produtos_academia SET quantidade=$2,versao=versao+1 WHERE id=$1',[p.id,saldo]);await auditar(c,q,'estoque',novo.id,b.tipo,motivo,{quantidade:p.quantidade},{quantidade:saldo,produto_id:p.id});return novo;
  }));
 }));return r;
}
