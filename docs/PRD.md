# PRD: Curitiba Bus App

Documento de requisitos do produto. Estado do código em 28/09/2026 (PR #145, posição real dos ônibus). Complementos: [SSD](SSD.md) (design do sistema), [TDD](TDD.md) (estratégia de testes), [SECURITY](SECURITY.md) (ameaças e controles), [PRIVACY](PRIVACY.md) (rascunho LGPD) e [DESIGN.md](../DESIGN.md) (identidade visual).

Convenção: `RF-xx` = requisito funcional, `RNF-xx` = não funcional. Cada um aponta para a task do backlog (códigos `1.1` a `4.4` vêm do roadmap original em [CLICKUP_ROADMAP.md](CLICKUP_ROADMAP.md); `E1` a `E8` são os épicos).

## 1. Problema
Quem usa o transporte coletivo de Curitiba (RIT/URBS) precisa saber, na hora, onde estão os ônibus, quando o próximo chega em uma parada e como ir de um ponto a outro, inclusive com baldeação em terminal integrado. As informações oficiais existem como GTFS público (dados abertos) e WebService da URBS (mediante credencial), mas não chegam ao passageiro de forma simples, no celular.

## 2. Objetivo
App mobile (iOS e Android, Expo/React Native) que mostra em mapa as linhas, paradas e ônibus da RIT, estima a chegada em cada parada e sugere rotas de A a B.

Sucesso do MVP: um passageiro abre o app, escolhe uma parada ou destino e sabe em menos de 3 toques qual ônibus pegar e em quantos minutos ele chega, com dados reais da URBS.

## 3. Público e personas
| Persona | Necessidade principal |
|---|---|
| Passageiro diário | Ver "quando chega o meu ônibus" na parada de sempre; favoritos |
| Passageiro ocasional / turista | Descobrir como ir de A a B, incluindo terminais e integração |
| Passageiro com deficiência (PCD) | Saber se o veículo é acessível; app usável com leitor de tela |

## 4. Escopo
### Dentro do MVP
- Mapa com ônibus, paradas (tubo, terminal, comum) e traçado da linha, ida e volta.
- Catálogo de linhas com busca e filtro por categoria RIT.
- Previsão de chegada por parada.
- Planejador "Como Ir" com linha direta e 1 baldeação em terminal.
- Favoritos persistentes (linhas e paradas).
- Alertas operacionais da URBS (somente se houver fonte real; ver RF-11).
- Dados reais no lugar do dataset simulado: rede estática (GeoCuritiba) e posição dos ônibus (URBS) já entregues; horários (GTFS) pendentes.
- Conta **opcional** (e-mail e senha) só para sincronizar favoritos entre aparelhos. O app inteiro funciona como visitante, sem cadastro (decisão de 21/09/2026, ver riscos).

### Fora do MVP
Login social (Google/Apple), 2FA, perfil com dados pessoais, login obrigatório, pagamento ou recarga de cartão, notificações push, planejamento com outros modos (bicicleta, carro), suporte a outras cidades, versão web como produto (a web serve só para desenvolvimento).

## 5. Requisitos funcionais
| ID | Requisito | Task / épico | Estado |
|---|---|---|---|
| RF-01 | Mapa centrado em Curitiba com gestos, estilo limpo e botão de GPS que centraliza no usuário; permissão negada tratada | 1.3 (E2) | Implementado com rede e ônibus reais; validação em aparelho físico pendente |
| RF-02 | Navegação por 4 abas: Mapa, Linhas, Como Ir, Favoritos | 1.2 (E2) | Implementado |
| RF-03 | Painel deslizante com 3 alturas (12%, 45%, 88%) sem bloquear os gestos do mapa | 1.4 (E2) | Implementado |
| RF-04 | Exibir ônibus no mapa com cor da categoria, código da linha e direção de deslocamento | 2.2 (E4) | Implementado com posição real; direção pelo deslocamento entre leituras (0° sem leitura anterior) |
| RF-05 | Posição dos ônibus atualizada em tempo real a partir da URBS, com movimento suave entre leituras, pausando em segundo plano | 2.3 (E4), E3 | Parcial: posição real a cada ~2 min, app faz polling a cada 30 s e pausa em segundo plano; sem movimento suave (marcador salta) |
| RF-06 | Catálogo de linhas com busca por nome/número, filtro por categoria e "Ver no Mapa" | 2.4 (E4) | Implementado (314 linhas reais); filtro de categoria do mapa cobre agora as 10 categorias da RIT |
| RF-07 | Marcadores distintos de tubo e terminal; tocar abre a previsão da parada | 3.1 (E5) | Implementado |
| RF-08 | Previsão de chegada por parada, considerando sentido e trajeto; "Chegando" abaixo de 400 m | 3.2 (E5) | Parcial: considera sentido inferido e parada ainda à frente no trajeto; ônibus com sentido desconhecido ficam de fora da previsão; distância em linha reta a 360 m/min; "Chegando" a partir de 1 min; mostra no horário/atrasado/adiantado |
| RF-09 | Card da parada com próximas chegadas, prefixo, selo PCD e favoritar | 3.3 (E5) | Implementado com dados reais (prefixo e selo PCD vêm da URBS; lotação não está na fonte) |
| RF-10 | Traçado da linha ativa e alternador ida/volta que redesenha rota e paradas | 3.4 (E5) | Implementado com traçados reais (volta = ida invertida até ter o GTFS) |
| RF-11 | Alertas operacionais da URBS/156 com as linhas afetadas | 4.4 (E7) | Fonte identificada (`getMensagemPainelLinhas`, `getOcorrenciaCCOporLinha`), não integrada; mural mostra estado vazio honesto |
| RF-12 | Planejador: origem e destino, troca de sentido (swap), rota direta ou com 1 baldeação em terminal integrado, ordenada por tempo, tarifa correta | 4.1, 4.2 (E6) | Parcial: baldeação real (terminal comum + sentido, ver `src/services/tripPlanner.ts`); tempos por distância, sem horários |
| RF-13 | Planejador aceita origem/destino por GPS e por busca de lugar, não só paradas conhecidas | 4.2 (E6) | Não implementado |
| RF-14 | Favoritos de linhas e paradas persistem após fechar o app; começam vazios | 4.3 (E7) | Implementado (nasce vazio) |
| RF-15 | Substituir o dataset simulado por dados reais (linhas, pontos, itinerários, GTFS) com cache offline | E3 | Parcial: rede estática real embarcada (offline); horários/GTFS em andamento |
| RF-16 | Visitante usa mapa, linhas, previsão, planejador e favoritos locais sem criar conta | E9 | Implementado; visitante lê as posições reais no Supabase sem login |
| RF-17 | Cadastro com e-mail e senha, com confirmação por e-mail | E9 | Implementado (S11 verde em 22/09, ver [TDD](TDD.md)) |
| RF-18 | Login e logout; a sessão persiste ao fechar e reabrir o app | E9 | Implementado (S12–S15 verdes em 22/09, ver [TDD](TDD.md)) |
| RF-19 | Recuperar senha por e-mail, com link que abre o app | E9 | Implementado: envio de e-mail e troca de senha testados (unidade, `AuthProvider.test.tsx`); a tela do link (`reset-password.tsx`) não tem cenário de QA manual nem teste automatizado próprio [CONFIRMAR] |
| RF-20 | Logado, os favoritos sincronizam entre aparelhos (união no primeiro login, sem perder os locais) | E9 | Implementado (S13 verde em 22/09, ver [TDD](TDD.md)) |
| RF-21 | Excluir a conta dentro do app, removendo e-mail e favoritos | E9 | Implementado (S16 verde em 22/09, ver [TDD](TDD.md)) |

## 6. Requisitos não funcionais
| ID | Requisito | Task / épico |
|---|---|---|
| RNF-01 | Mapa e painel a 60 fps, medido em aparelho real, com todas as linhas ativas | Validação de performance (E8) |
| RNF-02 | Funciona sem rede após a primeira carga (linhas e paradas); indica dado desatualizado | Resiliência (E3) |
| RNF-03 | Modo claro e escuro em todas as telas (hoje as telas novas são só claras) | Dark mode (E8) |
| RNF-04 | Acessibilidade: `accessibilityLabel` nos controles, contraste AA, leitor de tela; hoje não há nenhum rótulo no app | Design system / a11y (E8) |
| RNF-05 | Privacidade: localização usada só no aparelho, sem envio nem log; política de privacidade publicada para as lojas (rascunho em [PRIVACY.md](PRIVACY.md), precisa revisão jurídica) | Build de release (E8), E9 |
| RNF-06 | Segredos (chave da URBS, chave do Google Maps) nunca no repositório nem no bundle. **Atendido** para a URBS: chave só como secret `URBS_CODE` da Edge Function, nunca no app | E1, E3 |
| RNF-07 | Regras de negócio e cálculos cobertos por testes automatizados antes de mudar o comportamento | Testes unitários (E8), [TDD](TDD.md) |
| RNF-08 | Interface e mensagens em pt-BR | (transversal) |
| RNF-09 | Sessão guardada cifrada (chave no Keychain/Keystore); nenhuma `service_role` no app | E9 |
| RNF-10 | Toda tabela com RLS e testes de isolamento entre usuários, incluindo `bus_positions`/`bus_feed_status`; pgTAP rodou verde em 28/09/2026 (29 assertions) | E9 |
| RNF-11 | Dependências sem vulnerabilidade alta; Dependabot ativo; `main` protegida | E9 |
| RNF-12 | Conformidade LGPD: dados mínimos, exclusão dentro do app, base legal e retenção documentadas | E9 |

## 7. Métricas
- Tempo até a primeira previsão de chegada (parada favorita): menor que 3 s com rede.
- Erro médio entre ETA exibido e chegada real: agora mensurável com posições reais (PR #145); meta a definir após a primeira medição.
- Crash-free sessions no TestFlight/Play interno: 99% ou mais.

## 8. Riscos e dependências abertas
| Risco | Impacto | Ação |
|---|---|---|
| Acesso à API da URBS não confirmado (endpoint de teste devolveu resposta vazia; provável exigência de chave); o conjunto de dados não tem dicionário | Bloqueava RF-05, RF-15 | **Resolvido em 25/09/2026** (ver §8.2): credencial liberada via LAI; posição real integrada no PR #145 (ver §8.4) |
| Chave da API não pode ir no bundle do app | Segurança | **Resolvido**: ingestão só no servidor (pg_cron + Edge Function `urbs-vehicles`); a chave existe apenas como secret `URBS_CODE`, nunca no app (ver §8.4) |
| Google Maps no Android exige chave e development build (não roda no Expo Go) | Bloqueia validação Android | Task "Chave Google Maps + development build EAS" (E1) |
| Baldeação simulada no planner mostra rota inexistente | Perda de confiança do usuário | Bug de prioridade alta (E6); substituir por algoritmo sobre dados reais |
| Alertas sem fonte real | RF-11 não entregável | Fonte identificada (`getMensagemPainelLinhas`, `getOcorrenciaCCOporLinha`), ainda não integrada; o mural agora mostra um estado vazio honesto no lugar dos 3 avisos fictícios que existiam antes desta branch |
| Diretriz 5.1.1(v) da App Store: app sem função realmente dependente de conta não pode exigir login | Reprovação na App Store | Login **opcional**; visitante usa tudo (RF-16) |
| Projeto gratuito do Supabase pausa após ~7 dias sem uso | Se pausar, **todo mundo** perde os ônibus no mapa (sem veículos + aviso de dado desatualizado); a rede estática continua funcionando; sincronização, login e favoritos na nuvem também ficam indisponíveis | O cron de ingestão a cada 2 min provavelmente conta como atividade e evita a pausa [CONFIRMAR]; sem plano pago. Reavaliar se/quando publicar nas lojas de verdade. |
| Entrega de e-mail de confirmação e recuperação (limite do SMTP padrão do Supabase) | Cadastro travado | Mesma decisão acima: aceito por ora, sem SMTP próprio configurado. |
| URBS corta o acesso se as regras de uso forem quebradas | Perda de RF-04/RF-05 (posição real) | Mitigado: um único chamador (Edge Function via pg_cron), throttle de 90 s entre tentativas, timeout de 10 s por chamada |
| Cada cliente baixa ~1.100 linhas (~300 KB, 2 páginas) por rodada nova (a cada ~2 min) enquanto o mapa está aberto; a tabela é legível por qualquer um com a chave publicável | Pode estourar a cota do plano Free (egress) | Medir egress no painel Supabase; nenhuma ação tomada ainda |
| Linhas fora do dataset GeoCuritiba (X37, X43) são descartadas na ingestão | Ônibus dessas linhas não aparecem no mapa | Aceito até a importação do GTFS público (Fase 3, em andamento) |
| Ônibus sem sentido conhecido (sem posição anterior ou deslocamento abaixo de 30 m) ficam fora das previsões de chegada | Chegadas subestimadas, sobretudo logo após cada rodada de ingestão | Aceito: melhor não prever do que prever errado |
| Posições ficam até 10 min desatualizadas (retenção por veículo, migração `20260926122000`) | ETA pode se basear em leitura antiga | Aceito; a UI marca estado de erro se o feed inteiro passar de 6 min sem atualizar |

## 8.1 Investigação E3: acesso a dados reais da URBS (22/09/2026) (superado: o app nunca chama a URBS diretamente; ver §8.4)

Investigação com testes reais de rede (`curl`), não só leitura de documentação. Resultado: **E3 continua bloqueado**, agora por motivo confirmado (credencial administrativa), não por endpoint desconhecido.

**Testado:**
- `GET https://transporteservico.urbs.curitiba.pr.gov.br/getLinhas.php` (e variações `getVeiculos.php`, com/sem parâmetro `linha`) → HTTP 200, corpo vazio. Reproduz exatamente o sintoma já registrado no risco acima.
- Documentação oficial do WebService (PDF em `dadosabertos.c3sl.ufpr.br/curitiba/TransporteColetivo/Documentação_WEB-SERVICE...`, baixado e lido nesta investigação) confirma a causa: **acesso só é liberado mediante login e senha entregues pela URBS S/A**, por dois caminhos — Lei de Acesso à Informação (formulário em urbs.curitiba.pr.gov.br/fale-conosco) ou protocolo presencial na Av. Pres. Affonso Camargo, 330, Jardim Botânico. Não existe chave de API self-service. As funções documentadas (`getLinhas`, `getPontosLinha`, `getShapeLinha`, `getVeiculosLinha`, `getTabelaLinha`, `getTrechosItinerarios`, `getTabelaVeiculo`, `getPois`) todas GET, todas retornam JSON, e o próprio documento avisa: "o excesso de requisições será tratado como ataque DoS" — descarta qualquer tentativa de força bruta ou polling agressivo.
- **Achado novo** (não estava documentado antes): existe um espelho não oficial, `http://dadosabertos.c3sl.ufpr.br/curitibaurbs/` (C3SL/UFPR), citado como "Base de Dados" no próprio [Portal de Dados Abertos de Curitiba](https://dadosabertos.curitiba.pr.gov.br/conjuntodado/detalhe?chave=ca40f13b-ef61-472b-810f-dd705f85fd2e) (CC BY 4.0). Publica arquivos diários `AAAA_MM_DD_{linhas,pontosLinha,shapeLinha,tabelaLinha,tabelaVeiculo,trechosItinerarios,veiculos,pois}.json.xz`, HTTPS, sem autenticação. Confirmado ao vivo: arquivo de 21/09/2026 (véspera) presente e com exatamente os campos do PDF oficial (`COD`/`NOME`/`CATEGORIA_SERVICO` em linhas; `LAT`/`LON` com vírgula decimal em pontos e shapes).

**Por que esse achado não virou integração agora, mesmo sendo dado real:**
1. Só existe em `.xz` (LZMA) — sem variante `.json`/`.gz` no diretório (testado, 404). RN/Expo não tem decoder nativo; adicionar lib wasm/lzma só pra isso é dependência desproporcional (contraria a checagem de skills/dependências do `AGENTS.md`).
2. `veiculos.json.xz` é o log acumulado do dia inteiro (uma posição a cada poucos segundos por veículo), publicado só depois do dia fechar — não é posição em tempo real, não atende RF-05.
3. Não é canal oficial da URBS nem tem termo de uso/retenção próprio; não é base confiável para depender em produção. (Correção: diferente do que esta seção registrou originalmente, o GTFS citado no PDF **não** exige a mesma credencial — é dado público, CC BY 4.0; ver §8.4.)
4. Preencher os tipos ricos do app (`BusLine.tarifa`, `frequenciaPico`, `horarioFuncionamento`, `paradasIda`/`paradasVolta` ordenadas por sentido) com esses campos exigiria inventar o que a fonte não tem — seria fabricar dado, o que esta investigação foi instruída a não fazer.

**Status do pedido de acesso:** pedido de LAI protocolado em 22/09/2026 via sistema e-SIC da Prefeitura de Curitiba (`servicodigital.curitiba.pr.gov.br`), órgão destinatário Urbanização de Curitiba S.A., protocolo **00-088136/2026**. Aguardando resposta (prazo legal: até 20 dias corridos, prorrogável por mais 10). Consultar em `curitiba.pr.gov.br/leiacessoinformacao` → Consultar Protocolo.

**O que desbloqueia:**
- Pedir login/senha da URBS (processo administrativo, LAI ou protocolo presencial — não é tarefa de código).
- Com credencial: script de pré-processamento fora do app (Node) chamando `getLinhas`/`getPontosLinha`/`getShapeLinha`/`getTrechosItinerarios` no máximo ~1x/dia, gerando o JSON estático que substitui `curitibaDataset.ts` (plano já descrito em [SSD.md](SSD.md) §6); posição de veículo via `getVeiculosLinha` (sem parâmetro `linha`, que já retorna todos) com polling comedido no app.

## 8.2 Acesso ao WebService liberado (25/09/2026)

O pedido LAI 00-088136/2026 foi atendido: a URBS criou credenciais de acesso ao WebService, com condições de uso (limite de frequência, aviso de responsabilidade no app, aviso de descontinuidade). Detalhes técnicos e regras em [URBS-WEBSERVICE.md](URBS-WEBSERVICE.md). **E3 deixa de estar bloqueado.**

## 8.3 Dados estáticos reais via GeoCuritiba (25/09/2026)

A parte estática do E3 foi destravada sem esperar a URBS: o GeoCuritiba (IPPUC) publica, sem login, a camada `URBS_Transporte_Publico` (ArcGIS REST) com paradas (7.254), traçados (667, 314 linhas) e a tabela parada↔linha com sentido e sequência (`pontos_linha`, o número da parada sai pela relação `queryRelatedRecords`).

- `scripts/import-geocuritiba.mjs` baixa tudo, e `scripts/geocuritiba-transform.cjs` (com teste) limpa nomes, extrai bairro do endereço, une plataformas de terminal num nó só, ordena paradas por sentido, orienta e simplifica os traçados (Douglas-Peucker 8 m). Saída: `src/data/geocuritiba.json` (~1,6 MB), 314 linhas, 6.955 paradas.
- Campos sem fonte pública ficam **ausentes**, não inventados: frequência no pico e horário de funcionamento. Tarifa = tarifa padrão.
- Posição real de veículo: entregue no PR #145 (ver §8.4). ETA: estimado por distância a partir das posições reais (§8.4), não é mais simulado. Horários/GTFS: pendente — o GTFS é público (CC BY 4.0, sem credencial), importação em andamento (Fase 3, não mergeada).

## 8.4 Posição real dos ônibus (25–28/09/2026, PR #145)

E3 foi concluído para veículos: o app mostra posição real da URBS, sem chamar a URBS diretamente.

- **Pipeline**: um job `pg_cron` (`urbs-vehicles-every-2-min`) chama a cada 2 min a Edge Function `supabase/functions/urbs-vehicles` (`verify_jwt=false`, só POST, autenticada por header `x-cron-secret` comparado em tempo constante). A função faz **uma** chamada a `getVeiculos`, com timeout de 10 s e throttle de 90 s controlado por `bus_feed_status.last_attempt_at`. `parse.ts` descarta veículo sem `SITUACAO`/`SENT`, com `CODIGOLINHA` de linha recolhida, fora da caixa de Curitiba, ou com `REFRESH` de mais de 10 min. A ingestão usa as RPCs `ingest_bus_positions`/`mark_bus_feed_attempt` (security definer, `search_path=''`, só `service_role` executa). Erros são logados só por categoria, nunca URL/código de acesso.
- **Tabelas**: `public.bus_positions` e `public.bus_feed_status`, RLS habilitado e forçado, `anon`/`authenticated` só com `SELECT`. Retenção: cada veículo mantém sua última posição por 10 min a partir do próprio `REFRESH`; leitura mais antiga nunca sobrescreve uma mais nova (migração `20260926122000`).
- **App**: `SupabaseTransitProvider` (`src/services/realtime/supabaseTransitProvider.ts`) faz polling de `bus_feed_status.fetched_at` a cada 30 s, só com o mapa inscrito e o app em primeiro plano, usando a chave publicável/anon; baixa `bus_positions` paginado (1000) quando `fetched_at` muda; backoff até 120 s em erro; marca estado de erro se o feed passar de 6 min sem atualizar, mantendo os últimos ônibus na tela. Isso vale para todo mundo, incluindo visitante sem login. Cai para o `MockTransitProvider` (simulação) só quando faltam `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Jest, dev sem `.env.local`). Nenhuma requisição carrega a localização do usuário.
- **Sentido**: inferido pelo deslocamento ao longo do trajeto de ida (`src/services/realtime/vehicleMapping.ts`); o `SENT` da URBS não é usado, porque o "IDA" da URBS não é o mesmo "ida" do app (primeiro sentido em ordem alfabética no GeoCuritiba). Ônibus sem posição anterior ou que se moveram menos de 30 m ficam com sentido desconhecido e saem das previsões de chegada. Linhas fora do dataset (X37, X43) são ignoradas.
- **Operação (25–28/09/2026)**: 1.803 execuções do cron, ~1.100 veículos em horário de pico, ~2,6% de falhas esporádicas por dia (`empty feed` de madrugada, quando a URBS devolve um snapshot velho; alguns `fetch failed`); a posição anterior permanece até a próxima rodada boa.
- **Testes**: testes Deno das duas Edge Functions (`delete-account`, `urbs-vehicles`) rodam no CI a cada PR; Jest cobre `supabaseTransitProvider.test.ts` e `vehicleMapping.test.ts`.

## 9. Fora deste documento
Identidade visual e tokens: [DESIGN.md](../DESIGN.md). Arquitetura, modelo de dados e fluxos: [SSD.md](SSD.md). Testes: [TDD.md](TDD.md). Segurança: [SECURITY.md](SECURITY.md). Privacidade: [PRIVACY.md](PRIVACY.md).
