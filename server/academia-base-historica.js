// Situação conhecida no fechamento de cada dia (horário de Brasília).
// Não extrapola o estado atual para datas sem auditoria.
export async function baseHistorica(c,unidade,inicio,fim){
 return (await c.query(`WITH dias AS (
  SELECT d::date AS dia FROM generate_series($2::date,LEAST($3::date,(NOW() AT TIME ZONE 'America/Sao_Paulo')::date),interval '1 day') d
 ), registros AS (
  SELECT m.id,m.criado_em,m.situacao,m.inicio,m.termino FROM matriculas_academia m WHERE m.academia_id=$1
 ), estados AS (
  SELECT d.dia,m.id,CASE WHEN d.dia=(NOW() AT TIME ZONE 'America/Sao_Paulo')::date
    THEN jsonb_build_object('situacao',m.situacao,'inicio',m.inicio,'termino',m.termino)
    ELSE h.depois END AS estado
  FROM dias d JOIN registros m ON (m.criado_em AT TIME ZONE 'America/Sao_Paulo')::date<=d.dia
  LEFT JOIN LATERAL (
   SELECT a.depois FROM auditoria_academia a
   WHERE a.academia_id=$1 AND a.entidade='matricula' AND a.registro_id=m.id
    AND a.criado_em<(d.dia+1)::timestamp AT TIME ZONE 'America/Sao_Paulo'
    AND a.depois ? 'situacao' AND a.depois ? 'inicio' AND a.depois ? 'termino'
   ORDER BY a.criado_em DESC,a.id DESC LIMIT 1
  ) h ON true
 ) SELECT d.dia::text AS data,
 count(e.id)::int AS cadastradas,
 count(e.id) FILTER(WHERE e.estado IS NULL)::int AS sem_historico,
 count(e.id) FILTER(WHERE e.estado->>'situacao'='ativa'
  AND (e.estado->>'inicio' IS NULL OR left(e.estado->>'inicio',10)::date<=d.dia)
  AND (e.estado->>'termino' IS NULL OR left(e.estado->>'termino',10)::date>=d.dia))::int AS ativas_conhecidas
 FROM dias d LEFT JOIN estados e ON e.dia=d.dia GROUP BY d.dia ORDER BY d.dia`,[unidade,inicio,fim])).rows.map(r=>({...r,ativas:r.sem_historico?null:r.ativas_conhecidas}));
}
