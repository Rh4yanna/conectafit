import fs from 'node:fs';
import crypto from 'node:crypto';
import { Router } from 'express';

const catalogo = JSON.parse(fs.readFileSync(new URL('./data/exercicios.json', import.meta.url), 'utf8'));
const indice = new Map(catalogo.exercicios.map(e => [e.id, e]));
export const normalizarBusca = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const falha = texto => Object.assign(new Error(texto), { status: 400 });
export function exercicioCatalogo(id) { return indice.get(id) || null; }
export function normalizarFicha(exercicios, anteriores = [], exigirVideo = false) {
  if (typeof anteriores === 'string') anteriores = JSON.parse(anteriores);
  return exercicios.map(ex => {
    const item = ex.catalogo_id ? exercicioCatalogo(ex.catalogo_id) : null;
    if (ex.catalogo_id && !item) throw falha('Exercício da biblioteca não encontrado. Escolha novamente.');
    if (exigirVideo && !item?.videos?.length) throw falha('Vincule cada exercício a um vídeo da biblioteca antes de salvar o treino.');
    const nome = item ? item.nome : ex.nome.trim();
    if (String(ex.repeticoes || '').length > 80 || String(ex.carga || '').length > 80 || String(ex.orientacoes || '').length > 1000) throw falha('Orientações ou valores da ficha excedem o tamanho permitido.');
    const anterior = anteriores.find(a => a.id_exercicio === ex.id_exercicio && a.catalogo_id === ex.catalogo_id && normalizarBusca(a.nome) === normalizarBusca(nome));
    if(item?.indisponivel&&!anterior)throw falha('Este exercício foi retirado da biblioteca. Escolha outro para novas prescrições.');
    return { id_exercicio: anterior?.id_exercicio || crypto.randomUUID(), catalogo_id: item?.id || null, nome,
      series: Number(ex.series), repeticoes: String(ex.repeticoes || ''), carga: String(ex.carga || ''), orientacoes: String(ex.orientacoes || '') };
  });
}
export function diasValidos(dias) { return Array.isArray(dias) && dias.length <= 7 && dias.every(n => Number.isInteger(n) && n >= 0 && n <= 6) && new Set(dias).size === dias.length; }

export function rotasBiblioteca() {
  const router = Router();
  router.get('/', (req, res) => {
    const busca = normalizarBusca(req.query.busca).slice(0, 120);
    const offset = Number(req.query.offset || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) return res.status(400).json({ message: 'Página inválida.' });
    const lista = catalogo.exercicios.filter(e => !e.indisponivel && (!busca || normalizarBusca([e.nome, ...e.aliases, ...e.musculos].join(' ')).includes(busca)) &&
      (!req.query.grupo || e.grupo === req.query.grupo) && (!req.query.equipamento || e.equipamentos.includes(req.query.equipamento)) &&
      (e.videos.length > 0) && (req.query.idioma !== 'pt' || e.idioma === 'pt'))
      .sort((a, b) => Number(b.idioma === 'pt') - Number(a.idioma === 'pt') || a.nome.localeCompare(b.nome, 'pt-BR'));
    res.json({ resultados: lista.slice(offset, offset + 20), total: lista.length, atualizado_em: catalogo.atualizado_em,
      grupos: [...new Set(catalogo.exercicios.map(e => e.grupo))].sort(), equipamentos: [...new Set(catalogo.exercicios.flatMap(e => e.equipamentos))].sort() });
  });
  router.get('/:id', (req, res) => { const e = exercicioCatalogo(req.params.id); if (!e) return res.status(404).json({ message: 'Exercício não encontrado.' }); res.json(e); });
  return router;
}
