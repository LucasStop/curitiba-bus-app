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
| GTFS | — | ZIP em `http://files.urbs.curitiba.pr.gov.br/google/google_transit.zip` (**público, sem código**, ~9 MB) | horários e paradas em lote |

"Tabela" = sequência de horários de um veículo; cada tabela de uma linha é um ônibus diferente.

## `getVeiculos` na prática (amostra real de 25/09/2026, 17:38)

Verificado com uma chamada real; difere da documentação do portal:

- Resposta é um **objeto** indexado pelo prefixo do veículo (`{"JB612": {...}}`), não uma lista. 1.524 veículos, ~330 KB, ~170 ms.
- Campos: `COD`, `REFRESH` (`HH:MM:SS`), `LAT`, `LON` (string com ponto decimal), `CODIGOLINHA`, `ADAPT` (`"1"`/`"0"`), `TIPO_VEIC`, `TABELA`, `SITUACAO`, **`SITUACAO2`**, **`SENT`**, `TCOUNT` (número).
- **Não documentados e úteis:** `SENT` = `IDA` / `VOLTA` / `CIRCULAR` (o sentido real do ônibus) e `SITUACAO2` = `REALIZANDO ROTA` / `FORA DA ROTA` / `TIPO INCOMPATIVEL` / `INDETERMINADA` / `COM MENSAGEM NÃO LIDA`.
- O app **não usa** `SENT` para decidir ida/volta: o "IDA" da URBS não é o ida/volta do app (ida = sentido alfabeticamente primeiro no GeoCuritiba). O sentido do app vem do deslocamento do veículo ao longo do trajeto de ida (`vehicleMapping.ts`).
- `SITUACAO`: `NO HORÁRIO` (562), `ATRASADO` (407), `ADIANTADO` (139), `NÃO CONFORMIDADE` (19), **vazio (397)**.
- Os com `SITUACAO`/`SENT`/`REFRESH` vazios não estão operando uma viagem: descartados em `parse.ts` (Edge Function `urbs-vehicles`), junto com `CODIGOLINHA = "REC"`, coordenada fora da caixa de Curitiba e `REFRESH` com mais de 10 min de idade.
- `REFRESH` variou de 17:24 a 17:38 na mesma resposta: há posições com até ~15 min. Descartadas pelo mesmo filtro de 10 min acima.
- `CODIGOLINHA = "REC"` = recolhimento (ônibus indo para a garagem), não é linha de passageiro.

## `getLinhas` na prática

309 linhas, mesmos campos da documentação. Comparado com o dataset do GeoCuritiba (`src/data/geocuritiba.json`, 314 linhas): `X37` e `X43` existem na URBS e não no dataset; `202`, `370`, `527`, `539`, `811`, `X50`, `X51` estão no dataset e não na URBS (provavelmente desativadas). A resposta vem com `content-type: text/html; charset=ISO-8859-1`, mas o corpo decodifica corretamente como UTF-8. Ônibus das linhas ausentes do dataset (`X37`, `X43`) chegam em `bus_positions` normalmente, mas o app os ignora ao montar o mapa — não há `BusLine` correspondente.

## Operação

- **Pausar o cron:** `select cron.unschedule('urbs-vehicles-every-2-min');` no SQL editor do projeto. Reativar recriando o `cron.schedule` (ver migration `20260926120000_bus_positions.sql`).
- **Ver a saúde do feed:** `select * from public.bus_feed_status where id = 1;` (`fetched_at`, `last_attempt_at`, `last_error`, `vehicle_count`) ou os logs da Edge Function `urbs-vehicles` no painel do Supabase.
- **Falhas esperadas:** ~2,6% das rodadas por dia falham de forma esporádica — sobretudo `empty feed` de madrugada, quando a URBS devolve um retrato parado, e algum `fetch failed`. Inofensivo: a rodada seguinte (2 min depois) resolve na maioria dos casos, e as posições anteriores continuam valendo até lá (10 min de retenção).
- **Rotacionar o segredo do cron:** trocar o secret de função `URBS_CRON_SECRET` (Edge Function `urbs-vehicles`) e o secret `urbs_cron_secret` no Vault do projeto — os dois precisam mudar juntos, senão o cron passa a apanhar 401.
- Os valores de `URBS_CODE`, `URBS_CRON_SECRET`, `urbs_cron_secret` e `project_url` nunca aparecem em migration: o SQL só referencia o nome desses segredos, nunca o valor.
