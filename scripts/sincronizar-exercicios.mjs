import {licencaPermitida,publicarCatalogo} from './catalogo-seguro.mjs';
const destino = new URL('../server/data/exercicios.json', import.meta.url);
async function buscar(path) {
  const r = await fetch(`https://wger.de/api/v2/${path}`, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`wger: HTTP ${r.status}`);
  return r.json();
}
const licencas = new Map((await buscar('license/?limit=100')).results.map(l => [l.id, { nome: l.short_name, url: l.url.replace(/^http:/, 'https:') }]));
const permitidas = new Set([...licencas].filter(([,l])=>licencaPermitida(l)).map(([id])=>id));
const grupos = { Abs: 'Abdômen', Arms: 'Braços', Back: 'Costas', Calves: 'Panturrilhas', Chest: 'Peito', Legs: 'Pernas', Shoulders: 'Ombros', Cardio: 'Cardio' };
const equipamentos = { Barbell: 'Barra', Dumbbell: 'Halteres', 'Gym mat': 'Colchonete', 'Incline bench': 'Banco inclinado', Kettlebell: 'Kettlebell', 'Pull-up bar': 'Barra fixa', 'SZ-Bar': 'Barra W', 'Swiss Ball': 'Bola suíça', Bench: 'Banco', 'none (bodyweight exercise)': 'Peso corporal' };
const texto = s => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
const midiaSegura = url => { try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === 'wger.de' && u.pathname.startsWith('/media/'); } catch { return false; } };
const autoria = (item, licenca) => ({ autores: [...new Set([item.license_author, ...(item.author_history || [])].filter(Boolean))].join(', ') || 'Colaboradores wger', licenca: licencas.get(licenca) });
const exercicios = [];
let offset = 0;
while (true) {
  const pagina = await buscar(`exerciseinfo/?limit=100&offset=${offset}`);
  for (const e of pagina.results) {
    const traducoes = e.translations.filter(t => permitidas.has(t.license));
    const t = traducoes.find(t => t.language === 7) || traducoes.find(t => t.language === 2);
    if (!t || !permitidas.has(e.license.id)) continue;
    const videos = e.videos.filter(v => permitidas.has(v.license) && midiaSegura(v.video)).sort((a, b) => Number(b.codec === 'h264') - Number(a.codec === 'h264') || a.size - b.size);
    const imagens = e.images.filter(i => permitidas.has(i.license) && midiaSegura(i.image) && !i.is_ai_generated);
    exercicios.push({
      id: `wger:${e.id}`, nome: texto(t.name), idioma: t.language === 7 ? 'pt' : 'en',
      aliases: traducoes.filter(t => [2, 7].includes(t.language)).map(t => texto(t.name)),
      grupo: grupos[e.category.name] || e.category.name,
      equipamentos: e.equipment.map(x => equipamentos[x.name] || x.name),
      musculos: e.muscles.map(m => m.name), instrucoes: texto(t.description_source || t.description),
      fonte: `https://wger.de/en/exercise/${e.id}/view/`, ...autoria(t, t.license),
      dados_licenca: e.license, dados_autores: e.total_authors_history || e.author_history,
      videos: videos.map(v => ({ url: v.video, codec: v.codec, ...autoria(v, v.license) })),
      imagens: imagens.map(i => ({ url: i.image, ...autoria(i, i.license) })),
    });
  }
  console.log(`Catálogo: ${offset + pagina.results.length} registros consultados.`);
  if (!pagina.next) break;
  offset += 100;
}
if (exercicios.length < 50) throw new Error('Resposta incompleta. O catálogo anterior foi preservado.');
const preservados=await publicarCatalogo(destino,{ atualizado_em: new Date().toISOString(), fonte: 'https://wger.de/api/v2/exerciseinfo/', exercicios });
console.log(`${preservados} exercícios antigos preservados apenas para consulta. Reinicie o backend para usar a nova versão.`);
console.log(`${exercicios.length} exercícios; ${exercicios.filter(e => e.videos.length).length} com vídeo; ${exercicios.filter(e => e.idioma === 'pt').length} em português.`);
