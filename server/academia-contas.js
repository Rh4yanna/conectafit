import crypto from 'node:crypto';
import {Router} from 'express';
import {rota,permitir,erro,texto,data,dinheiro,chave,tx,auditar} from './academia-core.js';
const categorias=['aluguel','pessoal','manutencao','impostos','outros'];
async function conta(c,q,id){const row=(await c.query('SELECT *,vencimento::text FROM contas_pagar_academia WHERE id=$1 AND academia_id=$2 FOR UPDATE',[id,q.unidade])).rows[0];if(!row)throw erro('Conta não encontrada.',404);return row;}
export function rotasContasAcademia(db){
 const r=Router();r.use('/contas-pagar',rota(async(q,s,n)=>{permitir(q,'gestor');n();}));
 r.get('/contas-pagar',rota(async(q,s)=>{const inicio=data(q.query.inicio),fim=data(q.query.fim);if(fim<inicio)throw erro('Confira o período.');s.json((await db.query(`SELECT c.*,c.vencimento::text,u.nome AS autor,valor-pago AS saldo,CASE WHEN cancelada THEN 'cancelada' WHEN pago=valor THEN 'paga' WHEN vencimento<(NOW() AT TIME ZONE 'America/Sao_Paulo')::date THEN 'atrasada' WHEN pago>0 THEN 'parcial' ELSE 'pendente' END AS status,COALESCE((SELECT json_agg(x ORDER BY x.id DESC) FROM (SELECT l.id,l.data,l.valor,(SELECT id FROM lancamentos_academia e WHERE e.estorno_de=l.id) AS estornado_por FROM lancamentos_academia l WHERE l.conta_pagar_id=c.id AND l.estorno_de IS NULL) x),'[]') AS pagamentos FROM contas_pagar_academia c JOIN usuarios u ON u.id=c.autor_id WHERE c.academia_id=$1 AND c.vencimento BETWEEN $2 AND $3 ORDER BY c.vencimento,c.id`,[q.unidade,inicio,fim])).rows);}));
 r.post('/contas-pagar',rota(async(q,s)=>{
  const b=q.body,descricao=texto(b.descricao,160,true),fornecedor=texto(b.fornecedor,120,true),valor=dinheiro(b.valor);const repeticoes=Number(b.repeticoes||1);if(!Number.isInteger(repeticoes)||repeticoes<1||repeticoes>36)throw erro('Informe entre 1 e 36 ocorrencias mensais.');data(b.vencimento);chave(b.chave_cliente);if(!categorias.includes(b.categoria)||valor<=0)throw erro('Confira valor e categoria.');
  s.status(201).json(await tx(db,async c=>{await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[q.unidade]);const existente=(await c.query('SELECT *,vencimento::text FROM contas_pagar_academia WHERE academia_id=$1 AND chave_cliente=$2',[q.unidade,b.chave_cliente])).rows[0];if(existente){if(existente.descricao!==descricao||existente.fornecedor!==fornecedor||dinheiro(existente.valor)!==valor||existente.vencimento!==b.vencimento||existente.categoria!==b.categoria||existente.repeticoes!==repeticoes)throw erro('Identificador já utilizado.',409);return existente;}
   if((await c.query('SELECT id FROM contas_pagar_academia WHERE academia_id=$1 AND descricao=$2 AND fornecedor=$3 AND valor=$4 AND vencimento=$5 AND NOT cancelada',[q.unidade,descricao,fornecedor,valor/100,b.vencimento])).rows.length)throw erro('Já existe uma conta com estes dados. Confira os registros.',409);
   let primeira;
   for(let i=0;i<repeticoes;i++){
    const original=new Date(b.vencimento+'T12:00:00Z'),ultimo=new Date(Date.UTC(original.getUTCFullYear(),original.getUTCMonth()+i+1,0)).getUTCDate();
    const vencimento=new Date(Date.UTC(original.getUTCFullYear(),original.getUTCMonth()+i,Math.min(original.getUTCDate(),ultimo))).toISOString().slice(0,10);
    if((await c.query('SELECT id FROM contas_pagar_academia WHERE academia_id=$1 AND descricao=$2 AND fornecedor=$3 AND valor=$4 AND vencimento=$5 AND NOT cancelada',[q.unidade,descricao,fornecedor,valor/100,vencimento])).rows.length)throw erro('Ja existe uma conta em um dos vencimentos. Nenhuma ocorrencia foi criada.',409);
    const novo=(await c.query('INSERT INTO contas_pagar_academia(academia_id,descricao,fornecedor,categoria,vencimento,valor,autor_id,chave_cliente,grupo_recorrencia,ocorrencia,repeticoes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',[q.unidade,descricao,fornecedor,b.categoria,vencimento,valor/100,q.usuario.id,i?crypto.randomUUID():b.chave_cliente,repeticoes>1?b.chave_cliente:null,i+1,repeticoes])).rows[0];await auditar(c,q,'conta_pagar',novo.id,'criar','Conta cadastrada',null,novo);primeira??=novo;
   }
   return primeira;
  }));
 }));
 r.post('/contas-pagar/:id/editar',rota(async(q,s)=>{
  const b=q.body,descricao=texto(b.descricao,160,true),fornecedor=texto(b.fornecedor,120,true),valor=dinheiro(b.valor),motivo=texto(b.motivo,1000,true);data(b.vencimento);
  if(!categorias.includes(b.categoria)||valor<=0)throw erro('Confira valor e categoria.');
  s.json(await tx(db,async c=>{
   await c.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[q.unidade]);
   const a=await conta(c,q,q.params.id);
   if(a.cancelada||a.versao!==b.versao)throw erro('Conta alterada ou cancelada. Atualize os registros.',409);
   if(valor<dinheiro(a.pago))throw erro('O valor da conta não pode ser menor que o total já pago.');
   if((await c.query('SELECT id FROM contas_pagar_academia WHERE academia_id=$1 AND id<>$2 AND descricao=$3 AND fornecedor=$4 AND valor=$5 AND vencimento=$6 AND NOT cancelada',[q.unidade,a.id,descricao,fornecedor,valor/100,b.vencimento])).rows.length)throw erro('Já existe uma conta com estes dados.',409);
   const novo=(await c.query('UPDATE contas_pagar_academia SET descricao=$2,fornecedor=$3,categoria=$4,vencimento=$5,valor=$6,versao=versao+1 WHERE id=$1 RETURNING *',[a.id,descricao,fornecedor,b.categoria,b.vencimento,valor/100])).rows[0];
   await auditar(c,q,'conta_pagar',a.id,'editar',motivo,a,novo);return novo;
  }));
 }));
 r.post('/contas-pagar/:id/pagamento',rota(async(q,s)=>{const b=q.body,valor=dinheiro(b.valor);data(b.data,false);chave(b.chave_cliente);s.json(await tx(db,async c=>{
  const a=await conta(c,q,q.params.id);const anterior=(await c.query('SELECT *,data::text FROM lancamentos_academia WHERE academia_id=$1 AND chave_cliente=$2',[q.unidade,b.chave_cliente])).rows[0];if(anterior){if(String(anterior.conta_pagar_id)!==String(a.id)||dinheiro(anterior.valor)!==valor||anterior.data!==b.data||anterior.tipo!=='despesa')throw erro('Identificador já utilizado.',409);return anterior;}
  if(a.cancelada||valor<=0||valor>dinheiro(a.valor)-dinheiro(a.pago))throw erro('Pagamento deve ser positivo e não ultrapassar o saldo de uma conta ativa.');
  const l=(await c.query("INSERT INTO lancamentos_academia(academia_id,tipo,descricao,valor,data,categoria,autor_id,chave_cliente,conta_pagar_id) VALUES($1,'despesa',$2,$3,$4,$5,$6,$7,$8) RETURNING *",[q.unidade,`Conta #${a.id}: ${a.descricao}`.slice(0,200),valor/100,b.data,a.categoria,q.usuario.id,b.chave_cliente,a.id])).rows[0];const novo=(await c.query('UPDATE contas_pagar_academia SET pago=pago+$2,versao=versao+1 WHERE id=$1 RETURNING *',[a.id,valor/100])).rows[0];await auditar(c,q,'conta_pagar',a.id,'pagar','Pagamento registrado',a,novo);await auditar(c,q,'lancamento',l.id,'pagar','Pagamento de conta',null,l);return l;
 }));}));
 r.post('/contas-pagar/:id/cancelar',rota(async(q,s)=>{const motivo=texto(q.body.motivo,1000,true);s.json(await tx(db,async c=>{const a=await conta(c,q,q.params.id);if(a.cancelada||a.versao!==q.body.versao)throw erro('Conta alterada. Atualize os registros.',409);if(Number(a.pago)>0)throw erro('Estorne os pagamentos antes de cancelar a conta.');const novo=(await c.query('UPDATE contas_pagar_academia SET cancelada=true,versao=versao+1 WHERE id=$1 RETURNING *',[a.id])).rows[0];await auditar(c,q,'conta_pagar',a.id,'cancelar',motivo,a,novo);return novo;}));}));return r;
}
