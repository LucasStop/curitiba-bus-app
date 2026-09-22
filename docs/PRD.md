# PRD: Curitiba Bus App

Documento de requisitos do produto. Estado do código em 21/09/2026 (commit `2da02cf` da branch de tooling sobre `a9ef1f2`). Complementos: [SSD](SSD.md) (design do sistema), [TDD](TDD.md) (estratégia de testes), [SECURITY](SECURITY.md) (ameaças e controles), [PRIVACY](PRIVACY.md) (rascunho LGPD) e [DESIGN.md](../DESIGN.md) (identidade visual).

Convenção: `RF-xx` = requisito funcional, `RNF-xx` = não funcional. Cada um aponta para a task do backlog (códigos `1.1` a `4.4` vêm do roadmap original em [CLICKUP_ROADMAP.md](CLICKUP_ROADMAP.md); `E1` a `E8` são os épicos).

## 1. Problema
Quem usa o transporte coletivo de Curitiba (RIT/URBS) precisa saber, na hora, onde estão os ônibus, quando o próximo chega em uma parada e como ir de um ponto a outro, inclusive com baldeação em terminal integrado. As informações oficiais existem como dados abertos (GTFS e WebService da URBS), mas não chegam ao passageiro de forma simples, no celular.

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
- Dados reais da URBS no lugar do dataset simulado.
- Conta **opcional** (e-mail e senha) só para sincronizar favoritos entre aparelhos. O app inteiro funciona como visitante, sem cadastro (decisão de 21/09/2026, ver riscos).

### Fora do MVP
Login social (Google/Apple), 2FA, perfil com dados pessoais, login obrigatório, pagamento ou recarga de cartão, notificações push, planejamento com outros modos (bicicleta, carro), suporte a outras cidades, versão web como produto (a web serve só para desenvolvimento).

## 5. Requisitos funcionais
| ID | Requisito | Task / épico | Estado |
|---|---|---|---|
| RF-01 | Mapa centrado em Curitiba com gestos, estilo limpo e botão de GPS que centraliza no usuário; permissão negada tratada | 1.3 (E2) | Implementado com mock, sem validação em device |
| RF-02 | Navegação por 4 abas: Mapa, Linhas, Como Ir, Favoritos | 1.2 (E2) | Implementado |
| RF-03 | Painel deslizante com 3 alturas (12%, 45%, 88%) sem bloquear os gestos do mapa | 1.4 (E2) | Implementado |
| RF-04 | Exibir ônibus no mapa com cor da categoria, código da linha e direção de deslocamento | 2.2 (E4) | Implementado com mock |
| RF-05 | Posição dos ônibus atualizada em tempo real a partir da URBS, com movimento suave entre leituras, pausando em segundo plano | 2.3 (E4), E3 | Só simulação; sem pausa em background |
| RF-06 | Catálogo de linhas com busca por nome/número, filtro por categoria e "Ver no Mapa" | 2.4 (E4) | Implementado com mock |
| RF-07 | Marcadores distintos de tubo e terminal; tocar abre a previsão da parada | 3.1 (E5) | Implementado |
| RF-08 | Previsão de chegada por parada, considerando sentido e trajeto; "Chegando" abaixo de 400 m | 3.2 (E5) | Parcial: linha reta, sem sentido, sem limiar de 400 m |
| RF-09 | Card da parada com próximas chegadas, prefixo, selo PCD e favoritar | 3.3 (E5) | Implementado com mock |
| RF-10 | Traçado da linha ativa e alternador ida/volta que redesenha rota e paradas | 3.4 (E5) | Implementado com mock |
| RF-11 | Alertas operacionais da URBS/156 com as linhas afetadas | 4.4 (E7) | Dados fixos; fonte real não identificada |
| RF-12 | Planejador: origem e destino, troca de sentido (swap), rota direta ou com 1 baldeação em terminal integrado, ordenada por tempo, tarifa correta | 4.1, 4.2 (E6) | Parcial: baldeação é simulada (ver SSD, seção Limites) |
| RF-13 | Planejador aceita origem/destino por GPS e por busca de lugar, não só paradas conhecidas | 4.2 (E6) | Não implementado |
| RF-14 | Favoritos de linhas e paradas persistem após fechar o app; começam vazios | 4.3 (E7) | Persiste, mas nasce pré-preenchido com valores falsos |
| RF-15 | Substituir o dataset simulado por dados reais (linhas, pontos, itinerários, GTFS) com cache offline | E3 | Não iniciado |
| RF-16 | Visitante usa mapa, linhas, previsão, planejador e favoritos locais sem criar conta | E9 | Já é assim hoje (sem contas) |
| RF-17 | Cadastro com e-mail e senha, com confirmação por e-mail | E9 | Não iniciado |
| RF-18 | Login e logout; a sessão persiste ao fechar e reabrir o app | E9 | Não iniciado |
| RF-19 | Recuperar senha por e-mail, com link que abre o app | E9 | Não iniciado |
| RF-20 | Logado, os favoritos sincronizam entre aparelhos (união no primeiro login, sem perder os locais) | E9 | Não iniciado |
| RF-21 | Excluir a conta dentro do app, removendo e-mail e favoritos | E9 | Não iniciado |

## 6. Requisitos não funcionais
| ID | Requisito | Task / épico |
|---|---|---|
| RNF-01 | Mapa e painel a 60 fps, medido em aparelho real, com todas as linhas ativas | Validação de performance (E8) |
| RNF-02 | Funciona sem rede após a primeira carga (linhas e paradas); indica dado desatualizado | Resiliência (E3) |
| RNF-03 | Modo claro e escuro em todas as telas (hoje as telas novas são só claras) | Dark mode (E8) |
| RNF-04 | Acessibilidade: `accessibilityLabel` nos controles, contraste AA, leitor de tela; hoje não há nenhum rótulo no app | Design system / a11y (E8) |
| RNF-05 | Privacidade: localização usada só no aparelho, sem envio nem log; política de privacidade publicada para as lojas (rascunho em [PRIVACY.md](PRIVACY.md), precisa revisão jurídica) | Build de release (E8), E9 |
| RNF-06 | Segredos (chave da URBS, chave do Google Maps) nunca no repositório nem no bundle | E1, E3 |
| RNF-07 | Regras de negócio e cálculos cobertos por testes automatizados antes de mudar o comportamento | Testes unitários (E8), [TDD](TDD.md) |
| RNF-08 | Interface e mensagens em pt-BR | (transversal) |
| RNF-09 | Sessão guardada cifrada (chave no Keychain/Keystore); nenhuma `service_role` no app | E9 |
| RNF-10 | Toda tabela com RLS e testes de isolamento entre usuários | E9 |
| RNF-11 | Dependências sem vulnerabilidade alta; Dependabot ativo; `main` protegida | E9 |
| RNF-12 | Conformidade LGPD: dados mínimos, exclusão dentro do app, base legal e retenção documentadas | E9 |

## 7. Métricas
- Tempo até a primeira previsão de chegada (parada favorita): menor que 3 s com rede.
- Erro médio entre ETA exibido e chegada real (medido com dados reais): meta a definir após a integração da URBS.
- Crash-free sessions no TestFlight/Play interno: 99% ou mais.

## 8. Riscos e dependências abertas
| Risco | Impacto | Ação |
|---|---|---|
| Acesso à API da URBS não confirmado (endpoint de teste devolveu resposta vazia; provável exigência de chave); o conjunto de dados não tem dicionário | Bloqueia RF-05, RF-15 | Task "Obter acesso ao WebService URBS e mapear endpoints" (E3) — investigado em 22/09/2026, achados em §8.1; segue bloqueado |
| Chave da API não pode ir no bundle do app | Segurança | Avaliar proxy ou pré-processamento do GTFS |
| Google Maps no Android exige chave e development build (não roda no Expo Go) | Bloqueia validação Android | Task "Chave Google Maps + development build EAS" (E1) |
| Baldeação simulada no planner mostra rota inexistente | Perda de confiança do usuário | Bug de prioridade alta (E6); substituir por algoritmo sobre dados reais |
| Alertas sem fonte real | RF-11 não entregável | Definir fonte ou cortar do MVP |
| Diretriz 5.1.1(v) da App Store: app sem função realmente dependente de conta não pode exigir login | Reprovação na App Store | Login **opcional**; visitante usa tudo (RF-16) |
| Projeto gratuito do Supabase pausa após ~7 dias sem uso | Sincronização para; login e favoritos na nuvem indisponíveis | Visitante segue funcionando; definir keep-alive ou plano pago antes do release |
| Entrega de e-mail de confirmação e recuperação (limite do SMTP padrão do Supabase) | Cadastro travado | Configurar SMTP próprio antes do release |

## 8.1 Investigação E3: acesso a dados reais da URBS (22/09/2026)

Investigação com testes reais de rede (`curl`), não só leitura de documentação. Resultado: **E3 continua bloqueado**, agora por motivo confirmado (credencial administrativa), não por endpoint desconhecido.

**Testado:**
- `GET https://transporteservico.urbs.curitiba.pr.gov.br/getLinhas.php` (e variações `getVeiculos.php`, com/sem parâmetro `linha`) → HTTP 200, corpo vazio. Reproduz exatamente o sintoma já registrado no risco acima.
- Documentação oficial do WebService (PDF em `dadosabertos.c3sl.ufpr.br/curitiba/TransporteColetivo/Documentação_WEB-SERVICE...`, baixado e lido nesta investigação) confirma a causa: **acesso só é liberado mediante login e senha entregues pela URBS S/A**, por dois caminhos — Lei de Acesso à Informação (formulário em urbs.curitiba.pr.gov.br/fale-conosco) ou protocolo presencial na Av. Pres. Affonso Camargo, 330, Jardim Botânico. Não existe chave de API self-service. As funções documentadas (`getLinhas`, `getPontosLinha`, `getShapeLinha`, `getVeiculosLinha`, `getTabelaLinha`, `getTrechosItinerarios`, `getTabelaVeiculo`, `getPois`) todas GET, todas retornam JSON, e o próprio documento avisa: "o excesso de requisições será tratado como ataque DoS" — descarta qualquer tentativa de força bruta ou polling agressivo.
- **Achado novo** (não estava documentado antes): existe um espelho não oficial, `http://dadosabertos.c3sl.ufpr.br/curitibaurbs/` (C3SL/UFPR), citado como "Base de Dados" no próprio [Portal de Dados Abertos de Curitiba](https://dadosabertos.curitiba.pr.gov.br/conjuntodado/detalhe?chave=ca40f13b-ef61-472b-810f-dd705f85fd2e) (CC BY 4.0). Publica arquivos diários `AAAA_MM_DD_{linhas,pontosLinha,shapeLinha,tabelaLinha,tabelaVeiculo,trechosItinerarios,veiculos,pois}.json.xz`, HTTPS, sem autenticação. Confirmado ao vivo: arquivo de 21/09/2026 (véspera) presente e com exatamente os campos do PDF oficial (`COD`/`NOME`/`CATEGORIA_SERVICO` em linhas; `LAT`/`LON` com vírgula decimal em pontos e shapes).

**Por que esse achado não virou integração agora, mesmo sendo dado real:**
1. Só existe em `.xz` (LZMA) — sem variante `.json`/`.gz` no diretório (testado, 404). RN/Expo não tem decoder nativo; adicionar lib wasm/lzma só pra isso é dependência desproporcional (contraria a checagem de skills/dependências do `AGENTS.md`).
2. `veiculos.json.xz` é o log acumulado do dia inteiro (uma posição a cada poucos segundos por veículo), publicado só depois do dia fechar — não é posição em tempo real, não atende RF-05.
3. Não é canal oficial da URBS nem tem termo de uso/retenção próprio (diferente do GTFS citado no PDF, que exige a mesma credencial); não é base confiável para depender em produção.
4. Preencher os tipos ricos do app (`BusLine.tarifa`, `frequenciaPico`, `horarioFuncionamento`, `paradasIda`/`paradasVolta` ordenadas por sentido) com esses campos exigiria inventar o que a fonte não tem — seria fabricar dado, o que esta investigação foi instruída a não fazer.

**O que desbloqueia:**
- Pedir login/senha da URBS (processo administrativo, LAI ou protocolo presencial — não é tarefa de código).
- Com credencial: script de pré-processamento fora do app (Node) chamando `getLinhas`/`getPontosLinha`/`getShapeLinha`/`getTrechosItinerarios` no máximo ~1x/dia, gerando o JSON estático que substitui `curitibaDataset.ts` (plano já descrito em [SSD.md](SSD.md) §6); posição de veículo via `getVeiculosLinha` (sem parâmetro `linha`, que já retorna todos) com polling comedido no app.

## 9. Fora deste documento
Identidade visual e tokens: [DESIGN.md](../DESIGN.md). Arquitetura, modelo de dados e fluxos: [SSD.md](SSD.md). Testes: [TDD.md](TDD.md). Segurança: [SECURITY.md](SECURITY.md). Privacidade: [PRIVACY.md](PRIVACY.md).
