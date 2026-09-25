# WebService da URBS

Acesso concedido via Lei de Acesso à Informação (protocolo 00-088136/2026, resposta de 24/09/2026). Portal: `https://transporteservico.urbs.curitiba.pr.gov.br/` (login pessoal do Lucas). O **código de acesso** vai na URL como `?c=<código>` e é segredo: fica só em `.env.local` (`CODE_URBS`) e, em produção, como secret de Edge Function do Supabase. Nunca no app, no repositório ou em log.

## Regras de uso (condições do ofício e do portal)

O acesso é cortado **sem aviso** se forem descumpridas:

- Dados estáticos (linhas, pontos, traçados, horários): **no máximo 1 vez por dia**.
- Posição dos veículos: os ônibus mandam posição **a cada 2 minutos**; não consultar mais rápido.
- **Excesso de requisições é tratado como ataque DoS.** A URBS monitora o acesso diariamente.
- O app informa que é desenvolvido sob responsabilidade do autor e que a URBS só fornece os dados (tela "Sobre").
- Manter os dados atualizados para os usuários; avisar a URBS se o app for descontinuado; arcar com eventuais custos (painel do portal mostra consumo e taxa por mês).

**Consequência para a arquitetura:** o app nunca chama a URBS. Um processo no servidor (Edge Function + cron) faz 1 chamada de `getVeiculos` a cada 2 minutos e grava no Supabase; o app lê do Supabase. A carga na URBS fica fixa (~720 chamadas/dia) independente do número de usuários.

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
- `SITUACAO`: `NO HORÁRIO` (562), `ATRASADO` (407), `ADIANTADO` (139), `NÃO CONFORMIDADE` (19), **vazio (397)**.
- Os 397 com `SITUACAO`/`SENT` vazios não estão operando uma viagem: filtrar do mapa.
- `REFRESH` variou de 17:24 a 17:38 na mesma resposta: há posições com até ~15 min. Descartar ou marcar posições velhas.
- `CODIGOLINHA = "REC"` = recolhimento (ônibus indo para a garagem), não é linha de passageiro.

## `getLinhas` na prática

309 linhas, mesmos campos da documentação. Comparado com o dataset do GeoCuritiba (`src/data/geocuritiba.json`, 314 linhas): `X37` e `X43` existem na URBS e não no dataset; `202`, `370`, `527`, `539`, `811`, `X50`, `X51` estão no dataset e não na URBS (provavelmente desativadas). A resposta vem com `content-type: text/html; charset=ISO-8859-1`, mas o corpo decodifica corretamente como UTF-8.
