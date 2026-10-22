export async function fecharModais(p){
 while(await p.locator('dialog[open]').count()){const n=await p.locator('dialog[open]').count();await p.keyboard.press('Escape');await p.waitForFunction(n=>document.querySelectorAll('dialog[open]').length<n,n);}
}
export function navegarAcademia(p){return async nome=>{
 await fecharModais(p);
 const nomes={'Matrículas':'Alunos / Gestão de contas','Planos comerciais':'Planos','Agenda':'Agendamentos','Comercial':'Leads','Fluxo de alunos':'Controle de acesso / Catracas','Relatórios':'Insights e relatórios'};
 const extras={'Contas a pagar':'Financeiro','Histórico de ações':'Financeiro','Presença e acompanhamento':'Alunos / Gestão de contas','Turmas e reservas':'Agendamentos','Equipe e acessos':'Início'};
 await p.getByRole('button',{name:'Abrir menu',exact:true}).click();
 await p.getByRole('navigation',{name:'Menu principal'}).getByRole('link',{name:extras[nome]||nomes[nome]||nome,exact:true}).click();
 if(extras[nome])await p.getByRole('navigation',{name:'Áreas relacionadas'}).getByRole('button',{name:nome,exact:true}).click();
};}
