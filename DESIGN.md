# Curitiba Bus App: DESIGN.md (identidade visual e design system)

Memória de design do projeto. O `/frontend-design` e o `impeccable` leem este arquivo antes de gerar UI. Regras globais do `~/.claude/CLAUDE.md` valem; aqui só a identidade do repo.

Cada seção tem **Hoje** (auditado no código em 21/09/2026) e **Proposta** (para o Lucas aprovar). Nada da proposta foi aplicado ao código.

## Brand
- Produto: app de transporte coletivo de Curitiba (RIT/URBS) com mapa ao vivo, previsão de chegada e planejador de rota.
- Personalidade (proposta): confiável, direto, rápido de ler, local (Curitiba). Informação em primeiro lugar, decoração em último.
- Referências (do roadmap original): Transit App (contraste tipográfico e cor por categoria), Moovit (planejador com linha do tempo), Google Maps (painel deslizante em 3 alturas), Waze (ícone que aponta a direção).
- Anti-referências: cara de template Expo, degradês genéricos, emoji decorativo.
- Nome do produto: **pendente**. Hoje o app se chama `curitiba-bus-app` (nome do pacote, também aparece na loja). Decidir nome de exibição antes do release.

## Cores (tokens)
### Hoje
- **Categorias RIT** (única parte já centralizada, em `src/constants/rit.ts`): Expresso `#E11D48`, Ligeirinho `#475569`, Interbairros `#16A34A`, Alimentador `#EA580C`, Troncal `#CA8A04`, cada uma com fundo claro e texto branco do badge.
- **Neutros Slate repetidos como hex nos `.tsx`** (181 ocorrências no total): `#0F172A` (31, texto forte), `#64748B` (33, texto secundário), `#94A3B8` (15), `#CBD5E1`, `#E2E8F0` (8), `#F1F5F9` (12), `#F8FAFC`, `#FFFFFF` (30).
- **Azul de destaque** `#0284C7` (9) e `#E0F2FE` (3); aviso `#F59E0B` (2).
- `src/constants/theme.ts` guarda `Colors.light/dark` e `Spacing` **do template Expo** (preto e branco puros). As telas novas não os usam. Resultado: **modo escuro não existe** nas telas do app.

### Proposta
- Nomear os neutros e o azul como tokens semânticos em `theme.ts`, com par claro/escuro: `text`, `textMuted`, `textSubtle`, `border`, `surface`, `surfaceMuted`, `background`, `accent` (azul), `warning`, `danger`, `success`. Categorias RIT continuam em `rit.ts`.
- **Decisão pendente: cor primária.** Hoje o vermelho `#E11D48` é a cor ativa das abas e também a cor da categoria Expresso. Se o primário do app for o mesmo vermelho, a UI passa a sugerir "tudo é Expresso". Opções: (a) primário azul `#0284C7` e o vermelho fica só para a categoria; (b) manter o vermelho como marca e diferenciar o Expresso por forma/rótulo. Recomendação: (a).
- Contraste AA obrigatório para texto e para o badge de cada categoria sobre o mapa (verificar `#CA8A04` com texto branco, que tende a falhar).

## Tipografia
### Hoje
Só fonte do sistema (`system-ui` no iOS, `normal` no Android). Sem escala: tamanhos 9, 11, 12, 13, 14, 16, 18, 22; pesos `'500'`, `'600'`, `'700'`, `'800'`, `'900'` misturando string e número.

### Proposta
Manter fonte do sistema (leve, boa leitura em mapa). Escala de 5 passos: 12 (rótulo), 14 (corpo), 16 (título de item), 20 (título de tela), 28 (número grande, ex.: minutos de chegada). Pesos 400, 600 e 700. Números de ETA em `tabular-nums`.

## Layout e espaçamento
### Hoje
`Spacing` do template (2, 4, 8, 16, 24, 32...) definido mas sem uso nas telas. Raios em uso: 16 (8x), 12 (7x), 8 (6x), 4 (6x), 6 (4x), 5 (4x), 22 (2x), 3 (2x). Sombras (`shadowColor`/`elevation`) em quase todos os componentes, sem padrão.

### Proposta
Grade de 4 px. Raios: `sm=8`, `md=12`, `lg=16`, `pill=999` (cobre 16 dos usos e elimina 3, 5, 6, 22). Duas elevações (cartão e painel). Densidade confortável, com alvo de toque mínimo de 44 pt.

## Componentes (padrões)
- Badge de linha (`BusBadge`) e pílulas de categoria (`CategoryPills`): já existem; devem consumir os tokens de `rit.ts`.
- Marcadores do mapa: ônibus (`BusMarker`, com rotação por bearing), tubo azul e terminal dourado (`StopMarker`).
- Painel deslizante (`TransitBottomSheet`): 3 alturas (12%, 45%, 88%).
- Feedback: estados de carregando, vazio e erro ainda não têm padrão. Definir quando os dados reais chegarem (indicador de "dado desatualizado", RNF-02).
- Ícones: `lucide-react-native` (já em uso; 21 ícones diferentes). Não misturar outra biblioteca.

## Acessibilidade
- Hoje: nenhum `accessibilityLabel` nem `testID` no app.
- Proposta: rótulo em todo botão, ícone-botão e marcador; alvo de toque de 44 pt; contraste AA; informação nunca só por cor (a categoria também aparece pelo código da linha).

## Telas de conta (proposta, E9)
- Ficam fora das abas (`src/app/(auth)/`), abertas a partir da seção "Conta" em Favoritos. O app nunca bloqueia atrás delas: sempre há "Continuar como visitante".
- Campos: rótulo visível acima, teclado correto (`email-address`, senha com mostrar/ocultar), `autoComplete` e `textContentType` para o gerenciador de senhas, erro em texto abaixo do campo (não só cor), botão principal com estado de carregando e desabilitado durante o envio.
- Mensagens de erro em pt-BR, curtas e sem revelar se o e-mail existe ("E-mail ou senha incorretos."). Confirmação: "Enviamos um link para confirmar seu e-mail."
- Excluir conta: ação destrutiva com confirmação em duas etapas e texto do que será apagado (e-mail e favoritos).

## Ativos de marca
Hoje o ícone, o splash (fundo `#208AEF`) e os logos de exemplo são os do template Expo. Faltam: ícone do app (1024 px), splash, ícone adaptativo do Android, e remover os assets de exemplo (`react-logo*`, `expo-badge*`, `tutorial-web.png`, `tabIcons/explore.png`).

## Tom e voz (microcopy)
- Idioma: pt-BR. Tratamento: "você", informal e curto.
- Erros dizem o que fazer ("Sem conexão. Mostrando os últimos dados de 14:32."), não só o que falhou.
- Termos oficiais da RIT: tubo, terminal, Expresso, Ligeirinho, Interbairros, Alimentador, integração.

## Regras (anti "AI slop")
- Nada de degradê arco-íris, emoji decorativo ou glassmorphism sem propósito.
- Estados completos em toda tela: carregando, vazio, erro, sem permissão (GPS), sem rede.
- Sem número mágico de espaçamento, raio ou cor: só tokens.
- Modo claro e escuro obrigatórios em toda tela nova.
- Testar contraste dos badges de categoria sobre o mapa.

## Pendências de decisão
1. Cor primária (seção Cores).
2. Nome de exibição e ícone do produto.
3. Aprovar escala tipográfica e de raios propostas.
