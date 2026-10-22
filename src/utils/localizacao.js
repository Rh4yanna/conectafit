export function coordenadasValidas(lat, lng) {
  return [lat, lng].every(v => (typeof v === 'number' || typeof v === 'string') && String(v).trim() !== '' && Number.isFinite(Number(v)))
    && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;
}

export function calcularDistancia(lat1, lng1, lat2, lng2) {
  if (!coordenadasValidas(lat1, lng1) || !coordenadasValidas(lat2, lng2)) return null;
  const rad = valor => Number(valor) * Math.PI / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export function mensagemErroGps(error) {
  if (error.code === 1) return 'Localização bloqueada. Permita o acesso à localização nas configurações deste site no navegador e tente novamente.';
  if (error.code === 3) return 'O GPS demorou para responder. Confira a localização do dispositivo e tente novamente.';
  return 'Não foi possível obter sua posição. Ative a localização do dispositivo e tente novamente.';
}

export function acompanharLocalizacao(geolocation, sucesso, erro) {
  const id = geolocation.watchPosition(sucesso, erro, {enableHighAccuracy:true, maximumAge:0, timeout:20000});
  return () => geolocation.clearWatch(id);
}

