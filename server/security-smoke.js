const base = process.env.SECURITY_TEST_URL || "http://localhost:3000";
const casos = [
  ["rota administrativa isca", "/admin", 418],
  ["arquivo .env isca", "/.env", 418],
  ["lista de usuários sem token", "/api/usuarios", 401],
  ["treinos sem token", "/api/treinos", 401],
  ["rota inexistente", "/api/nao-existe", 404],
];
let falhas = 0;
for (const [nome, caminho, esperado] of casos) {
  try {
    const resposta = await fetch(`${base}${caminho}`, { headers: { accept: "application/json" } });
    const ok = resposta.status === esperado;
    console.log(`${ok ? "✅" : "❌"} ${nome}: HTTP ${resposta.status} (esperado ${esperado})`);
    if (!ok) falhas++;
  } catch (error) { console.log(`❌ ${nome}: servidor indisponível (${error.message})`); falhas++; }
}
const login = await fetch(`${base}/api/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: [], senha: {}, tipo_usuario: 123 }) });
console.log(`${login.status === 400 ? "✅" : "❌"} login malformado: HTTP ${login.status} (esperado 400)`);
if (login.status !== 400) falhas++;
if (falhas) process.exitCode = 1;
else console.log("\n🛡️ Verificações básicas de segurança aprovadas.");
