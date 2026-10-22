import test from 'node:test';
import assert from 'node:assert/strict';
import { consultarDistancias } from './distancias-academias.js';
import { normalizarFicha, exercicioCatalogo } from './biblioteca-exercicios.js';

test('Google: distâncias usam endereço, preservam associação e tratam rota ausente', async () => {
  const academias = [1, 2, 3].map(usuario_id => ({ usuario_id, rua: 'Rua A', numero: '10', cidade: 'São Paulo', estado: 'SP' }));
  const resultado = await consultarDistancias({ lat: -23.5, lng: -46.6 }, academias, 'chave-teste', async (url, opcoes) => {
    assert.equal(url, 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix');
    assert.equal(opcoes.headers['X-Goog-Api-Key'], 'chave-teste');
    const corpo = JSON.parse(opcoes.body);
    assert.equal(corpo.travelMode, 'DRIVE');
    assert.equal(corpo.destinations[0].waypoint.address, 'Rua A, 10, São Paulo, SP, Brasil');
    assert.deepEqual(corpo.origins[0].waypoint.location.latLng, { latitude: -23.5, longitude: -46.6 });
    return { ok: true, json: async () => [
      { destinationIndex: 2, condition: 'ROUTE_NOT_FOUND', status: { code: 5 } },
      { destinationIndex: 1, condition: 'ROUTE_EXISTS', distanceMeters: 1500 },
      { destinationIndex: 0, condition: 'ROUTE_EXISTS', distanceMeters: 0 },
    ] };
  });
  assert.deepEqual(resultado, [{ id: '1', distancia_km: 0 }, { id: '2', distancia_km: 1.5 }, { id: '3', distancia_km: null }]);
  await assert.rejects(consultarDistancias({ lat: 0, lng: 0 }, academias, 'teste', async () => ({ ok: false })), /Google Maps/);
});

test('treinos pessoais exigem vídeo real do catálogo, sem aceitar mídia enviada pelo cliente', () => {
  const ex = { nome: 'Teste', series: 2, repeticoes: '10' };
  assert.throws(() => normalizarFicha([ex], [], true), /vídeo/);
  assert.throws(() => normalizarFicha([{ ...ex, demonstracao_catalogo: { videos: [{ url: 'https://example.com/falso.mp4' }] } }], [], true), /vídeo/);
  const item = exercicioCatalogo('wger:75');
  assert.ok(item.videos.length);
  assert.equal(normalizarFicha([{ ...ex, catalogo_id: item.id }], [], true)[0].nome, item.nome);
});
