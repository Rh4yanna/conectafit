import {Router} from 'express'; /*controle das mensalidades*/
export function rotasMensalidades(db){
  const router=Router();
  router.get('/mensalidades',async(req,res)=>{
    try{
      const r=await db.query(`SELECT c.id,c.matricula_id,m.aluno_nome,c.valor,to_char(c.competencia,'YYYY-MM') AS competencia,
        to_char(c.vencimento,'YYYY-MM-DD') AS vencimento,to_char(c.pago_em,'YYYY-MM-DD') AS pago_em,
        CASE WHEN c.pago_em IS NOT NULL THEN 'paga' WHEN c.vencimento<CURRENT_DATE THEN 'atrasada' ELSE 'pendente' END AS status
        FROM mensalidades_academia c JOIN matriculas_academia m ON m.id=c.matricula_id
        WHERE m.academia_id=$1 ORDER BY c.vencimento DESC,m.aluno_nome`,[req.usuario.id]);
      return res.json(r.rows);
    }catch{return res.status(500).json({message:'Não foi possível carregar as mensalidades.'});}
  });
  router.post('/matriculas/:id/mensalidades',async(req,res)=>{
    const {competencia}=req.body;
    if(!/^\d+$/.test(req.params.id)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia||''))return res.status(400).json({message:'Selecione um mês válido.'});
    try{
      const r=await db.query(`INSERT INTO mensalidades_academia(matricula_id,competencia,vencimento,valor)
        SELECT id,$1::date,$1::date+(dia_vencimento-1)::int,valor_mensal FROM matriculas_academia
        WHERE id=$2 AND academia_id=$3 AND ativo AND valor_mensal>0 RETURNING id`,[competencia+'-01',req.params.id,req.usuario.id]);
      if(!r.rows.length)return res.status(400).json({message:'Selecione um aluno ativo com valor de mensalidade cadastrado.'});
      return res.status(201).json(r.rows[0]);
    }catch(error){return res.status(error.code==='23505'?409:400).json({message:error.code==='23505'?'Já existe uma cobrança deste aluno para esse mês.':'Não foi possível gerar a mensalidade.'});}
  });
  router.post('/mensalidades/:id/pagamento',async(req,res)=>{
    if(!/^\d+$/.test(req.params.id)||!/^\d{4}-\d{2}-\d{2}$/.test(req.body.data||''))return res.status(400).json({message:'Informe uma data de pagamento válida.'});
    let client;
    try{
      client=await db.connect();await client.query('BEGIN');
      const r=await client.query(`SELECT c.*,m.aluno_nome FROM mensalidades_academia c JOIN matriculas_academia m ON m.id=c.matricula_id
        WHERE c.id=$1 AND m.academia_id=$2 FOR UPDATE OF c`,[req.params.id,req.usuario.id]);
      if(!r.rows.length){await client.query('ROLLBACK');return res.status(404).json({message:'Mensalidade não encontrada.'});}
      const c=r.rows[0];
      if(c.pago_em){await client.query('ROLLBACK');return res.status(409).json({message:'Esta mensalidade já foi paga.'});}
      const data=await client.query('SELECT $1::date<=CURRENT_DATE AS valida',[req.body.data]);
      if(!data.rows[0].valida){await client.query('ROLLBACK');return res.status(400).json({message:'O pagamento não pode ter data futura.'});}
      await client.query('UPDATE mensalidades_academia SET pago_em=$1 WHERE id=$2',[req.body.data,c.id]);
      await client.query("INSERT INTO lancamentos_academia(academia_id,tipo,descricao,valor,data,mensalidade_id) VALUES($1,'receita',$2,$3,$4,$5)",[req.usuario.id,`Mensalidade: ${c.aluno_nome}`,c.valor,req.body.data,c.id]);
      await client.query('COMMIT');return res.json({message:'Pagamento registrado e adicionado às receitas.'});
    }catch{if(client)await client.query('ROLLBACK');return res.status(400).json({message:'Não foi possível registrar o pagamento. Confira a data.'});}
    finally{client?.release();}
  });
  router.put('/matriculas/:id',async(req,res)=>{
    const {nome,email,telefone='',plano='',valor_mensal=0,dia_vencimento=10}=req.body;
    if(!/^\d+$/.test(req.params.id)||typeof nome!=='string'||nome.trim().length<3||nome.length>120||typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email.trim())||typeof telefone!=='string'||telefone.length>30||typeof plano!=='string'||plano.length>80||!/^\d+(\.\d{1,2})?$/.test(String(valor_mensal))||Number(valor_mensal)>99999999.99||!Number.isInteger(Number(dia_vencimento))||Number(dia_vencimento)<1||Number(dia_vencimento)>28)return res.status(400).json({message:'Confira os dados do aluno, mensalidade e vencimento (1 a 28).'});
    try{
      const r=await db.query(`UPDATE matriculas_academia SET aluno_nome=$1,aluno_email=$2,telefone=$3,plano=$4,valor_mensal=$5,dia_vencimento=$6
        WHERE id=$7 AND academia_id=$8 RETURNING *`,[nome.trim(),email.trim().toLowerCase(),telefone.trim(),plano.trim(),valor_mensal,dia_vencimento,req.params.id,req.usuario.id]);
      if(!r.rows.length)return res.status(404).json({message:'Matrícula não encontrada.'});return res.json(r.rows[0]);
    }catch(error){return res.status(error.code==='23505'?409:500).json({message:error.code==='23505'?'Este e-mail já pertence a outro aluno da unidade.':'Não foi possível atualizar o aluno.'});}
  });
  return router;
}
