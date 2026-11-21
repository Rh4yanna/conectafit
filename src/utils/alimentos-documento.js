export const frutasDocumento=[['Abacate',100,100],['Banana',100,100],['Melão',300,87],['Mamão',250,100],['Maracujá',100,98],['Manga',150,97],['Maçã',200,106],['Uva',200,98],['Abacaxi',200,96],['Pêssego',180,104],['Laranja',160,100],['Morango',300,90],['Pera',200,100],['Romã',200,100],['Carambola',225,100],['Caqui',140,100],['Kiwi',215,100],['Frutas vermelhas',210,100],['Melancia',300,100]];
export const gruposDocumento={
 frutas:frutasDocumento.map(([nome])=>nome),
 proteina:['Ovo','Peito de frango','Carne magra','Patinho moído','Peixe','Atum','Ovos'],
 carboidrato:['Arroz','Pão','Aveia','Farinha de arroz','Batata inglesa','Batata-doce','Macarrão','Mandioca','Cuscuz','Tapioca','Torrada integral','Creme de arroz','Pão integral'],
 laticinios:['Queijo mussarela','Iogurte','Leite','Queijo branco','Iogurte natural','Ricota','Coalhada'],
 vegetais:['Legumes','Salada','Brócolis','Cenoura','Abobrinha','Alface','Tomate','Couve-flor'],
 suplementos:['Whey protein','Leite em pó','Iogurte','Ovos','Queijo branco','Frango','Leite'],
 doces:['Bis','Doce de leite','Chocolate','Geleia','Mel','Frutas','Iogurte']
};
export const alimentosDocumento=['Ovo','Pão','Queijo mussarela','Bis','Arroz','Peito de frango','Carne magra','Legumes','Salada','Whey protein','Iogurte','Aveia','Farinha de arroz','Banana','Doce de leite',...frutasDocumento.map(f=>f[0])];
export function categoriaDocumento(nome){
 const n=nome.toLocaleLowerCase('pt-BR');
 if(n.includes('fruta'))return 'frutas';
 if(n.includes('frango')||n.includes('carne')||n.includes('ovo'))return 'proteina';
 if(n.includes('whey'))return 'suplementos';
 if(n.includes('queijo')||n.includes('iogurte'))return 'laticinios';
 if(n.includes('legume')||n.includes('salada'))return 'vegetais';
 if(n.includes('bis')||n.includes('doce'))return 'doces';
 return Object.keys(gruposDocumento).find(g=>gruposDocumento[g].some(x=>x.toLocaleLowerCase('pt-BR')===n))||'carboidrato';
}
