import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import process from 'node:process';
import { coordenadasValidas } from '../src/utils/localizacao.js';

export async function consultarDistancias(origem, academias, chave, consultar = fetch) {
  const r = await consultar('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST', signal: AbortSignal.timeout(12000),
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': chave,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,status,condition,distanceMeters,duration' },
    body: JSON.stringify({ origins: [{ waypoint: { location: { latLng: { latitude: origem.lat, longitude: origem.lng } } } }],
      destinations: academias.map(a => ({ waypoint: { address: `${a.rua}, ${a.numero}, ${a.cidade}, ${a.estado}, Brasil` } })),
      travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE', languageCode: 'pt-BR', regionCode: 'BR' }),
  });
  if (!r.ok) throw new Error('Não foi possível consultar as distâncias no Google Maps. Tente novamente mais tarde.');
  const elementos = await r.json();
  if (!Array.isArray(elementos)) throw new Error('Resposta de distâncias indisponível.');
  return academias.map((a, i) => {
    const e = elementos.find(e => (e.destinationIndex ?? 0) === i && (e.originIndex ?? 0) === 0);
    const valido = e?.condition === 'ROUTE_EXISTS' && !e.status?.code && Number.isFinite(e.distanceMeters) && e.distanceMeters >= 0;
    return { id: String(a.usuario_id), distancia_km: valido ? e.distanceMeters / 1000 : null };
  });
}

export function rotasDistanciasAcademias(db) {
  const router = Router();
  router.get('/config', (_req, res) => res.json({ disponivel: Boolean(process.env.GOOGLE_ROUTES_API_KEY) }));
  router.post('/', rateLimit({ windowMs: 60000, max: 5, standardHeaders: true, legacyHeaders: false,
    keyGenerator: req => String(req.usuario.id), message: { message: 'Aguarde um minuto antes de consultar novas distâncias.' } }), async (req, res) => {
    const { origem, academias } = req.body;
    if (!origem || typeof origem.lat !== 'number' || typeof origem.lng !== 'number' || !coordenadasValidas(origem.lat, origem.lng) ||
      !Array.isArray(academias) || !academias.length || academias.length > 25 || academias.some(id => !/^\d+$/.test(String(id)) || !Number.isSafeInteger(Number(id))))
      return res.status(400).json({ message: 'Informe uma localização válida e até 25 academias.' });
    if (!process.env.GOOGLE_ROUTES_API_KEY) return res.status(503).json({ message: 'O cálculo de distâncias ainda não foi ativado. Você pode consultar as academias pela cidade.' });
    try {
      const { rows } = await db.query(`SELECT l.usuario_id,l.rua,l.numero,l.cidade,l.estado FROM localizacoes_servicos l
        JOIN usuarios u ON u.id=l.usuario_id WHERE u.tipo_usuario='academia' AND u.id=ANY($1::bigint[])
        AND l.rua<>'' AND l.numero<>'' AND l.cidade<>'' AND l.estado<>''`, [[...new Set(academias.map(String))]]);
      const distancias = rows.length ? await consultarDistancias(origem, rows, process.env.GOOGLE_ROUTES_API_KEY) : [];
      res.set('Cache-Control', 'no-store').json({ distancias, modo: 'carro', fonte: 'Google Maps' });
    } catch { res.status(502).json({ message: 'Não foi possível calcular as distâncias. Confira os endereços ou tente novamente mais tarde.' }); }
  });
  return router;
}
