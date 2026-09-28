# SSD: especificação e design do sistema

Descreve como o app funciona hoje e como deve evoluir. Requisitos em [PRD.md](PRD.md); testes em [TDD.md](TDD.md). Tudo aqui foi conferido no código em 28/09/2026; o que ainda não existe está marcado como **Proposto**.

## 1. Visão geral
App Expo (SDK 57) / React Native 0.86 / React 19 / TypeScript estrito. Supabase gerenciado (Auth + Postgres + Edge Functions) cobre contas opcionais (seção 10) e a posição real dos ônibus: um `pg_cron` aciona a Edge Function `urbs-vehicles`, que grava as posições no Postgres — o app só lê, nunca fala com a URBS (seção 4.1). A rede estática (linhas, paradas, traçados) vem embutida via GeoCuritiba. Sem as variáveis de ambiente do Supabase (Jest, dev sem `.env.local`), o app cai para a simulação em memória (`MockTransitProvider`).

Stack: expo-router ~57 (rotas em `src/app/`), react-native-maps (Apple Maps no iOS, Google Maps no Android), @gorhom/bottom-sheet, react-native-reanimated e gesture-handler, zustand (estado), @tanstack/react-query (instalado, sem uso — o polling de posições usa `setTimeout` dentro do próprio provider, seção 4.1), AsyncStorage (favoritos), expo-location, lucide-react-native. Gerenciador de pacotes: Yarn 1.22.

## 2. Camadas
```
src/app/(tabs)/*.tsx        telas (Mapa, Linhas, Como Ir, Favoritos)
        │
src/components/*            CuritibaMap, BusMarker, StopMarker, TransitBottomSheet, BusBadge, CategoryPills
        │
src/hooks/* + src/stores/*  useLiveVehicles, useUserLocation | useTransitStore, useFavoritesStore
        │
src/services/*              transitProvider (transitService) ─┬─ SupabaseTransitProvider (real, seção 4.1)
                                                                └─ MockTransitProvider (fallback sem Supabase)
                             tripPlanner, arrivals
        │
src/data/curitibaDataset.ts + geocuritiba.json   rede estática real (314 linhas, 6.955 paradas; gerada por `yarn data:geocuritiba`)
src/utils/geo.ts            Haversine, bearing, interpolação, formatação
src/types/transit.ts        modelo de dados
src/constants/*             cores RIT, estilo do mapa, tema

supabase/functions/urbs-vehicles/ + supabase/migrations/   servidor: cron → Edge Function → Postgres (seção 4.1)
```
Regra: telas e componentes não conhecem a origem dos dados; falam com hooks/stores/services.

## 3. Modelo de dados (`src/types/transit.ts`)
- `BusCategory`: `expresso | ligeirao | ligeirinho | interbairros | alimentador | troncal | convencional | madrugueiro | turismo | operacional` (as 10 categorias RIT, ver `src/constants/rit.ts`).
- `BusLine`: código, nome, categoria, cor, terminais de origem/destino, tarifa, horário de funcionamento, frequência no pico, `trajetoIda`/`trajetoVolta` (polylines) e `paradasIda`/`paradasVolta` (IDs).
- `BusStop`: id, nome, tipo (`tubo | comum | terminal`), coordenada, bairro, `linhas` (códigos que passam nela).
- `BusVehicle`: id, prefixo, linha, coordenada, `bearing`, velocidade, `sentido` (`ida | volta | null` — `null` quando não dá para inferir, seção 4.1), `situacao` (URBS SITUACAO), `foraDaRota`, `lotacao` (opcional; a URBS não fornece), ar-condicionado, PCD, última atualização.
- `ArrivalEstimate`, `TransitAlert`, `TripLeg`, `TripPlanOption`.

## 4. Fluxos
### 4.1 Posição dos ônibus (real via Supabase)
Um `pg_cron` (`urbs-vehicles-every-2-min`) chama a cada 2 min a Edge Function `supabase/functions/urbs-vehicles` via `pg_net`, com a URL do projeto e o segredo do cron lidos do Vault (`project_url`, `urbs_cron_secret`) e enviados no header `x-cron-secret`. A função: aceita só `POST`, compara o header em tempo constante, aplica um throttle de 90 s sobre `bus_feed_status.last_attempt_at` (tolera jitter do cron sem duplicar chamada), faz **uma** chamada a `getVeiculos` com timeout de 10 s, e loga erro só por categoria (`network`, `timeout`, `http_5xx`, `parse`, `empty`), nunca URL nem código de acesso. `parse.ts` descarta veículo sem `SITUACAO`/`SENT`, `CODIGOLINHA` `REC` (recolhimento), coordenada fora da caixa de Curitiba, e `REFRESH` com mais de 10 min. O resultado vai para a RPC `ingest_bus_positions` (security definer, `search_path=''`, executável só por `service_role`): grava a posição anterior só quando a nova é mais recente, e mantém cada veículo por 10 min contados do seu próprio `REFRESH` — uma leitura mais velha nunca sobrescreve uma mais nova (migration `20260926122000`).

O app (`SupabaseTransitProvider`, `src/services/realtime/supabaseTransitProvider.ts`) nunca fala com a URBS: só com Supabase, pela chave publishable. Enquanto o mapa tem assinante e o app está em primeiro plano, faz *poll* de `bus_feed_status.fetched_at` a cada 30 s (`setTimeout` recursivo, não react-query); quando o carimbo muda, baixa `bus_positions` paginado (1000 linhas) e monta `BusVehicle[]` (`vehicleMapping.ts`). O sentido (`ida`/`volta`) vem do deslocamento entre a posição atual e a anterior ao longo do trajeto de ida (`resolveDirection`) — o `SENT` da URBS não serve, sua convenção de ida/volta é outra (D10); veículo parado ou sem posição anterior fica com sentido `null` e some das previsões de chegada. Linha fora do dataset (ex.: X37, X43) é ignorada. Em erro, aplica backoff até 120 s; se o feed não atualiza há mais de 6 min, o estado de conexão vira `error` mas os últimos ônibus continuam no mapa.

### 4.2 ETA por parada
`getArrivalsForStop(stopId)` (`computeArrivals`): para cada linha da parada, considera só os veículos cujo sentido atende essa parada (`paradasIda`/`paradasVolta`) e que ainda não passaram dela no trajeto (`isBusApproachingStop`); veículo com sentido desconhecido (`null`) fica de fora. Dentre os que sobram, até 8 km em linha reta, minutos = distância / 360 m/min (mínimo 1). A `situacao` da URBS (no horário/atrasado/adiantado/não conformidade) é repassada sem alteração. Ordena por minutos.

### 4.3 Planejador (`planTransitTrip`)
Busca as paradas a até 500 m a pé da origem e do destino (mínimo 3, teto 40 candidatas). Para cada par com linha em comum, verifica se o embarque vem antes do desembarque no itinerário real da linha, num dos dois sentidos (`buildItineraryBetween`) — só então monta a rota direta (caminhada a 80 m/min, ônibus a 350 m/min em linha reta, mínimo 3 min, tarifa 6,00). Com menos de 2 rotas diretas, busca baldeação: só existe se as duas linhas candidatas têm um terminal em comum (`findCommonTerminal`, verifica o `tipo: 'terminal'` do dataset) e cada trecho respeita o sentido do itinerário; sem terminal comum, não há rota de baldeação — nenhum terminal fixo "chutado". Integração gratuita (3 min) no terminal, tarifa total 6,00. Ordena por duração total. A tela `routes.tsx` escolhe origem e destino entre as paradas do dataset.

### 4.4 Favoritos
`useFavoritesStore` (zustand `persist` + AsyncStorage, chave `curitiba-bus-favorites`) guarda códigos de linha e IDs de parada.

## 5. Estado
- `useTransitStore`: linha, parada e veículo selecionados; categoria ativa; sentido ativo; busca; camada de trânsito.
- `useFavoritesStore`: persistido.
- Servidor/remoto: `SupabaseTransitProvider` faz o próprio polling (seção 4.1); `@tanstack/react-query` está instalado mas sem uso.

## 6. Integração com a URBS
**Tempo real (posição dos veículos): implementado**, arquitetura completa na seção 4.1. Sem proxy: a ingestão acontece só no servidor (Edge Function `urbs-vehicles`, `service_role`), o app nunca fala com a URBS nem recebe a chave. O único segredo é `URBS_CODE`, um secret da Edge Function (a var `CODE_URBS` do `.env.local` é só para uso local, nunca entra no bundle). Endpoint e formato de `getVeiculos` confirmados, ver [URBS-WEBSERVICE.md](URBS-WEBSERVICE.md). `URBS_CONFIG.intervaloAtualizacaoMs` foi removido por não ter uso — a cadência real é o `pg_cron` de 2 min mais o *poll* de 30 s do app (seção 4.1).

**Estáticos (linhas, pontos, itinerários, GTFS com horários): em andamento (Fase 3, ainda não mesclada).** Hoje a rede estática vem do GeoCuritiba (314 linhas, 6.955 paradas, sem horários; `trajetoVolta` é `trajetoIda` invertido, não o traçado real de volta). Uma PR separada vai importar o GTFS público da URBS (sem credencial, CC BY 4.0) para traçados reais por sentido, horários, as linhas X37/X43 (hoje ignoradas por não estarem no dataset) e a remoção de linhas desativadas.

## 7. Decisões
| # | Decisão | Motivo |
|---|---|---|
| D1 | Sem API própria; backend gerenciado (Supabase) para contas e para a ingestão das posições dos ônibus | Trabalho solo; dados de transporte são abertos. O app nunca fala direto com a URBS nem com Postgres/MySQL — a credencial iria no bundle; quem ingere é a Edge Function, o app só lê |
| D2 | react-native-maps (nativo) | Desempenho de mapa com muitos marcadores; `tracksViewChanges={false}` após montagem |
| D3 | zustand para estado de UI, react-query para dado remoto | Simplicidade; cada um no seu papel |
| D4 | Expo Router com rotas em `src/app/` | Padrão do SDK 57 |
| D5 | Docs em `docs/` do repo como fonte; ClickUp espelha | O repo é versionado e lido em toda sessão |
| D6 | Login opcional; o app funciona como visitante | Diretriz 5.1.1(v) da App Store e pausa do plano gratuito do Supabase |
| D7 | E-mail e senha, sem login social no MVP | Login social obrigaria a oferecer "Entrar com Apple" |
| D8 | Sessão em `LargeSecureStore` (AES-256 no AsyncStorage, chave no `expo-secure-store`) | SecureStore limita 2048 bytes; padrão da documentação do Supabase para Expo |
| D9 | Ingestão das posições só no servidor; o app só lê, nunca chama a URBS | O segredo (`URBS_CODE`) fica só na Edge Function; sem proxy nem chave no bundle |
| D10 | Sentido do veículo inferido pelo deslocamento ao longo do trajeto de ida, não pelo `SENT` da URBS | O `SENT` da URBS usa outra convenção de ida/volta; inferir pelo trajeto evita inconsistência |
| D11 | Retenção de 10 min por veículo contada do próprio `REFRESH`, não por rodada do cron | Uma rodada com retrato atrasado da URBS não pode apagar veículos ainda válidos |

## 8. Limites conhecidos (dívida validada no código)
1. **ETA por distância reta, não pelo trajeto**: já considera sentido e se o ônibus ainda não passou da parada (seção 4.2), mas a distância usada é linha reta, não o trajeto real. `previstoParaTs` conta a partir de `fetched_at`, mesmo que a posição do veículo tenha até 10 min (retenção, seção 4.1). Sem o estado "Chegando" abaixo de 400 m.
2. **Simulação**: só roda como reserva quando o Supabase não está configurado (Jest, dev sem `.env.local`); com assinante e app em primeiro plano, o passo por tick é proporcional a `velocidadeKmH` e ao tamanho do segmento (não mais um incremento fixo), pausa em segundo plano e o timer é limpo ao perder o último assinante.
3. **Planejador**: a baldeação é fabricada (tempos fixos 14+4+12, linhas escolhidas por ser a primeira de cada parada, número de paradas fixo, sempre "Terminal Cabral"), e não verifica se as duas linhas realmente se encontram no terminal. A rota direta ignora o sentido. Origem e destino limitados às paradas do dataset.
4. **Favoritos nascem pré-preenchidos** (`['203','500']` e duas paradas) em vez de vazios.
5. **Design system**: 181 cores hexadecimais fixas nos `.tsx`; `theme.ts` é o do template Expo e as telas novas não o usam; telas só em modo claro. Detalhes em [DESIGN.md](../DESIGN.md).
6. **Acessibilidade e testabilidade**: todo elemento interativo alcançável (telas de `src/app/`, `CuritibaMap`, `TransitBottomSheet`, `BusBadge`, `CategoryPills`, `Collapsible`, `FormField`) tem `testID`/`accessibilityLabel`. Os `.tsx` sem essas props não têm elemento interativo próprio: `_layout.tsx` (config de navegação; as abas usam `tabBarButtonTestID`/`tabBarAccessibilityLabel`, não `testID`), `app/index.tsx` (só `Redirect`), `AuthProvider.tsx` (sem JSX), wrappers genéricos que repassam props (`themed-text`, `themed-view`, `external-link`), `BusMarker`/`StopMarker` (a marcação fica no `<Marker>` que os envolve, em `CuritibaMap.tsx`) e os restos de template do item 7.
7. **Restos do template Expo** ainda no repo, sem nenhum import fora deles mesmos (animated-icon, hint-row, web-badge, external-link, collapsible, ícones e logos de exemplo).
8. **Dados**: rede e posições reais (GeoCuritiba + URBS, seção 4.1); `trajetoVolta` é `trajetoIda` invertido, não o traçado real de volta. Linhas fora do dataset (ex.: X37, X43) são ignoradas. Sem horários (GTFS estático em andamento, seção 6). O marcador salta entre leituras do Supabase (~2 min), sem animação/interpolação visual. O filtro por categoria (`CategoryPills`) já cobre as 10 categorias RIT (seção 3).
9. **Lint**: 2 erros `react-hooks/set-state-in-effect` (`useUserLocation.ts` e `use-color-scheme.web.ts`) e 10 avisos de variável não usada/import duplicado.
10. ~~**Config nativa**~~ **Resolvido**: `app.json` tem o plugin `expo-location` com texto em pt-BR (`NSLocationWhenInUseUsageDescription`) e permissões Android de localização em primeiro plano; sem localização em background. Em build nativo o GPS não depende mais do Expo Go.
11. **Dependências**: 4 das 5 moderadas (`uuid` via `xcode`) resolvidas por `resolutions`. Resta 1: `expo-router > query-string > decode-uri-component` (só ESM nas versões corrigidas, quebraria o `query-string@7`); mitigação e plano em [SECURITY.md](SECURITY.md) T8. Dependabot version updates semanais e `yarn audit` (informativo) no CI.
12. **Repositório**: `permissions: contents: read` no CI resolvido; `.env.example` existe. Pendente, por decisão do dono no GitHub: proteção da `main` e Dependabot security updates.

## 10. Contas e backend (Supabase)
Decisões: login **opcional** (D6), e-mail e senha (D7), sessão em `LargeSecureStore` (D8). Ameaças e controles em [SECURITY.md](SECURITY.md); dados e direitos em [PRIVACY.md](PRIVACY.md).

### 10.1 Componentes
- Cliente `@supabase/supabase-js` em `src/lib/supabase.ts`, configurado com `EXPO_PUBLIC_SUPABASE_URL` e a chave **publishable** (pública por desenho). `autoRefreshToken` e `persistSession` ligados, `detectSessionInUrl: false`, e `AppState` chama `startAutoRefresh`/`stopAutoRefresh`.
- `AuthProvider` (`src/providers/AuthProvider.tsx`): guarda a sessão via `onAuthStateChange`. Sem guard de rota: visitante entra em tudo.
- Telas fora das abas: `src/app/(auth)/sign-in`, `sign-up`, `forgot-password`, `reset-password` (deep link `curitibabusapp://`) e seção "Conta" em Favoritos (entrar, sair, excluir conta).
- Edge Function `delete-account` (`supabase/functions/delete-account/`): só POST; valida o JWT do chamador com um cliente de anon key (`auth.getUser`) e remove só o usuário do próprio token, ignorando qualquer id de corpo ou query; usa a `service_role` do ambiente do Supabase, nunca do app. Responde 204, 401, 405 (e 500 genérico se o Auth falhar), sem detalhe interno. Lógica em `handler.ts`, com os clientes injetados para teste; `index.ts` só liga os clientes reais.
- Edge Function `urbs-vehicles` (`supabase/functions/urbs-vehicles/`): `verify_jwt=false` (chamada só pelo `pg_cron`, sem JWT de usuário); só POST; compara o header `x-cron-secret` em tempo constante; responde 204 (throttle), 401 (segredo errado), 405 (método errado), 502 (falha upstream/parse/feed vazio) ou 500 (falha inesperada), sempre sem detalhe interno. Pipeline completo na seção 4.1.

### 10.2 Banco
```
favorites (
  user_id    uuid references auth.users on delete cascade,
  kind       text check (kind in ('line','stop')),
  ref        text,                       -- código da linha ou id da parada
  created_at timestamptz default now(),
  primary key (user_id, kind, ref)
)

bus_positions (              -- só a Edge Function urbs-vehicles escreve, via RPC (seção 4.1)
  prefix              text primary key,   -- COD
  line_code           text not null,      -- CODIGOLINHA
  lat, lon            double precision not null,
  prev_lat, prev_lon  double precision,   -- posição anterior (sentido e rumo)
  refreshed_at        timestamptz not null, -- REFRESH da URBS como instante
  prev_refreshed_at   timestamptz,
  status              text,               -- SITUACAO: on_time | late | early | nonconforming
  route_state         text,               -- SITUACAO2: on_route | off_route | other
  urbs_direction      text,               -- SENT cru, não usado pelo app (D10)
  accessible          boolean not null default false,
  vehicle_type, schedule_table text,
  fetched_at          timestamptz not null -- rodada do feed que gravou a linha
)

bus_feed_status (             -- singleton id=1, saúde do feed
  id smallint primary key default 1,
  fetched_at, last_attempt_at, last_error_at timestamptz,
  last_error    text,         -- só categoria, nunca URL nem código de acesso
  vehicle_count integer not null default 0
)

app_config (                  -- singleton id=1, gate de versão mínima; lido antes do login, para todos
  id smallint primary key default 1,
  min_version text not null,
  ios_url, android_url text,
  updated_at timestamptz not null default now()
)
```
RLS ligada e forçada em todas. Em `favorites`, políticas de select, insert e delete (`to authenticated`) com `(select auth.uid()) = user_id`. Em `bus_positions`, `bus_feed_status` e `app_config`, só policy de select, liberada para `anon` e `authenticated` — funcionam para visitante (D6) e antes do login; escrita nelas só pelas RPCs `security definer` (`ingest_bus_positions`, `mark_bus_feed_attempt`), executáveis só por `service_role`, sem `GRANT` de insert/update/delete para `anon`/`authenticated`. O projeto foi criado com "Automatically expose new tables" **desligado**, então cada tabela nova precisa de `GRANT` explícito na própria migration. "Enable automatic RLS" está ligado como rede de segurança. Migrations em `supabase/migrations/`. Sem tabela de perfil (dados mínimos: e-mail do Auth e favoritos).

### 10.3 Fluxos
- **Cadastro:** e-mail + senha, e-mail de confirmação com link para `curitibabusapp://`, só então a sessão fica ativa.
- **Login:** sessão cifrada no aparelho; o app abre logado sem rede com os favoritos do cache local.
- **Primeiro login:** favoritos locais e da nuvem são unidos (sem duplicar e sem perder nenhum lado).
- **Sync:** alterações locais vão para a nuvem com atualização otimista; falha de rede não bloqueia o uso.
- **Sair:** volta a visitante mantendo os favoritos locais.
- **Excluir conta:** confirmação, chamada à Edge Function, limpeza do estado de sessão, volta a visitante.

### 10.4 Configuração do projeto
Projeto criado em 21/09/2026 (organização gratuita, região São Paulo, compute Nano). Configurado: confirmação de e-mail ligada, login anônimo e provedores sociais desligados, senha mínima 8, Site URL `curitibabusapp://` e allowlist de redirect só `curitibabusapp://**`. Pendente: SMTP próprio antes do release. Projetos gratuitos pausam após ~7 dias sem uso: definir keep-alive ou plano pago antes do release.

## 9. Qualidade e entrega
- Typecheck (`yarn typecheck`), lint (`yarn lint`) e gitleaks no pre-commit (lefthook); CI no PR roda typecheck e lint (lint ainda não bloqueante).
- Branches `feat/`, `fix/`, `docs/`, commits em inglês, entrega por PR. Sem push direto na `main`.
- Build de release por EAS (iOS TestFlight, Android teste interno). Chaves via EAS secrets.
