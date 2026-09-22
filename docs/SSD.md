# SSD: especificação e design do sistema

Descreve como o app funciona hoje e como deve evoluir. Requisitos em [PRD.md](PRD.md); testes em [TDD.md](TDD.md). Tudo aqui foi conferido no código em 21/09/2026; o que ainda não existe está marcado como **Proposto**.

## 1. Visão geral
App Expo (SDK 57) / React Native 0.86 / React 19 / TypeScript estrito, sem backend próprio hoje. Toda a lógica roda no aparelho e a única fonte de dados é um dataset local simulado. **Proposto:** Supabase gerenciado (Auth + Postgres + Edge Functions) só para contas opcionais e sincronização de favoritos, ver seção 10.

Stack: expo-router ~57 (rotas em `src/app/`), react-native-maps (Apple Maps no iOS, Google Maps no Android), @gorhom/bottom-sheet, react-native-reanimated e gesture-handler, zustand (estado), @tanstack/react-query (instalado, ainda sem uso), AsyncStorage (favoritos), expo-location, lucide-react-native. Gerenciador de pacotes: Yarn 1.22.

## 2. Camadas
```
src/app/(tabs)/*.tsx        telas (Mapa, Linhas, Como Ir, Favoritos)
        │
src/components/*            CuritibaMap, BusMarker, StopMarker, TransitBottomSheet, BusBadge, CategoryPills
        │
src/hooks/* + src/stores/*  useLiveVehicles, useUserLocation | useTransitStore, useFavoritesStore
        │
src/services/*              transitProvider (transitService), tripPlanner
        │
src/data/curitibaDataset.ts fonte mock (5 linhas, 17 paradas, 3 alertas)   ←  Proposto: interface de provider com implementação URBS
src/utils/geo.ts            Haversine, bearing, interpolação, formatação
src/types/transit.ts        modelo de dados
src/constants/*             cores RIT, estilo do mapa, tema
```
Regra: telas e componentes não conhecem a origem dos dados; falam com hooks/stores/services.

## 3. Modelo de dados (`src/types/transit.ts`)
- `BusCategory`: `expresso | ligeirinho | interbairros | alimentador | troncal`.
- `BusLine`: código, nome, categoria, cor, terminais de origem/destino, tarifa, horário de funcionamento, frequência no pico, `trajetoIda`/`trajetoVolta` (polylines) e `paradasIda`/`paradasVolta` (IDs).
- `BusStop`: id, nome, tipo (`tubo | comum | terminal`), coordenada, bairro, `linhas` (códigos que passam nela).
- `BusVehicle`: id, prefixo, linha, coordenada, `bearing`, velocidade, sentido, lotação, ar-condicionado, PCD, última atualização.
- `ArrivalEstimate`, `TransitAlert`, `TripLeg`, `TripPlanOption`.

## 4. Fluxos
### 4.1 Posição dos ônibus (hoje: simulação)
`transitService` (singleton em `src/services/transitProvider.ts`) cria 2 a 3 veículos por linha no construtor e um `setInterval` de 3 s chama `tickSimulation`, que avança 0,15 do segmento atual, interpola a coordenada (`interpolateLatLng`), calcula o `bearing` e notifica os assinantes. `useLiveVehicles` assina, mantém a lista em estado local e filtra por linha ou categoria selecionadas (`useTransitStore`). O mapa renderiza `BusMarker` por veículo.

### 4.2 ETA por parada
`getArrivalsForStop(stopId)`: para cada linha da parada, para cada veículo da linha a até 8 km em linha reta, minutos = distância / 360 m/min (mínimo 1). Ordena por minutos.

### 4.3 Planejador (`planTransitTrip`)
Pega as 3 paradas mais próximas da origem e do destino. Para cada par com linha em comum, monta rota direta (caminhada a 80 m/min, ônibus a 350 m/min em linha reta, tarifa 6,00). Se houver menos de 2 opções, adiciona uma rota "via Terminal Cabral". Ordena por duração total. A tela `routes.tsx` escolhe origem e destino entre as paradas do dataset.

### 4.4 Favoritos
`useFavoritesStore` (zustand `persist` + AsyncStorage, chave `curitiba-bus-favorites`) guarda códigos de linha e IDs de parada.

## 5. Estado
- `useTransitStore`: linha, parada e veículo selecionados; categoria ativa; sentido ativo; busca; camada de trânsito.
- `useFavoritesStore`: persistido.
- Servidor/remoto: react-query está instalado para a integração URBS (**Proposto**); hoje não é usado.

## 6. Integração com a URBS (**Proposto**)
Fonte: dataset "Transporte Coletivo de Curitiba" nos Dados Abertos de Curitiba (GTFS, linhas, pontos, itinerários, posição dos veículos, tabela de horários; via WebService; atualização em tempo real).

1. **Interface de provider** em `src/services`: contrato único para linhas, paradas, veículos e alertas, com duas implementações (`mock` atual e `urbs`), escolhida por configuração. Telas e hooks não mudam.
2. **Estáticos (linhas, pontos, itinerários, horários)**: pré-processar o GTFS fora do app (script no repo gerando JSON) ou baixar e cachear; abrir sem rede após a primeira carga.
3. **Tempo real (posição)**: polling com react-query, intervalo configurável (`URBS_CONFIG.intervaloAtualizacaoMs`, hoje sem uso), pausando em segundo plano, com backoff em erro.
4. **Segredo**: se a URBS exigir chave, ela não pode ir no bundle. Opções a avaliar: proxy fino (Cloudflare Worker/Vercel function) que guarda a chave, ou pré-processamento. Decisão pendente da task "Obter acesso ao WebService URBS".
5. **Tolerância a falha**: dado vazio ou atrasado vira indicador na UI, nunca tela quebrada.

Endpoint e formato de resposta ainda não estão confirmados (um teste com chave inválida devolveu 200 vazio; o conjunto não tem dicionário de dados). Esta seção é hipótese até essa task terminar.

## 7. Decisões
| # | Decisão | Motivo |
|---|---|---|
| D1 | Sem API própria; backend gerenciado (Supabase) apenas para contas | Trabalho solo; dados de transporte são abertos. O app nunca fala direto com Postgres/MySQL, pois a credencial iria no bundle |
| D2 | react-native-maps (nativo) | Desempenho de mapa com muitos marcadores; `tracksViewChanges={false}` após montagem |
| D3 | zustand para estado de UI, react-query para dado remoto | Simplicidade; cada um no seu papel |
| D4 | Expo Router com rotas em `src/app/` | Padrão do SDK 57 |
| D5 | Docs em `docs/` do repo como fonte; ClickUp espelha | O repo é versionado e lido em toda sessão |
| D6 | Login opcional; o app funciona como visitante | Diretriz 5.1.1(v) da App Store e pausa do plano gratuito do Supabase |
| D7 | E-mail e senha, sem login social no MVP | Login social obrigaria a oferecer "Entrar com Apple" |
| D8 | Sessão em `LargeSecureStore` (AES-256 no AsyncStorage, chave no `expo-secure-store`) | SecureStore limita 2048 bytes; padrão da documentação do Supabase para Expo |

## 8. Limites conhecidos (dívida validada no código)
1. **ETA sem sentido nem trajeto**: conta ônibus em qualquer sentido, mesmo já tendo passado da parada; usa distância reta. Sem o estado "Chegando" abaixo de 400 m.
2. **Simulação**: inicia no import do módulo (efeito colateral), o `setInterval` nunca é limpo, não pausa em segundo plano, avança um passo fixo por tick (ignora `velocidadeKmH` e o tamanho do segmento), 3000 ms fixo enquanto `URBS_CONFIG.intervaloAtualizacaoMs` vale 5000, e o marcador salta a cada tick, sem interpolação visual.
3. **Planejador**: a baldeação é fabricada (tempos fixos 14+4+12, linhas escolhidas por ser a primeira de cada parada, número de paradas fixo, sempre "Terminal Cabral"), e não verifica se as duas linhas realmente se encontram no terminal. A rota direta ignora o sentido. Origem e destino limitados às paradas do dataset.
4. **Favoritos nascem pré-preenchidos** (`['203','500']` e duas paradas) em vez de vazios.
5. **Design system**: 181 cores hexadecimais fixas nos `.tsx`; `theme.ts` é o do template Expo e as telas novas não o usam; telas só em modo claro. Detalhes em [DESIGN.md](../DESIGN.md).
6. **Acessibilidade e testabilidade**: nenhum `accessibilityLabel` nem `testID` no app.
7. **Restos do template Expo** ainda no repo (animated-icon, hint-row, web-badge, external-link, collapsible, ícones e logos de exemplo).
8. **Dados**: 100% simulados; trajetos aproximados, não o traçado real.
9. **Lint**: 2 erros `react-hooks/set-state-in-effect` (`useUserLocation.ts` e `use-color-scheme.web.ts`) e 10 avisos de variável não usada/import duplicado.
10. ~~**Config nativa**~~ **Resolvido**: `app.json` tem o plugin `expo-location` com texto em pt-BR (`NSLocationWhenInUseUsageDescription`) e permissões Android de localização em primeiro plano; sem localização em background. Em build nativo o GPS não depende mais do Expo Go.
11. **Dependências**: 4 das 5 moderadas (`uuid` via `xcode`) resolvidas por `resolutions`. Resta 1: `expo-router > query-string > decode-uri-component` (só ESM nas versões corrigidas, quebraria o `query-string@7`); mitigação e plano em [SECURITY.md](SECURITY.md) T8. Dependabot version updates semanais e `yarn audit` (informativo) no CI.
12. **Repositório**: `permissions: contents: read` no CI resolvido. Pendente: `.env.example` e, por decisão do dono no GitHub, proteção da `main` e Dependabot security updates.

## 10. Contas e backend (Supabase) — **Proposto**
Decisões: login **opcional** (D6), e-mail e senha (D7), sessão em `LargeSecureStore` (D8). Ameaças e controles em [SECURITY.md](SECURITY.md); dados e direitos em [PRIVACY.md](PRIVACY.md).

### 10.1 Componentes
- Cliente `@supabase/supabase-js` em `src/lib/supabase.ts`, configurado com `EXPO_PUBLIC_SUPABASE_URL` e a chave **publishable** (pública por desenho). `autoRefreshToken` e `persistSession` ligados, `detectSessionInUrl: false`, e `AppState` chama `startAutoRefresh`/`stopAutoRefresh`.
- `AuthProvider` (`src/providers/AuthProvider.tsx`): guarda a sessão via `onAuthStateChange`. Sem guard de rota: visitante entra em tudo.
- Telas fora das abas: `src/app/(auth)/sign-in`, `sign-up`, `forgot-password`, `reset-password` (deep link `curitibabusapp://`) e seção "Conta" em Favoritos (entrar, sair, excluir conta).
- Edge Function `delete-account`: valida o JWT do chamador e remove só o usuário do próprio token; usa a `service_role` do ambiente do Supabase, nunca do app.

### 10.2 Banco
```
favorites (
  user_id    uuid references auth.users on delete cascade,
  kind       text check (kind in ('line','stop')),
  ref        text,                       -- código da linha ou id da parada
  created_at timestamptz default now(),
  primary key (user_id, kind, ref)
)
```
RLS ligada; políticas de select, insert e delete com `(select auth.uid()) = user_id`. Migrations em `supabase/migrations/`. Sem tabela de perfil (dados mínimos: e-mail do Auth e favoritos).

### 10.3 Fluxos
- **Cadastro:** e-mail + senha, e-mail de confirmação com link para `curitibabusapp://`, só então a sessão fica ativa.
- **Login:** sessão cifrada no aparelho; o app abre logado sem rede com os favoritos do cache local.
- **Primeiro login:** favoritos locais e da nuvem são unidos (sem duplicar e sem perder nenhum lado).
- **Sync:** alterações locais vão para a nuvem com atualização otimista; falha de rede não bloqueia o uso.
- **Sair:** volta a visitante mantendo os favoritos locais.
- **Excluir conta:** confirmação, chamada à Edge Function, limpeza do estado de sessão, volta a visitante.

### 10.4 Configuração do projeto
Região São Paulo, confirmação de e-mail ligada, senha mínima 8, provedores sociais desligados, allowlist de redirect só `curitibabusapp://**`, SMTP próprio antes do release. Projetos gratuitos pausam após ~7 dias sem uso: definir keep-alive ou plano pago antes do release.

## 9. Qualidade e entrega
- Typecheck (`yarn typecheck`), lint (`yarn lint`) e gitleaks no pre-commit (lefthook); CI no PR roda typecheck e lint (lint ainda não bloqueante).
- Branches `feat/`, `fix/`, `docs/`, commits em inglês, entrega por PR. Sem push direto na `main`.
- Build de release por EAS (iOS TestFlight, Android teste interno). Chaves via EAS secrets.
