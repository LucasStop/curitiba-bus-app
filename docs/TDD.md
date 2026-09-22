# TDD: estratégia de testes (test-first)

Regra do projeto: teste primeiro em regra de negócio, cálculo, dinheiro, auth e parsing. **Os casos são definidos pelo Lucas; a implementação é feita depois de aprovados.** CSS, layout e CRUD sem regra não levam teste. Requisitos: [PRD.md](PRD.md). Design: [SSD.md](SSD.md).

Estado: **não há nenhum teste hoje** e `jest` não está instalado. Tudo abaixo é PROPOSTO até aprovação. A coluna "Hoje" diz se o caso deve falhar (vermelho) contra o código atual, o que confirma o bug.

## 1. Camadas
| Camada | Ferramenta | Onde roda | Gate |
|---|---|---|---|
| A. Unitária | `jest-expo` (instalar com `npx expo install`) | local e CI | Sim, no CI |
| B. No app | `idb` + simulador iOS + Expo Go | local (macOS) | Não; roda antes de release e a cada mudança de tela |

## 2. Camada A: casos unitários propostos
Arquivos alvo: `src/utils/geo.ts`, `src/services/transitProvider.ts`, `src/services/tripPlanner.ts`, `src/stores/useFavoritesStore.ts` e, para contas (E9), `src/lib/supabase.ts`, `src/providers/AuthProvider.tsx` e a camada de sync de favoritos.

### A1. `utils/geo`
| # | Caso | Esperado | Hoje |
|---|---|---|---|
| G1 | `getDistanceInMeters` de um ponto a ele mesmo | 0 | verde |
| G2 | Simetria: `d(a,b) == d(b,a)` | igual | verde |
| G3 | Praça Rui Barbosa a Terminal Cabral (coordenadas do dataset) | valor de referência conferido em fonte externa, tolerância de 1% | a definir |
| G4 | `getBearing` para norte, leste, sul, oeste | 0, 90, 180, 270 | verde |
| G5 | `getBearing` sempre em [0, 360) | verdadeiro | verde |
| G6 | `interpolateLatLng` com t = 0, 0,5 e 1 | início, meio, fim | verde |
| G7 | `formatDistance(450)` e `formatDistance(1800)` | "450 m" e "1.8 km" | verde |
| G8 | `formatMinutes` de 0, 1, 2, 12 | "Chegando", "Chegando", "2 min", "12 min" | verde |

### A2. ETA (`getArrivalsForStop`)
| # | Caso | Esperado | Hoje |
|---|---|---|---|
| E1 | Ônibus a menos de 400 m, no sentido da parada | estado "Chegando" | **vermelho** (só existe `formatMinutes`) |
| E2 | Ônibus a 2 km, no sentido da parada | minutos = distância ÷ 22 km/h, arredondado | verde |
| E3 | Ônibus que já passou a parada (mesmo sentido) | não entra na lista | **vermelho** |
| E4 | Ônibus da mesma linha no sentido oposto | não entra na lista | **vermelho** |
| E5 | Parada inexistente | lista vazia | verde |
| E6 | Nenhum ônibus da linha ativo | lista vazia | verde |
| E7 | Vários ônibus | ordenados por minutos, do menor ao maior | verde |
| E8 | Ônibus além do raio máximo | não entra | verde (raio atual 8 km; confirmar se a regra fica) |

### A3. Planejador (`planTransitTrip`)
| # | Caso | Esperado | Hoje |
|---|---|---|---|
| P1 | Origem e destino junto a duas paradas com linha em comum | ao menos uma rota direta com essa linha | verde |
| P2 | Rota direta: tempo = caminhada (80 m/min) + ônibus + caminhada | soma correta, arredondamento definido | verde |
| P3 | Opções ordenadas por duração total | ordem crescente | verde |
| P4 | Sem linha em comum e sem terminal comum às duas linhas | resultado vazio, nunca uma rota inventada | **vermelho** (cria "via Terminal Cabral" com tempos fixos) |
| P5 | Baldeação só entre linhas que realmente se encontram no terminal | verificação por dado, não fixa | **vermelho** |
| P6 | Tarifa: uma tarifa única na baldeação dentro do terminal | tarifa = 6,00, sem cobrar duas vezes | verde (valor) / conferir regra oficial |
| P7 | Número de paradas da perna de ônibus | vem do trajeto, não fixo (4/5/3) | **vermelho** |
| P8 | Sentido: parada de embarque antes da de desembarque no trajeto da linha | rota só existe se a ordem for válida | **vermelho** |
| P9 | Origem = destino | sem rota, ou mensagem "você já está lá" (definir) | a definir |

### A4. Favoritos (`useFavoritesStore`)
| # | Caso | Esperado | Hoje |
|---|---|---|---|
| F1 | Estado inicial | listas vazias | **vermelho** (nasce com `['203','500']` e 2 paradas) |
| F2 | `toggleFavoriteLine` duas vezes | adiciona e remove | verde |
| F3 | `toggleFavoriteStop` duas vezes | adiciona e remove | verde |
| F4 | Reidratação a partir do AsyncStorage (mock) | recupera as listas salvas | a verificar |

### A5. Parsers da URBS (E3)
Casos definidos depois que o acesso à API for confirmado e houver respostas reais para usar como fixtures (sem chave nem dado pessoal nas fixtures, o repo é público). Mínimo: resposta vazia, campo ausente, categoria desconhecida, coordenada inválida.

### A6. Contas (E9), PROPOSTO
| # | Caso | Esperado | Hoje |
|---|---|---|---|
| C1 | Validação de e-mail: vazio, sem "@", com espaços, válido | só o válido passa | não existe |
| C2 | Validação de senha: menos de 8 caracteres, 8 exatos, com espaços | mínimo 8; mensagem em pt-BR | não existe |
| C3 | Mapeamento de erros do Supabase (credenciais inválidas, e-mail já cadastrado, rede, limite de tentativas) | mensagem pt-BR amigável, genérica em login/recuperação (não revela se o e-mail existe) | não existe |
| C4 | Merge de favoritos: local ∪ nuvem | união, sem duplicar, sem perder nenhum lado | não existe |
| C5 | `LargeSecureStore`: gravar e ler valor maior que 2048 bytes | valor idêntico; o texto no AsyncStorage não é o original; remover apaga valor e chave | não existe |
| C6 | Sair da conta | volta a visitante e mantém os favoritos locais | não existe |
| C7 | Nenhum log contém token, e-mail ou coordenadas | verdadeiro (busca em `console.*`) | a verificar |

### A7. RLS no banco (SQL com duas contas de teste), PROPOSTO
| # | Caso | Esperado |
|---|---|---|
| R1 | A lê `favorites` de B | 0 linhas |
| R2 | A insere linha com `user_id` de B | negado |
| R3 | A apaga linha de B | 0 linhas afetadas |
| R4 | Anônimo (sem login) seleciona, insere ou apaga | negado |
| R5 | Apagar o usuário A | favoritos de A somem (cascata), os de B ficam |
| R6 | Edge Function `delete-account` chamada com o token de A e um `user_id` de B no corpo | só A é apagado; B intacto |

## 3. Camada B: cenários no app com idb
Ambiente: simulador `iPhone 17` (`8574D031-AD26-4A58-B522-8FF4B736B24B`, iOS 26.5), `idb_companion` ativo, app aberto no Expo Go (`host.exp.Exponent`) via `yarn start`. Não tocar no app "O Parceiro", que também está instalado no simulador.

Ferramentas: `idb ui describe-all` (árvore de acessibilidade, para localizar elementos e ler texto), `idb ui tap X Y`, `idb ui swipe`, `idb ui text`, `idb screenshot <arquivo>`, `xcrun simctl location booted set <lat>,<lon>` (simula o GPS) e `xcrun simctl openurl booted exp://...` (abre o projeto). Sem cabo nem aparelho físico.

**Pré-requisito no código:** hoje não há `testID` nem `accessibilityLabel` em nenhum componente, então o `describe-all` não tem como identificar os controles. Adicionar rótulos estáveis nos elementos abaixo (também é requisito de acessibilidade, RNF-04).

| # | Cenário | Passos | Resultado esperado (observável) |
|---|---|---|---|
| S1 | Abertura | Definir GPS em Curitiba; abrir o projeto no Expo Go | Aba Mapa visível, mapa carregado, ônibus na tela |
| S2 | Abas | Tocar Mapa, Linhas, Como Ir, Favoritos, nessa ordem | Cada título aparece; sem erro nem tela em branco |
| S3 | Filtro por categoria | No Mapa, tocar um filtro de categoria | Só ônibus da categoria escolhida |
| S4 | Catálogo e "Ver no Mapa" | Em Linhas, buscar "203" e tocar "Ver no Mapa" | Volta ao Mapa com a linha 203 isolada e traçado colorido |
| S5 | Parada e chegadas | Tocar uma parada | Painel mostra nome e lista de chegadas ordenada |
| S6 | Ida/volta | Alternar o sentido | Traçado e ordem das paradas mudam |
| S7 | Planejador | Em Como Ir, escolher origem e destino; usar o swap | Opções ordenadas por tempo; swap recalcula |
| S8 | Favoritos persistem | Favoritar uma linha, fechar e reabrir o app | A linha continua favoritada |
| S9 | GPS negado | Negar a permissão de localização | App segue funcionando, mensagem clara, sem crash |
| S10 | Alertas | Abrir a aba de alertas dentro de Favoritos | Lista com badges das linhas afetadas |
| S11 | Cadastro | Em Favoritos, Conta, criar conta com e-mail de teste | Mensagem de confirmação enviada; sem sessão até confirmar |
| S12 | Senha errada | Entrar com senha incorreta | Mensagem genérica em pt-BR, sem revelar se o e-mail existe |
| S13 | Login e sync | Entrar; favoritar uma linha | Favorito aparece após reabrir e em outro aparelho/simulador |
| S14 | Sessão persiste | Logado, fechar o app e reabrir | Continua logado |
| S15 | Sair | Tocar em Sair | Volta a visitante; favoritos locais permanecem |
| S16 | Excluir conta | Excluir a conta e confirmar | Volta a visitante; entrar de novo com a conta falha |
| S17 | Sem rede | Abrir sem rede como visitante e como logado | App abre e mostra o cache local nos dois casos |

Evidência: um screenshot por cenário, guardado fora do repositório (ou sem dado pessoal). Cada falha vira bug no backlog com o screenshot.

Limites conhecidos: Expo Go no iOS usa Apple Maps; o Google Maps do Android exige development build. A camada B não roda no CI (depende de macOS e simulador).

## 4. Smoke inicial (antes de qualquer mudança de código)
Executar S1 e S2 com `idb`, salvar os screenshots e registrar o que falha hoje como linha de base. Só depois iniciar E8 (instalar `jest-expo` e escrever a camada A em vermelho, depois corrigir).

## 5. O que NÃO testar
Estilos, layout, cores, animações de UI, `StyleSheet`, componentes puramente visuais e as telas sem regra. Cobertura por número não é meta; cobertura das regras acima é.

## 6. Aprovação
Marque no PR quais casos valem, quais mudar e os valores de referência (G3, P6, P9, E8). Depois disso o Claude implementa.
