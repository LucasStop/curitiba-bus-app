# SECURITY: modelo de ameaças e controles

Escopo: app Expo (iOS/Android), projeto Supabase (Auth + Postgres + Edge Functions `delete-account` e `urbs-vehicles` + `pg_cron`/`pg_net` + Vault) e o repositório público `LucasStop/curitiba-bus-app`. Requisitos em [PRD.md](PRD.md), arquitetura em [SSD.md](SSD.md), privacidade em [PRIVACY.md](PRIVACY.md). Itens marcados **Proposto** ainda não existem no código.

## 1. Ativos
| Ativo | Onde vive | Sensibilidade |
|---|---|---|
| Sessão (access e refresh token) | Aparelho do usuário | Alta: dá acesso à conta |
| E-mail e senha da conta | Supabase Auth (senha só como hash, nunca acessível ao app) | Alta (dado pessoal) |
| Favoritos (linhas e paradas) | Aparelho; nuvem se logado | Baixa, mas vinculada a e-mail |
| Localização do usuário | Só no aparelho, nunca enviada | Alta (dado pessoal) |
| Chave publishable e URL do Supabase | App (bundle) | Pública por desenho |
| `service_role` / secret key do Supabase | Só no ambiente das Edge Functions | Crítica |
| Código de acesso da URBS (`URBS_CODE`) | Secret da Edge Function `urbs-vehicles` | Alta (vazamento = uso em nome do Lucas, corte do acesso, custo) |
| `URBS_CRON_SECRET` (secret da função) + Vault `urbs_cron_secret`/`project_url` | Secret da Edge Function `urbs-vehicles` + Supabase Vault | Média (rotacionar exige trocar os dois lados) |
| `bus_positions` / `bus_feed_status` | Postgres (RLS ligada e forçada; só `service_role` escreve, via RPC) | Dado público por desenho; o que importa é a integridade da escrita, não o sigilo da leitura |
| Chave do Google Maps (Android) | EAS secret | Média (restringir por app) |

## 2. Ameaças e controles
| # | Ameaça | Controle | Estado |
|---|---|---|---|
| T1 | Segredo vazado no repositório público | gitleaks no pre-commit (lefthook), secret scanning e push protection do GitHub, `.env*.local` ignorado, `.env.example` sem valores, segredos só em EAS secrets / Supabase secrets / Vault | Ativo; secret scanning e push protection confirmados habilitados no GitHub em 22/09/2026 |
| T2 | Usuário A lê ou altera dados do usuário B | RLS ligada em toda tabela, políticas por `(select auth.uid()) = user_id`, testes de isolamento com duas contas (R1 a R5) | Backend feito e testado; falta o app |
| T3 | `service_role` exposta no app | Nunca no bundle nem no repo; só nas Edge Functions `delete-account` e `urbs-vehicles`, que a recebem do ambiente do Supabase | Ativo |
| T4 | Roubo de sessão no aparelho | Sessão cifrada (AES-256, `aes-js`) no AsyncStorage com a chave em `expo-secure-store` (Keychain/Keystore, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`); chave nova a cada gravação | Ativo (`src/lib/largeSecureStore.ts`) |
| T5 | Força bruta e enumeração de contas | Rate limits do Supabase Auth (`auth.rate_limit`), senha mínima de 8 (validada no cliente e no servidor), mensagens genéricas em login e recuperação ("E-mail ou senha incorretos."), confirmação de e-mail obrigatória | Ativo |
| T6 | Phishing ou desvio no link de recuperação/confirmação | Allowlist de redirect só `curitibabusapp://**` (`additional_redirect_urls`), link de recuperação de uso único com expiração (OTP do Supabase Auth) | Ativo |
| T7 | Abuso da função de excluir conta | A função valida o JWT e apaga apenas o usuário do próprio token, nunca um id vindo de parâmetro (teste R6) | Backend feito e testado; falta o deploy e o app |
| T8 | Dependência vulnerável | `yarn audit` no CI (informativo), Dependabot version updates semanais (`.github/dependabot.yml`), Dependabot security updates (alerta de vulnerabilidade → PR automático, configuração de repositório, não do `dependabot.yml`), `npx expo install --fix`, `resolutions` quando seguro | Parcial: 1 moderada sem correção segura (abaixo, Dependabot #1); Dependabot security updates confirmado habilitado no GitHub em 22/09/2026 |
| T9 | Vazamento de localização | Usada só no aparelho; proibido enviar ou registrar coordenadas | Ativo: o app consulta o Supabase (mapa, favoritos) mas nenhuma requisição carrega coordenada do usuário |
| T10 | Push malicioso ou histórico reescrito na `main` | Proteção da `main`: PR obrigatório com CI verde, sem force push | Proposto (hoje desprotegida) |
| T11 | Permissões excessivas no CI | `permissions: contents: read` no workflow; ações fixadas por versão | Parcial: `permissions: contents: read` ativo; ações ainda por tag (`@v4`), não por SHA (o Dependabot `github-actions` mantém as versões em dia) |
| T12 | Dado pessoal em issue, doc ou log | Repo é público: nada de e-mail, token ou coordenada real em docs, issues, screenshots ou logs | Regra |
| T13 | Abuso do endpoint do cron (`urbs-vehicles`) | URL pública (`verify_jwt=false`), só aceita `POST`, header `x-cron-secret` comparado em tempo constante (`safeEqual`), throttle de 90 s via `bus_feed_status.last_attempt_at` limita as chamadas à URBS mesmo com o segredo vazado, erros logados só por categoria. Residual: um 401 ainda conta como invocação; o throttle não tem lock, então duas chamadas concorrentes com o segredo em mãos poderiam bater na URBS ao mesmo tempo. Testes: `handler_test.ts` | Ativo |
| T14 | Vazamento do `URBS_CODE` | Código só aparece na URL montada em `index.ts`; exceções nunca são repassadas (o handler captura e loga só a categoria do erro); teste confere que os logs não têm o segredo | Ativo |
| T15 | Escrita indevida em `bus_positions`/`bus_feed_status` | RLS ligada e forçada; `anon`/`authenticated` só com `select`; RPCs `ingest_bus_positions`/`mark_bus_feed_attempt` são `security definer` com `search_path=''`, `EXECUTE` revogado de `public` e concedido só a `service_role`; pgTAP `bus_positions_rls` (14 asserções) verde em 28/09 | Ativo |
| T16 | Esgotar a quota do Free | Leitura anônima ilimitada de `bus_positions`/`bus_feed_status`: qualquer um com a chave publishable lê as tabelas, e muitos clientes simultâneos (cada um baixa ~300 KB por rodada) podem esgotar o egress e derrubar o mapa para todo mundo | Aceito / medir |

Advisors do linter de segurança do Supabase: `rls_auto_enable` (função do event trigger que o próprio Supabase cria ao ligar RLS automático) tinha `EXECUTE` aberto para `anon`/`authenticated` via `/rest/v1/rpc` (advisories 0028/0029) — corrigido pela migration `20260928120000_revoke_rls_auto_enable.sql`. Advisor restante: "leaked password protection" (checagem de senha vazada via HaveIBeenPwned), disponível só no plano Pro — aceito por ora.

### Auditoria de dependências (T8), estado em 21/09/2026 (revalidado em 22/09/2026)
`yarn audit` acusava 5 moderadas transitivas. São dois advisories:

| Pacote | Advisory | Caminho | Estado |
|---|---|---|---|
| `uuid` 7.0.3 (4 caminhos) | 1119441: falta checagem de limite do buffer em v3/v5/v6 quando `buf` é passado | `expo > @expo/config-plugins > xcode > uuid` (e as variantes via `@expo/config`, `@expo/cli`, `@expo/metro-config`) | **Corrigido**: `resolutions` `"**/xcode/uuid": "^11.1.1"`. O `xcode` só chama `uuid.v4()`; só roda em build (prebuild/config plugins), não entra no bundle do app. Validado com `expo prebuild --platform ios` e `expo export --platform ios`. |
| `decode-uri-component` 0.2.2 | 1147955: DoS por decodificação exponencial de entrada malformada; corrigido em >=0.5.0 | `expo-router > query-string@7.1.3 > decode-uri-component` | **Sem correção segura** |

Por que `decode-uri-component` não foi forçado: as versões corrigidas (0.3+) são só ESM (`"type": "module"`, `export default`) e o `query-string@7` faz `require('decode-uri-component')`. Testado: `require()` da 0.5.0 devolve `{ __esModule, default }` em vez da função, então o parse de query string do `expo-router` quebraria em runtime. `query-string` 8+ também é só ESM e é dependência fixada pelo `expo-router` (`^7.1.3`); trocar exige upgrade do `expo-router`, fora deste escopo.

Mitigação: o pacote roda no cliente e só recebe query strings de deep links e rotas do próprio app (`curitibabusapp://`); o pior caso é travar o app do próprio usuário com um link malformado, sem vazar dado nem executar código. O pacote não roda no servidor: as Edge Functions (`delete-account`, `urbs-vehicles`) são Deno isolado, com seu próprio `deno.json`, e não importam `expo-router` nem `query-string`. Reavaliar quando o `expo-router` do SDK seguinte atualizar o `query-string`; o Dependabot abre o PR.

Revalidado em 22/09/2026: `expo-router@57.0.22` (última do SDK 57) continua fixando `query-string@^7.1.3`; `decode-uri-component@0.5.0` continua `"type": "module"` sem export CJS. Nenhuma correção segura nova apareceu; `yarn audit` continua com exatamente essa 1 moderada.

`yarn audit --level high` fecha sem altas/críticas, mas o `yarn` 1 mantém o exit code 4 (moderada) mesmo com `--level`; por isso o passo do CI segue com `continue-on-error`.

## 3. Regras de segurança do código
1. Nunca logar token, e-mail, senha ou coordenadas (`console.log` revisado antes de cada release).
2. Toda tabela nova nasce com RLS ligada e políticas; sem política = sem acesso.
3. Segredo novo: se é do app (usado no cliente), entra em `.env.local` e no EAS; se é do servidor (Edge Function), entra via `supabase secrets set` ou no Vault. Nunca em migration nem em arquivo versionado.
4. Só HTTPS; nenhuma URL `http://` fora do desenvolvimento.
5. Entradas do usuário (e-mail, senha) validadas no cliente e de novo no servidor (Auth e políticas).
6. O app pede localização só quando o usuário usa o recurso, com texto claro em pt-BR.

## 4. Reportar uma vulnerabilidade
Não abra issue pública. Use "Report a vulnerability" na aba Security do repositório (relato privado, precisa estar habilitado nas configurações do GitHub) ou escreva ao responsável pelo projeto. Espere resposta em até 7 dias.

## 5. Pendências para fechar este documento
- Habilitar private vulnerability reporting e proteção da `main` no GitHub.
- Resolver ou aceitar formalmente a moderada de `decode-uri-component` (T8) e então tornar o `yarn audit` bloqueante.
- Medir T2 e T7 com testes reais (docs/TDD.md, casos R1 a R6): feito em parte em 28/09 via pgTAP local (`supabase test db`) — `favorites_rls.test.sql` (15 asserções, T2) e `bus_positions_rls.test.sql` (14 asserções, T15) verdes, todas as migrations aplicam do zero; T7 (`delete-account`) segue coberto pelos testes Deno do handler (9 asserções), rodados no CI a cada PR.
- Revisão de segurança independente antes do release nas lojas.
