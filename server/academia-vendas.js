import {Router} from 'express';
import {rota,permitir,erro,texto,dinheiro,data,chave,tx,auditar} from './academia-core.js';
const inteiro=(v,max)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<1||n>max)throw erro('Quantidade inválida.');return n;};
const mes=(d,n)=>{const a=new Date(d+'T12:00:00Z'),fim=new Date(Date.UTC(a.getUTCFullYear(),a.getUTCMonth()+n+1,0)).getUTCDate();return new Date(Date.UTC(a.getUTCFullYear(),a.getUTCMonth()+n,Math.min(a.getUTCDate(),fim))).toISOString().slice(0,10);};
async function venda(c,q){const v=(await c.query('SELECT * FROM vendas_academia WHERE id=$1 AND academia_id=$2 FOR UPDATE',[q.params.id,q.unidade])).rows[0];if(!v)throw erro('Venda não encontrada.',404);return v;}
export function rotasVendasAcademia(db){
 const r=Router();r.use('/vendas',rota(async(q,s,n)=>{permitir(q,'gestor');n();}));
 r.get('/vendas',rota(async(q,s)=>{const offset=Number(q.query.offset||0);if(!Number.isSafeInteger(offset)||offset<0)throw erro('Página inválida.');s.json((await db.query(`SELECT v.*,COALESCE((SELECT json_agg(i ORDER BY id) FROM itens_venda_academia i WHERE i.venda_id=v.id),'[]') AS itens,COALESCE((SELECT json_agg(p ORDER BY numero) FROM parcelas_venda_academia p WHERE p.venda_id=v.id),'[]') AS parcelas,COALESCE((SELECT json_agg(d ORDER BY id DESC) FROM devolucoes_venda_academia d WHERE d.venda_id=v.id),'[]') AS devolucoes FROM vendas_academia v WHERE academia_id=$1 ORDER BY id DESC LIMIT 21 OFFSET $2`,[q.unidade,offset])).rows);}));
 r.post('/vendas',rota(async(q,s)=>{
  const b=q.body,cliente=texto(b.cliente,150,true),parcelas=inteiro(b.parcelas,36);chave(b.chave_cliente);data(b.vencimento);
  if(!Array.isArray(b.itens)||!b.itens.length||b.itens.length>50)throw erro('Inclua entre 1 e 50 produtos.');
  const itens=b.itens.map(i=>({produto_id:inteiro(i.produto_id,Number.MAX_SAFE_INTEGER),quantidade:inteiro(i.quantidade,1000000),preco:dinheiro(i.preco)})).sort((a,b)=>a.produto_id-b.produto_id);
  if(new Set(itens.map(i=>i.produto_id)).size!==itens.length)throw erro('Agrupe as quantidades do mesmo produto.');
  const pedido={cliente,parcelas,vencimento:b.vencimento,itens};
  s.status(201).json(await tx(db,async c=>{
   await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[q.unidade]);
   const anterior=(await c.query('SELECT * FROM vendas_academia WHERE academia_id=$1 AND chave_cliente=$2',[q.unidade,b.chave_cliente])).rows[0];
   if(anterior){if(anterior.pedido.cliente!==cliente||anterior.pedido.parcelas!==parcelas||anterior.pedido.vencimento!==b.vencimento||JSON.stringify(anterior.pedido.itens.map(i=>[i.produto_id,i.quantidade,i.preco]))!==JSON.stringify(itens.map(i=>[i.produto_id,i.quantidade,i.preco])))throw erro('Identificador já utilizado.',409);return anterior;}
   let total=0;const produtos=[];
   for(const i of itens){const p=(await c.query('SELECT * FROM produtos_academia WHERE id=$1 AND academia_id=$2 FOR UPDATE',[i.produto_id,q.unidade])).rows[0];if(!p||!p.ativo)throw erro('Produto indisponível.',404);if(p.quantidade<i.quantidade)throw erro(`Estoque insuficiente: ${p.nome}.`,409);if(dinheiro(p.preco)!==i.preco||i.preco<=0)throw erro('Preço alterado ou inválido. Atualize o carrinho.',409);total+=i.preco*i.quantidade;produtos.push(p);}
   if(!Number.isSafeInteger(total)||total>9999999999||total<parcelas)throw erro('Confira o total e a quantidade de parcelas.');
   const v=(await c.query('INSERT INTO vendas_academia(academia_id,cliente,total,chave_cliente,pedido,autor_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[q.unidade,cliente,total/100,b.chave_cliente,pedido,q.usuario.id])).rows[0];
   for(let n=0;n<itens.length;n++){const i=itens[n],p=produtos[n];await c.query('INSERT INTO itens_venda_academia(venda_id,produto_id,nome,quantidade,preco) VALUES($1,$2,$3,$4,$5)',[v.id,p.id,p.nome,i.quantidade,i.preco/100]);await c.query('UPDATE produtos_academia SET quantidade=quantidade-$2,versao=versao+1 WHERE id=$1',[p.id,i.quantidade]);await c.query("INSERT INTO movimentos_estoque_academia(academia_id,produto_id,autor_id,tipo,quantidade,motivo,preco_unitario) VALUES($1,$2,$3,'venda',$4,$5,$6)",[q.unidade,p.id,q.usuario.id,i.quantidade,`Venda #${v.id}`,i.preco/100]);}
   for(let n=0;n<parcelas;n++){const valor=(Math.floor(total/parcelas)+(n<total%parcelas?1:0))/100;await c.query('INSERT INTO parcelas_venda_academia(venda_id,numero,vencimento,valor_original,valor) VALUES($1,$2,$3,$4,$4)',[v.id,n+1,mes(b.vencimento,n),valor]);}
   await auditar(c,q,'venda',v.id,'criar','Venda registrada; recebimento separado',null,v);return v;
  }));
 }));
 r.post('/vendas/:id/receber',rota(async(q,s)=>{const b=q.body,valor=dinheiro(b.valor);chave(b.chave_cliente);data(b.data,false);s.json(await tx(db,async c=>{
  const v=await venda(c,q);const existente=(await c.query('SELECT *,data::text FROM lancamentos_academia WHERE academia_id=$1 AND chave_cliente=$2',[q.unidade,b.chave_cliente])).rows[0];if(existente){if(String(existente.venda_id)!==String(v.id)||String(existente.parcela_venda_id)!==String(b.parcela_id)||dinheiro(existente.valor)!==valor||existente.data!==b.data)throw erro('Identificador já utilizado.',409);return existente;}
  const p=(await c.query('SELECT * FROM parcelas_venda_academia WHERE id=$1 AND venda_id=$2 FOR UPDATE',[b.parcela_id,v.id])).rows[0];if(!p)throw erro('Parcela não encontrada.',404);if(valor<=0||valor>dinheiro(p.valor)-dinheiro(p.recebido))throw erro('Recebimento deve ser positivo e não ultrapassar o saldo.');
  const l=(await c.query("INSERT INTO lancamentos_academia(academia_id,tipo,descricao,valor,data,categoria,autor_id,chave_cliente,venda_id,parcela_venda_id) VALUES($1,'receita',$2,$3,$4,'venda',$5,$6,$7,$8) RETURNING *",[q.unidade,`Venda #${v.id}, parcela ${p.numero}`,valor/100,b.data,q.usuario.id,b.chave_cliente,v.id,p.id])).rows[0];await c.query('UPDATE parcelas_venda_academia SET recebido=recebido+$2 WHERE id=$1',[p.id,valor/100]);await auditar(c,q,'venda',v.id,'receber','Recebimento de parcela',null,l);return l;
 }));}));
 r.post('/vendas/:id/devolver',rota(async(q,s)=>{const b=q.body,quantidade=inteiro(b.quantidade,1000000),motivo=texto(b.motivo,1000,true);chave(b.chave_cliente);s.json(await tx(db,async c=>{
  const v=await venda(c,q);const anterior=(await c.query('SELECT * FROM devolucoes_venda_academia WHERE venda_id=$1 AND chave_cliente=$2',[v.id,b.chave_cliente])).rows[0];if(anterior){if(String(anterior.item_id)!==String(b.item_id)||anterior.quantidade!==quantidade||anterior.motivo!==motivo)throw erro('Identificador já utilizado.',409);return anterior;}
  const i=(await c.query('SELECT * FROM itens_venda_academia WHERE id=$1 AND venda_id=$2 FOR UPDATE',[b.item_id,v.id])).rows[0];if(!i||quantidade>i.quantidade-i.devolvida)throw erro('Confira a quantidade ainda disponível para devolução.');
  const p=(await c.query('SELECT * FROM produtos_academia WHERE id=$1 FOR UPDATE',[i.produto_id])).rows[0];if(p.quantidade+quantidade>1000000)throw erro('Saldo de estoque excede o limite.');
  const valor=dinheiro(i.preco)*quantidade;let restante=valor,reembolso=0;
  const parcelas=(await c.query('SELECT * FROM parcelas_venda_academia WHERE venda_id=$1 ORDER BY numero DESC FOR UPDATE',[v.id])).rows;
  for(const a of parcelas){const reduzir=Math.min(restante,dinheiro(a.valor)-dinheiro(a.recebido));a.valor=(dinheiro(a.valor)-reduzir)/100;restante-=reduzir;}
  for(const a of parcelas){const devolver=Math.min(restante,dinheiro(a.recebido));restante-=devolver;reembolso+=devolver;await c.query('UPDATE parcelas_venda_academia SET valor=$2,recebido=$3 WHERE id=$1',[a.id,(dinheiro(a.valor)-devolver)/100,(dinheiro(a.recebido)-devolver)/100]);}
  if(restante)throw erro('Saldo inconsistente. Atualize a venda.',409);
  await c.query('UPDATE itens_venda_academia SET devolvida=devolvida+$2 WHERE id=$1',[i.id,quantidade]);await c.query('UPDATE produtos_academia SET quantidade=quantidade+$2,versao=versao+1 WHERE id=$1',[p.id,quantidade]);
  await c.query("INSERT INTO movimentos_estoque_academia(academia_id,produto_id,autor_id,tipo,quantidade,motivo,preco_unitario) VALUES($1,$2,$3,'devolucao',$4,$5,$6)",[q.unidade,p.id,q.usuario.id,quantidade,`Venda #${v.id}: ${motivo}`,i.preco]);
  if(reembolso)await c.query("INSERT INTO lancamentos_academia(academia_id,tipo,descricao,valor,data,categoria,autor_id,venda_id) VALUES($1,'despesa',$2,$3,(NOW() AT TIME ZONE 'America/Sao_Paulo')::date,'estorno',$4,$5)",[q.unidade,`Devolução da venda #${v.id}`,reembolso/100,q.usuario.id,v.id]);
  const d=(await c.query('INSERT INTO devolucoes_venda_academia(venda_id,item_id,quantidade,valor,reembolso,motivo,chave_cliente,autor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[v.id,i.id,quantidade,valor/100,reembolso/100,motivo,b.chave_cliente,q.usuario.id])).rows[0];await auditar(c,q,'venda',v.id,'devolver',motivo,null,d);return d;
 }));}));return r;
}
