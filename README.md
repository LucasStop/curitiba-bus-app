# Curitiba Bus App

App mobile (Expo / React Native) para acompanhar o transporte coletivo de Curitiba (RIT/URBS): mapa com linhas, paradas e ônibus, previsão de chegada, planejador "Como Ir" e favoritos.

> Estado: protótipo com **dados simulados** (5 linhas, 17 paradas). A integração com os dados abertos da URBS ainda não foi feita. Veja o que falta em [docs/PRD.md](docs/PRD.md).

## Rodar
Requisitos: Node 20, Yarn 1.22 e o app Expo Go (iOS) ou um simulador.

```bash
yarn install
yarn start        # abre o Expo; pressione i (iOS), a (Android) ou w (web)
```

Sobre o mapa: no iOS o Expo Go usa Apple Maps. No Android o Google Maps exige chave e um development build (`eas build --profile development`); a chave fica em segredo do EAS, nunca no repositório.

## Verificar
```bash
npx tsc --noEmit  # typecheck
yarn lint
```

## Estrutura
```
src/app/(tabs)/   telas: Mapa, Linhas, Como Ir, Favoritos
src/components/   mapa, painel deslizante, badges
src/hooks/        useLiveVehicles, useUserLocation
src/stores/       zustand: seleção do mapa e favoritos (persistidos)
src/services/     transitProvider (posição e ETA), tripPlanner
src/data/         dataset simulado
src/utils/geo.ts  Haversine, bearing, interpolação
```

## Documentação
- [PRD](docs/PRD.md): o que o produto deve fazer e o que já faz.
- [SSD](docs/SSD.md): arquitetura, fluxos, integração URBS e limites conhecidos.
- [TDD](docs/TDD.md): estratégia de testes e casos propostos.
- [DESIGN.md](DESIGN.md): identidade visual e design system.
- [docs/CLICKUP_ROADMAP.md](docs/CLICKUP_ROADMAP.md): roadmap original (histórico).

## Contribuir
Branches `feat/…`, `fix/…`, `docs/…`; commits em inglês explicando o porquê; entrega por Pull Request (sem push direto na `main`). O pre-commit roda gitleaks e eslint (`lefthook install`).

## Fonte dos dados
[Transporte Coletivo de Curitiba, Dados Abertos](https://dadosabertos.curitiba.pr.gov.br/conjuntodado/detalhe?chave=ca40f13b-ef61-472b-810f-dd705f85fd2e) (URBS).
