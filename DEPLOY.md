# Publicação do ConectaFit

## Render único (opção atual)

No Render com `SERVE_FRONTEND=true`, pode omitir `FRONTEND_URL`: a API usa `RENDER_EXTERNAL_URL` fornecida pela plataforma e valida HTTPS antes de iniciar. Não cadastrar manualmente `RENDER_EXTERNAL_URL`. Para domínio próprio ou frontend separado, definir `FRONTEND_URL` explicitamente.

Site e API no mesmo Web Service: build `npm ci --include=dev && npm run build`, start `npm run migrate && npm start`, `SERVE_FRONTEND=true`, `IMAGE_STORAGE=database`, `BIND_HOST=0.0.0.0`, `NODE_ENV=production`, `NODE_VERSION=22`, `DB_SSL=true`, `VITE_API_URL=/api`. Definir `DATABASE_URL` pelo painel secreto e `FRONTEND_URL` com a URL HTTPS real atribuída ao serviço, sem barra final. O servidor entrega `dist` e o fallback React preservando os erros da API. O template Render usa Free; não usar o template Vercel nessa opção. O banco gratuito expira após 30 dias. Antes do deploy é necessário versionar e enviar os arquivos atualizados ao GitHub, sem credenciais ou dados pessoais.

## Atualização: Firebase adiado

Por solicitação da proprietária, a publicação inicial usará `IMAGE_STORAGE=database`: as imagens continuam persistidas no PostgreSQL, como no fluxo anterior. Não é necessário cadastrar faturamento Firebase nem fornecer credenciais de bucket. O adaptador Firebase permanece disponível para uma migração posterior. As instruções de Firebase abaixo são opcionais nesta etapa; o checklist de bucket só se aplica quando esse modo for ativado. O banco precisa ter espaço para imagens e vídeos, e seus backups precisam incluí-los. Referências `/api/midia` previamente migradas exigem o bucket original; não executar migração de imagens ao usar este modo.

Publicação solicitada, ainda não executada. As contas Vercel e Render precisam estar conectadas para verificar os projetos, URLs e opções de plano disponíveis. A autorização para publicar não inclui contratar planos pagos nem transferir registros pessoais do banco local.

Preparação local em 21–22/10/2026. **Nenhum serviço externo foi criado, nenhum faturamento foi ativado e nenhum deploy foi realizado.** A aprovação da proprietária é necessária antes dessas etapas. Não colar credenciais no chat.

Resultados locais e limites: [validação de 22/10/2026](docs/validacao-producao-2026-10-22.md).

## Diagnóstico e arquitetura

A aplicação é React/Vite com API Express e PostgreSQL. `apiFetch` usa `/api`, cookies HttpOnly e um header anti-CSRF. A sessão é opaca, revogável e armazenada no servidor, não um JWT do Firebase. As imagens eram gravadas como data URLs no banco; vídeos próprios continuam no PostgreSQL e o catálogo de exercícios continua local. Há muitas alterações preexistentes ainda não commitadas: revisar o conteúdo do commit antes de conectar qualquer serviço Git.

Arquitetura preparada: navegador → Vercel (`dist` e proxy `/api`) → Render (Express, Node 22) → PostgreSQL gerenciado e Firebase Storage. O navegador vê uma única origem HTTPS. Isso mantém o cookie `__Host-conectafit`, SameSite=Lax e as permissões existentes. Não apontar `VITE_API_URL` diretamente para outro domínio.

Alternativa: servir `dist` e `/api` no mesmo servidor com `deploy/Caddyfile.example`. Ela evita a camada de proxy da Vercel, mas exige administrar servidor, atualizações e backups. Não é necessário trocar a arquitetura de domínio do aplicativo.

## Custos e limitações

Estimativas para planejamento, sujeitas ao painel do fornecedor, região, uso, câmbio e impostos:

- Vercel Hobby: sem mensalidade para uso pessoal e não comercial elegível; confirmar enquadramento do TCC e limites. Um uso comercial deve usar plano compatível. [Plano Hobby](https://vercel.com/docs/plans/hobby).
- Render: a referência oficial de julho de 2026 cita cerca de **US$ 13/mês** para Starter web + Basic-256mb Postgres em workspace Hobby, antes de tráfego e crescimento de armazenamento. Não é cotação garantida para esta implantação. [Referência de custos](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses), [preços](https://render.com/pricing).
- Render Free: serviço pode suspender por inatividade/limites; PostgreSQL expira em 30 dias; SMTP nas portas 25/465/587 é bloqueado no serviço gratuito. Não serve como armazenamento permanente nem permite presumir recuperação de senha por Gmail. [Limites](https://render.com/docs/free).
- Firebase Storage exige **Blaze e conta de faturamento**, mesmo que determinada utilização fique nas franquias gratuitas. Armazenamento, operações e transferência variam por região e consumo. Configurar alertas de orçamento; alertas não são um limite rígido de gasto. [Requisitos](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024), [preços](https://firebase.google.com/pricing).
- Domínio próprio é opcional e cobrado à parte. O proxy de imagens pela API consome tráfego no bucket, API e frontend; medir antes de ampliar o uso.

**Não contratar ou ativar os serviços acima sem aprovação.**

## 1. Preparar a versão local

Instalar Node 22 LTS (o SDK Firebase atual exige >=22). Usar a versão fixada de dependências do `package-lock.json`:

```sh
npm ci
npm run build
npm run test:storage
npm run lint
```

O arquivo `.env.example` documenta os nomes das configurações. `.env`, arquivos de service account, chaves e backups estão ignorados. Não publicar `.env` nem copiar valores reais para exemplos. Nenhuma chave do Admin deve começar por `VITE_`.

## 2. Banco PostgreSQL

Criar, após aprovação, um banco vazio com TLS e uma conta de migração. Configurar `DATABASE_URL` e `DB_SSL=true`; se o certificado exigir CA própria, definir `DB_SSL_CA`. A validação do certificado não é desligada. A alternativa DB_HOST/DB_USER/DB_PASSWORD/DB_NAME continua suportada. Limitar `DB_POOL_MAX` às conexões do plano.

As tabelas-base ausentes estão em `000_base.sql`. A migração 002 usa o schema da conexão. O executor mantém uma conexão, lock de migração e transação por arquivo, incluindo o registro da aplicação. A migração 055 cria o registro de objetos do Storage. A instalação limpa foi verificada em schema temporário sem copiar dados reais; isso não substitui a validação no serviço gerenciado escolhido.

```sh
npm run migrate
```

Executar contra o **banco de destino confirmado**, após backup quando ele já tiver dados. Nunca executar o comando no banco local por engano. Não importar dados pessoais para homologação. Para produção, decidir separadamente quais dados existentes serão transferidos, mediante autorização.

A conta de runtime deve ter apenas acesso ao schema, tabelas, sequências e funções necessárias; não usar superusuário. A conta de migração fica no job de release. O exemplo Render usa `preDeployCommand`; se isso usar o mesmo segredo de runtime, separar as credenciais num job de migração antes da implantação final. Manter a conta de runtime sem CREATE DATABASE/CREATE ROLE.

## 3. Firebase

Após aprovação de faturamento, criar/selecionar o projeto, habilitar Storage, escolher a região e anotar o nome exato do bucket (sem `gs://`). Não adivinhar o sufixo do bucket.

Publicar as regras de `deploy/storage.rules`: nenhum acesso direto pelo cliente. Configurar IAM sem `allUsers`/`allAuthenticatedUsers` e sem escrita pública. Criar conta de serviço dedicada com acesso somente aos objetos do bucket necessário, sem papel Owner/Editor global. O Admin SDK usa IAM e não depende das regras de cliente para sua autorização. [Admin Storage](https://firebase.google.com/docs/storage/admin/start).

Guardar a credencial exclusivamente no gerenciador de segredos do Render: arquivo secreto referenciado por `GOOGLE_APPLICATION_CREDENTIALS`, ou JSON em `FIREBASE_SERVICE_ACCOUNT_JSON`. Configurar:

```text
IMAGE_STORAGE=firebase
FIREBASE_STORAGE_BUCKET=nome-real-do-bucket
```

Não é necessário adicionar Firebase Auth ao frontend. A API autoriza o upload com a sessão existente, proprietário, perfil e permissões de vínculo. As imagens são decodificadas e reencodificadas em WebP, removendo EXIF/GPS. São aceitos JPEG, PNG e WebP estáticos, até 16 megapixels, com os limites de entrada de cada fluxo. Não há upload de SVG.

Fluxos: perfil dos quatro tipos, galeria da academia, fotos de evolução do aluno/personal autorizado e fotos do diário alimentar. Marketplace e cards leem as mesmas referências. Os arquivos ficam em `finalidade/proprietario/UUID.webp`; o PostgreSQL registra bucket, caminho, hash, tamanho, estado, proprietário e autor.

**Política de leitura:** nenhum objeto Firebase é público, inclusive fotos de marketplace. A busca atual já exige login. O endpoint `/api/midia/:id` verifica sessão e referência vigente; fotos profissionais são visíveis aos alunos do marketplace, fotos de aluno aos próprios titulares e profissionais vinculados conforme a finalidade. Fotos de evolução e refeições exigem as permissões específicas a cada acesso. Não se distribuem URLs de download permanentes ou tokens de acesso ao bucket. O acesso dura enquanto a sessão e a permissão forem válidas; as respostas usam `private, no-store`.

## 4. API no Render

Usar `deploy/render.yaml.example` como modelo revisável, substituindo os dados no painel. O arquivo não cria recursos sozinho. Configurar Node 22, build `npm ci --omit=dev`, start `npm start`, health `/api/health`, `NODE_ENV=production`, `BIND_HOST=0.0.0.0`. O Render fornece `PORT`.

Definir banco, Firebase, `FRONTEND_URL=https://dominio-exato-do-site` e, se necessário, `FRONTEND_URLS` como lista explícita. Não usar `*`, caminhos ou previews arbitrários. Produção recusa origens HTTP, banco remoto sem TLS e Storage desativado.

`TRUST_PROXY` fica desativado até conferir a cadeia de proxies e os headers do provedor. O modo `true` atual confia em um salto: não ativar sem testar se o IP usado pelo rate limit pode ser forjado. No arranjo Vercel + Render há mais de uma camada; validar o caminho direto e o caminho via Vercel. O padrão conservador pode limitar usuários em conjunto, mas não confia em IP arbitrário enviado pelo cliente.

Configurar Gmail por segredo somente se o plano permitir SMTP, e testar entrega real. Geocodificação exige `GEOAPIFY_API_KEY`; Google Routes é opcional e não necessário para a distância em linha reta. Não ativar essas APIs pagas automaticamente.

## 5. Frontend na Vercel

Após aprovação, copiar `deploy/vercel.json.example` para `vercel.json` na raiz, substituir `SUBSTITUIR-API` pelo host real do Render e confirmar que a regra `/api` precede o fallback da SPA. Configurar Node 22, build `npm run build`, saída `dist` e `VITE_API_URL=/api`. Não definir DATABASE_URL ou segredos Firebase na Vercel para este frontend estático.

Rewrites externas mantêm a URL no navegador. Não habilitar cache de respostas da API. [Rewrites Vercel](https://vercel.com/docs/routing/rewrites). Testar login, Set-Cookie, recarga, logout e imagem autenticada pelo domínio do site: a existência do arquivo de configuração não comprova a preservação dos cookies pelo proxy publicado.

## 6. Domínio e teste publicado

Conectar o domínio no painel, aplicar apenas os registros DNS fornecidos e aguardar HTTPS válido. Atualizar as origens permitidas no backend. A URL da API continua escondida atrás de `/api` para o navegador, mas o endpoint Render pode existir publicamente e mantém autenticação/CORS/CSRF.

```sh
npm run security:publicacao -- --url=https://seu-dominio
```

Com contas fictícias: testar cadastro/login dos quatro perfis; recarga e novo login; sessão revogada após logout; foto de perfil, galeria, troca e remoção; fotos privadas sem vínculo e depois da revogação; imagem após reiniciar API; treinos e alimentação; operação de academia; fallback da SPA em URL direta; upload inválido; recuperação de senha. Conferir headers, cookies Secure/HttpOnly e ausência de segredos no bundle. Não inserir dados reais antes da validação.

## 7. Migração das imagens existentes

O aplicativo continua lendo data URLs antigas. Não apagar imagens existentes nem substituir referências em massa durante o deploy. URLs HTTPS legadas não são baixadas pelo servidor.

```sh
npm run imagens:migrar
```

Esse comando apenas faz prévia agregada das imagens base64. Para aplicação: backup do banco e bucket, interromper todas as instâncias da API, definir `MAINTENANCE_MODE=true`, executar `npm run imagens:migrar -- --apply`. Em produção é necessário também `--production-approved`, **somente depois da aprovação da proprietária**. O script é repetível, reutiliza hash por dono/finalidade, verifica o valor original no UPDATE e não imprime imagens/contatos. Falhas preservam a referência anterior. Fotos do legado `fotos_trabalho_personal` não são migradas porque não foi identificado um fluxo ativo correspondente; a tabela permanece preservada.

Objetos são registrados antes do upload. Falha de salvamento pode deixar objeto sem referência, mas com registro identificável. Imagens removidas/substituídas deixam de ser servidas imediatamente; retenção física mínima de 30 dias para recuperação. Não configurar lifecycle que apague objetos referenciados por idade.

```sh
npm run imagens:limpar
```

Prévia somente. Exclusão física exige manutenção com a API parada, backup e `--apply` (mais `--production-approved` em produção). O coletor verifica referências atuais antes de excluir, recusa bucket divergente e permite repetir após falha. A limpeza **não é automática**; agendar uma janela de manutenção e registrar resultado. Não executada em dados reais nesta preparação.

## 8. Backup e restauração

Habilitar backups/PITR no plano gerenciado e definir responsável, retenção e frequência. Usar também `pg_dump --format=custom --no-owner --file=backup.dump` com credenciais em arquivo `.pgpass` protegido ou gerenciador de segredos; não colocar senhas em comandos ou no Git. O backup inclui dados pessoais: criptografar, restringir acesso e manter fora do repositório.

Fazer backup dos objetos e habilitar política de recuperação/soft delete compatível com o orçamento do bucket. Um backup do PostgreSQL sem os objetos não restaura as imagens migradas.

Ensaio de recuperação: criar destino isolado autorizado, restaurar com `pg_restore --no-owner --dbname=destino backup.dump`, restaurar os objetos nos caminhos registrados, conferir contagens, FKs, login e mídia. Não usar `--clean` em banco existente. O teste real de restauração no provedor ainda é pendente.

## 9. Atualizações e reversão

Registrar uma versão Git revisada, validar segredos e executar testes antes do deploy. Manter deploy automático desligado até a aprovação final. Fazer backup, executar migrações com conta própria e publicar API compatível antes do frontend.

Reversão: usar o release anterior compatível com as referências `/api/midia`; não retornar a uma versão que desconhece o novo Storage após migrar imagens. Não executar migrações inversas destrutivas. Para reversão completa do formato antigo, restaurar o backup em outro banco e fazer troca controlada de conexão após aprovação, avaliando perda de escritas posteriores. Manter bucket e objetos até verificar a recuperação.

## 10. Aprovação para publicação

- [ ] Custos, região, contas e domínio aprovados.
- [ ] Versão Git revisada, sem segredos, com alterações existentes preservadas.
- [ ] Runtime Node 22 instalado/configurado.
- [ ] Migrações aprovadas no banco gerenciado vazio.
- [ ] IAM, regras e credenciais do bucket configurados pelo gerenciador de segredos.
- [ ] Cookies e proxy validados no ambiente externo.
- [ ] Recuperação de senha e geocodificação verificadas se incluídas na entrega.
- [ ] Backup e restauração ensaiados.
- [ ] Resultados locais e limitações lidos no relatório de validação.
- [ ] Aprovação final para tornar o sistema público.

Informações não secretas necessárias na próxima etapa: serviços/plano aprovados, região, domínio desejado e identificação do projeto/bucket. Credenciais devem ser preenchidas diretamente nos painéis ou arquivos secretos locais; não enviadas na conversa.
