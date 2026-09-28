# Curitiba Bus App

App mobile (Expo / React Native) para acompanhar o transporte coletivo de Curitiba (RIT/URBS): mapa com linhas, paradas e ônibus, previsão de chegada, planejador "Como Ir" e favoritos.

> Estado: rede estática **real** (314 linhas, ~7 mil paradas, traçados) importada do GeoCuritiba; posição de ônibus também **real** (WebService da URBS, gravado no Supabase a cada 2 min) e previsão de chegada calculada pela distância até essas posições. Horários ainda ausentes: importação do GTFS da URBS em andamento. Veja o que falta em [docs/PRD.md](docs/PRD.md).

## Rodar
Requisitos: Node 20, Yarn 1.22 e o app Expo Go (iOS) ou um simulador.

```bash
yarn install
yarn start        # abre o Expo; pressione i (iOS), a (Android) ou w (web)
```

Sobre o mapa: no iOS o Expo Go usa Apple Maps. No Android o Google Maps exige chave e um development build (`eas build --profile development`); a chave fica em segredo do EAS, nunca no repositório.

## Verificar
```bash
yarn typecheck
yarn lint
yarn test         # testes unitários (jest-expo); nenhum faz chamada de rede
```

Testes de backend (Supabase): `deno test` das Edge Functions (também roda no CI) e pgTAP via `supabase test db` (local, precisa de Docker) — ver [docs/TDD.md](docs/TDD.md).

Com `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em `.env.local` (ignorado pelo git; só a chave publishable, nunca a `service_role`) o app mostra os ônibus reais para todo mundo, visitante incluído, e habilita conta (login e sync de favoritos) como opcional. Sem essas variáveis o mapa usa uma simulação e não há login.

## Estrutura
```
src/app/(tabs)/   telas: Mapa, Linhas, Como Ir, Favoritos
src/components/   mapa, painel deslizante, badges
src/hooks/        useLiveVehicles, useUserLocation
src/lib/          validação, erros do Auth, merge de favoritos, cliente Supabase, LargeSecureStore (com testes)
src/providers/    AuthProvider e useAuth (sessão opcional)
src/stores/       zustand: seleção do mapa e favoritos (persistidos)
src/services/     transitProvider (contrato + simulação), realtime/ (SupabaseTransitProvider, vehicleMapping), arrivals, tripPlanner
src/data/         rede estática real do GeoCuritiba (geocuritiba.json); __fixtures__/ para os testes
src/utils/geo.ts  Haversine, bearing, interpolação
supabase/         functions/ (delete-account, urbs-vehicles), migrations/, tests/ (pgTAP)
```

## Documentação
- [PRD](docs/PRD.md): o que o produto deve fazer e o que já faz.
- [SSD](docs/SSD.md): arquitetura, fluxos, integração URBS e limites conhecidos.
- [TDD](docs/TDD.md): estratégia de testes e casos propostos.
- [DESIGN.md](DESIGN.md): identidade visual e design system.
- [SECURITY](docs/SECURITY.md): modelo de ameaças e controles.
- [PRIVACY](docs/PRIVACY.md): rascunho da política de privacidade (LGPD).
- [docs/CLICKUP_ROADMAP.md](docs/CLICKUP_ROADMAP.md): roadmap original (histórico).

## Contribuir
Branches `feat/…`, `fix/…`, `docs/…`; commits em inglês explicando o porquê; entrega por Pull Request (sem push direto na `main`). O pre-commit roda gitleaks e eslint (`lefthook install`).

## Fonte dos dados
- **Paradas, linhas e traçados:** GeoCuritiba, camada `URBS_Transporte_Publico` (IPPUC/URBS), pública. Gerados em `src/data/geocuritiba.json` por `yarn data:geocuritiba` (rodar de novo para atualizar e abrir PR).
- **Tempo real e horários:** WebService da URBS, acesso concedido via LAI em 24/09/2026. Posição dos ônibus integrada (PR #145): `pg_cron` a cada 2 min → Edge Function `urbs-vehicles` → `bus_positions` no Supabase; o app só lê do Supabase. Horários e alertas oficiais ainda não. Métodos, regras de uso e formato real das respostas em [docs/URBS-WEBSERVICE.md](docs/URBS-WEBSERVICE.md).
