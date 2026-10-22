// Recorte conferido da TACO, NEPA/UNICAMP, 4ª edição revisada (2011).
// Valores por 100 g de parte comestível; página impressa e número originais.
// null preserva NA da fonte: não se converte ausência de informação em zero.
export const fonteTaco='https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf';
export const alimentosTaco=[
 {id:1,nome:'Arroz integral cozido',categoria:'carboidrato',pagina:26,kcal:124,proteina:2.6,gordura:1,carboidrato:25.8},
 {id:3,nome:'Arroz tipo 1 cozido',categoria:'carboidrato',pagina:26,kcal:128,proteina:2.5,gordura:0.2,carboidrato:28.1},
 {id:7,nome:'Aveia em flocos crua',categoria:'carboidrato',pagina:26,kcal:394,proteina:13.9,gordura:8.5,carboidrato:66.6},
 {id:326,nome:'Carne bovina, acém moído cozido',categoria:'proteina',pagina:46,kcal:212,proteina:26.7,gordura:10.9,carboidrato:0},
 {id:313,nome:'Pintado grelhado',categoria:'proteina',pagina:46,kcal:152,proteina:30.8,gordura:2.3,carboidrato:0},
 {id:259,nome:'Azeite de dendê',categoria:'gordura',pagina:42,kcal:884,proteina:null,gordura:100,carboidrato:null},
 {id:260,nome:'Azeite de oliva extra virgem',categoria:'gordura',pagina:42,kcal:884,proteina:null,gordura:100,carboidrato:null},
];
export function compararAlimentos({id,quantidade,unidade,massaGramas,restricao='nenhuma'}) {
 const original=alimentosTaco.find(a=>a.id===Number(id));
 const q=Number(quantidade),massa=unidade==='g'?q:Number(massaGramas);
 if(!original||!['g','ml','unidade'].includes(unidade)||!Number.isFinite(q)||q<=0||!Number.isFinite(massa)||massa<=0||massa>2000)throw new Error('Informe o alimento, a quantidade e a massa comestível válida (até 2.000 g).');
 if(restricao!=='nenhuma')throw new Error('Com restrições alimentares, consulte as alternativas aprovadas e solicite orientação ao nutricionista. Esta base não verifica alergênicos, contaminação ou adequação clínica.');
 const nutrientes=(a,g)=>Object.fromEntries(['kcal','proteina','gordura','carboidrato'].map(k=>[k,a[k]===null?null:a[k]*g/100]));
 return {original:{...original,gramas:massa,nutrientes:nutrientes(original,massa)},alternativas:alimentosTaco.filter(a=>a.id!==original.id&&a.categoria===original.categoria&&a[original.categoria]>0).map(a=>{const gramas=massa*original[original.categoria]/a[original.categoria];return {...a,gramas,nutrientes:nutrientes(a,gramas)};}).filter(a=>a.gramas<=2000)};
}
