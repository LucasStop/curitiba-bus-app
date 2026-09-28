# WebService da URBS

Acesso concedido via Lei de Acesso à Informação (protocolo 00-088136/2026, resposta de 24/09/2026). Portal: `https://transporteservico.urbs.curitiba.pr.gov.br/` (login pessoal do Lucas). O **código de acesso** vai na URL como `?c=<código>` e é segredo: em produção fica só como secret `URBS_CODE` da Edge Function `urbs-vehicles`; `CODE_URBS` em `.env.local` serve só para teste manual (chamada avulsa, fora do cron). Nunca no app, no repositório ou em log.

## Regras de uso (condições do ofício e do portal)

O acesso é cortado **sem aviso** se forem descumpridas:

- Dados estáticos (linhas, pontos, traçados, horários): **no máximo 1 vez por dia**.
- Posição dos veículos: os ônibus mandam posição **a cada 2 minutos**; não consultar mais rápido.
- **Excesso de requisições é tratado como ataque DoS.** A URBS monitora o acesso diariamente.
- O app informa que é desenvolvido sob responsabilidade do autor e que a URBS só fornece os dados (tela "Sobre").
- Manter os dados atualizados para os usuários; avisar a URBS se o app for descontinuado; arcar com eventuais custos (painel do portal mostra consumo e taxa por mês).

**Consequência para a arquitetura, implementada no PR #145:** o app nunca chama a URBS. O job `pg_cron` `urbs-vehicles-every-2-min` dispara a cada 2 min a Edge Function `urbs-vehicles` (autenticada pelo header `x-cron-secret`, comparado em tempo constante; sem JWT de usuário), que faz 1 chamada de `getVeiculos` (timeout de 10 s) e grava em `bus_positions` via RPC `security definer`. Um throttle de 90 s (`bus_feed_status.last_attempt_at`) evita rodada duplicada se o cron atrasar ou reentrar. Cada posição vale por 10 min a partir do próprio `REFRESH` do veículo; o app só lê do Supabase. A carga na URBS fica fixa (~720 chamadas/dia) independente do número de usuários.

## Métodos

Todos `GET` em `https://transporteservico.urbs.curitiba.pr.gov.br/<método>.php?c=<código>`, resposta JSON.

| Método | Parâmetros | Campos | Uso |
|---|---|---|---|
| `getVeiculos` | `linha` (opcional, 3 caracteres) | ver abaixo | posição em tempo real |
| `getLinhas` | — | `COD`, `NOME`, `SOMENTE_CARTAO` (S/N/F = fins de semana), `CATEGORIA_SERVICO`, `NOME_COR` | catálogo |
| `getPontosLinha` | `linha` | `NOME`, `NUM`, `LAT`, `LON`, `SEQ`, `GRUPO`, `TIPO`, `SENTIDO`, `ITINERARY_ID` | paradas por sentido |
| `getShapeLinha` | `linha` | `SHP`, `LAT`, `LON` | traçado; uma linha tem vários shapes (um por sentido/variação), ordenar por `SHP` |
| `getShapeName` | `shp` | texto com nome e sentido do shape | identificar ida/volta de cada shape |
| `getTrechosItinerarios` | `linha` | trechos A→B com extensão, empresa operadora, `STOP_CODE` | distância real entre pontos |
| `getTabelaLinha` | `linha` | `HORA`, `PONTO`, `DIA` (1 útil, 2 sábado, 3 domingo, 4 feriado), `NUM`, `TABELA` | horários nos pontos de regulagem |
| `getTabelaVeiculo` | `carro` (prefixo, 5 caracteres) | `COD_LINHA`, `VEICULO`, `HORARIO`, `TABELA`, `COD_PONTO` | horário programado de um ônibus |
| `getMensagemPainel` | — | `DESCRICAO`, `TIPOMENSAGEM`, `DATAINICIO`, `DATAFIM` | avisos gerais |
| `getMensagemPainelLinhas` | — | idem + `LINHACODIGO`, `LINHADESCRICAO` | avisos por linha (mural de alertas) |
| `getOcorrenciaCCOporLinha` | `cod` (opcional) | `ID`, `TIPO`, `LINHA`, `MENSAGEM` | ocorrências do centro de controle |
| `getValorTarifa` | `data` (opcional, `YYYYMMDD`) | `RIT`, `CONVENCIONAL`, `CIRCULAR_CENTRO`, `TURISMO`, decreto | tarifa real |
| `getPois` | — | `POI_NAME`, `POI_CATEGORY_NAME`, `LAT`, `LON`, `POI_DESC` | pontos de interesse |
| GTFS | — | ZIP em `http://files.urbs.curitiba.pr.gov.br/google/google_transit.zip` (**público, sem código**, ~9 MB) | horários e paradas em lote; usado pelo app (ver [GTFS](#gtfs)) |

"Tabela" = sequência de horários de um veículo; cada tabela de uma linha é um ônibus diferente.

## `getVeiculos` na prática (amostra real de 25/09/2026, 17:38)

Verificado com uma chamada real; difere da documentação do portal:

- Resposta é um **objeto** indexado pelo prefixo do veículo (`{"JB612": {...}}`), não uma lista. 1.524 veículos, ~330 KB, ~170 ms.
- Campos: `COD`, `REFRESH` (`HH:MM:SS`), `LAT`, `LON` (string com ponto decimal), `CODIGOLINHA`, `ADAPT` (`"1"`/`"0"`), `TIPO_VEIC`, `TABELA`, `SITUACAO`, **`SITUACAO2`**, **`SENT`**, `TCOUNT` (número).
- **Não documentados e úteis:** `SENT` = `IDA` / `VOLTA` / `CIRCULAR` (o sentido real do ônibus) e `SITUACAO2` = `REALIZANDO ROTA` / `FORA DA ROTA` / `TIPO INCOMPATIVEL` / `INDETERMINADA` / `COM MENSAGEM NÃO LIDA`.
- O app **não usa** `SENT` para decidir ida/volta: o "IDA" da URBS não é o ida/volta do app (ida = traçado com mais viagens no GTFS, ou o sentido alfabeticamente primeiro no GeoCuritiba nas linhas sem GTFS). O sentido do app vem do deslocamento do veículo ao longo dos traçados de ida e de volta (`vehicleMapping.ts`).
- `SITUACAO`: `NO HORÁRIO` (562), `ATRASADO` (407), `ADIANTADO` (139), `NÃO CONFORMIDADE` (19), **vazio (397)**.
- Os com `SITUACAO`/`SENT`/`REFRESH` vazios não estão operando uma viagem: descartados em `parse.ts` (Edge Function `urbs-vehicles`), junto com `CODIGOLINHA = "REC"`, coordenada fora da caixa de Curitiba e `REFRESH` com mais de 10 min de idade.
- `REFRESH` variou de 17:24 a 17:38 na mesma resposta: há posições com até ~15 min. Descartadas pelo mesmo filtro de 10 min acima.
- `CODIGOLINHA = "REC"` = recolhimento (ônibus indo para a garagem), não é linha de passageiro.

## `getLinhas` na prática

309 linhas, mesmos campos da documentação. Comparado com o dataset do GeoCuritiba (`src/data/geocuritiba.json`, 314 linhas): `X37` e `X43` existem na URBS e não no dataset; `202`, `370`, `527`, `539`, `811`, `X50`, `X51` estão no dataset e não na URBS (provavelmente desativadas). A resposta vem com `content-type: text/html; charset=ISO-8859-1`, mas o corpo decodifica corretamente como UTF-8. O `yarn data:gtfs` usa esta lista (a última amostra salva, sem chamada nova) para tirar as 7 linhas desativadas do app. `X37` e `X43` continuam fora: o GTFS tem a rota, mas sem nenhuma viagem, então não há traçado nem paradas. Ônibus dessas duas linhas chegam em `bus_positions` normalmente, mas o app os ignora ao montar o mapa, porque não há `BusLine` correspondente.

## GTFS

Arquivo público da URBS (CC BY 4.0, publicado no Portal de Dados Abertos de Curitiba), não é método do WebService e não usa o código de acesso. `yarn data:gtfs` (`scripts/import-gtfs.mjs`) baixa o zip no máximo 1 vez a cada 24 h (cache em `docs/urbs-lai/gtfs/`, fora do git), junta com `src/data/geocuritiba.json` e com o último `getLinhas` salvo, e grava `src/data/network.json` só se a validação passar (linhas e paradas obrigatórias, cobertura, mapeamento de paradas, tamanho até 3 MB). A lógica fica em `scripts/gtfs-transform.cjs`, com testes em `scripts/gtfs-transform.test.js`.

Particularidades do feed `20260818` (e por isso a lógica do importador):
- `direction_id` não separa ida e volta: a 203 tem os dois sentidos no `direction_id` 0, cada um com seu `shape_id`. O importador pega o traçado com mais viagens como ida e, como volta, o traçado que começa onde a ida termina e termina onde ela começa (até 800 m). Traçado fechado ou sem par = linha de um sentido só.
- `service_id` 1 = dia útil (mesmo código `DIA` do WebService); os dias do `calendar.txt` não refletem isso. Horário de funcionamento e frequência no pico (mediana dos intervalos entre 06:00 e 09:00) saem só das viagens de dia útil; a frequência usa só os traçados de ida e volta escolhidos, porque as variantes de linha circular saem do mesmo ponto e distorciam a conta.
- `stop_code` é o número da parada da URBS, o mesmo id do GeoCuritiba. Plataformas de terminal têm `parent_station` e viram o terminal do GeoCuritiba mais próximo (até 300 m).
- ~50 rotas não têm viagem nenhuma (entre elas `020`, `X37`, `X43`). Essas linhas ficam como estão no GeoCuritiba (volta = ida invertida, sem horário).
- 11 linhas abertas têm viagens de um sentido só no feed (a `184` tem 3 viagens, todas de ida; também `231`, `509`, `619`...). Como o GeoCuritiba tem os dois sentidos delas, a linha fica inteira no GeoCuritiba; o horário continua vindo do GTFS.

Resultado em 28/09/2026: 307 linhas, 198 com traçado e paradas do GTFS (186 com volta própria), 109 do GeoCuritiba; 6.856 paradas; 210 linhas com horário e 187 com frequência no pico (4 a 92 min). A tela Sobre do app traz a atribuição, o aviso de modificação e o texto de isenção exigidos pelas regras do Portal.

## Operação

- **Pausar o cron:** `select cron.unschedule('urbs-vehicles-every-2-min');` no SQL editor do projeto. Reativar recriando o `cron.schedule` (ver migration `20260926120000_bus_positions.sql`).
- **Ver a saúde do feed:** `select * from public.bus_feed_status where id = 1;` (`fetched_at`, `last_attempt_at`, `last_error`, `vehicle_count`) ou os logs da Edge Function `urbs-vehicles` no painel do Supabase.
- **Falhas esperadas:** ~2,6% das rodadas por dia falham de forma esporádica — sobretudo `empty feed` de madrugada, quando a URBS devolve um retrato parado, e algum `fetch failed`. Inofensivo: a rodada seguinte (2 min depois) resolve na maioria dos casos, e as posições anteriores continuam valendo até lá (10 min de retenção).
- **Rotacionar o segredo do cron:** trocar o secret de função `URBS_CRON_SECRET` (Edge Function `urbs-vehicles`) e o secret `urbs_cron_secret` no Vault do projeto — os dois precisam mudar juntos, senão o cron passa a apanhar 401.
- Os valores de `URBS_CODE`, `URBS_CRON_SECRET`, `urbs_cron_secret` e `project_url` nunca aparecem em migration: o SQL só referencia o nome desses segredos, nunca o valor.
