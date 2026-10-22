export function normalizarEndereco(body){
  const endereco={};
  for(const [campo,max] of [['cidade',120],['rua',180],['numero',20],['estado',2]]){
    if(typeof body[campo]!=='string'||!body[campo].trim()||body[campo].trim().length>max)throw new Error('Informe cidade, rua, número (ou s/n) e UF.');
    endereco[campo]=body[campo].trim();
  }
  endereco.estado=endereco.estado.toUpperCase();
  if(!['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].includes(endereco.estado))throw new Error('Informe uma UF válida.');
  return endereco;
}
