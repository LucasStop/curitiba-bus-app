# SSD: especificação e design do sistema

Descreve como o app funciona hoje e como deve evoluir. Requisitos em [PRD.md](PRD.md); testes em [TDD.md](TDD.md). Tudo aqui foi conferido no código em 21/09/2026; o que ainda não existe está marcado como **Proposto**.

## 1. Visão geral
App Expo (SDK 57) / React Native 0.86 / React 19 / TypeScript estrito, sem backend próprio. Toda a lógica roda no aparelho. Hoje a única fonte de dados é um dataset local simulado.

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
| D1 | Sem backend próprio no MVP | Trabalho solo; dados abertos bastam. Reavaliar só se a URBS exigir proxy |
| D2 | react-native-maps (nativo) | Desempenho de mapa com muitos marcadores; `tracksViewChanges={false}` após montagem |
| D3 | zustand para estado de UI, react-query para dado remoto | Simplicidade; cada um no seu papel |
| D4 | Expo Router com rotas em `src/app/` | Padrão do SDK 57 |
| D5 | Docs em `docs/` do repo como fonte; ClickUp espelha | O repo é versionado e lido em toda sessão |

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

## 9. Qualidade e entrega
- Typecheck (`yarn typecheck`), lint (`yarn lint`) e gitleaks no pre-commit (lefthook); CI no PR roda typecheck e lint (lint ainda não bloqueante).
- Branches `feat/`, `fix/`, `docs/`, commits em inglês, entrega por PR. Sem push direto na `main`.
- Build de release por EAS (iOS TestFlight, Android teste interno). Chaves via EAS secrets.
