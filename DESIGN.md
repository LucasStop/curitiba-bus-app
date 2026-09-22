# Curitiba Bus App: DESIGN.md (identidade visual e design system)

Memória de design do projeto. O `/frontend-design` e o `impeccable` leem este arquivo antes de gerar UI. Regras globais do `~/.claude/CLAUDE.md` valem; aqui só a identidade do repo.

Cada seção tem **Hoje** (auditado no código em 21/09/2026) e **Decisão/Proposta**. Decisões do Lucas de 21/09/2026 estão marcadas como **Decidido**. Nada foi aplicado ao código ainda.

## Brand
- Produto: app de transporte coletivo de Curitiba (RIT/URBS) com mapa ao vivo, previsão de chegada e planejador de rota.
- Personalidade: confiável, direto, rápido de ler, local (Curitiba). Informação em primeiro lugar, decoração em último.
- Referências e o que se toma de cada uma (só princípios; nome, logo, ícone, fonte e paleta exata de nenhuma delas são copiados):
  - **Transit App:** ETA como maior elemento do cartão; cinza + ícone pulsante para "programado" vs "ao vivo"; viagem cancelada riscada; mapa base esmaecido para destacar as linhas; modo escuro de primeira classe.
  - **Moovit:** planejador em linha do tempo, com trechos coloridos, espera, duração, nº de paradas e onde descer; cor nunca é o único sinal (teste em escala de cinza); referência de acessibilidade.
  - **Google Maps:** painel deslizante não modal em 3 alturas; mapa utilizável com o painel no mínimo; cluster com contagem que abre no zoom.
  - **Waze:** contraste da rota contra água e verde (rota nunca parecida com água); seta de rumo no veículo.
- Anti-referências: cara de template Expo, degradês genéricos, emoji decorativo, humor em erro ou atraso, personalização de veículo, anúncios, fonte paga.
- Diferenciais frente aos apps atuais: sem anúncio; "dado de X min atrás" sempre visível (ataca a queixa de "ônibus previsto que não vem"); sem login obrigatório; filtro de rota acessível.
- **Nome do produto: "Busier".** Decidido em 22/09/2026. Escolhido para diferenciar do app homônimo próximo "Buser" (buser.com.br, passagens interurbanas) e evitar a colisão direta identificada na pesquisa anterior. Como o app é um projeto acadêmico e não vai para publicação comercial nas lojas por ora, a busca formal de anterioridade (Google Play, App Store, INPI) fica dispensada — reavaliar apenas se o projeto migrar para publicação real.
- **Não oficial:** o app não é da Prefeitura nem da URBS. A tela "Sobre" diz isso e cita a fonte dos dados.

## Cores (tokens)
### Hoje
- **Categorias RIT** (única parte já centralizada, em `src/constants/rit.ts`): Expresso `#E11D48`, Ligeirinho `#475569`, Interbairros `#16A34A`, Alimentador `#EA580C`, Troncal `#CA8A04`, cada uma com fundo claro e texto branco do badge.
- **Neutros Slate repetidos como hex nos `.tsx`** (181 ocorrências no total): `#0F172A` (31, texto forte), `#64748B` (33, texto secundário), `#94A3B8` (15), `#CBD5E1`, `#E2E8F0` (8), `#F1F5F9` (12), `#F8FAFC`, `#FFFFFF` (30).
- **Azul de destaque** `#0284C7` (9) e `#E0F2FE` (3); aviso `#F59E0B` (2).
- `src/constants/theme.ts` guarda `Colors.light/dark` e `Spacing` **do template Expo** (preto e branco puros). As telas novas não os usam. Resultado: **modo escuro não existe** nas telas do app.
- Contraste medido (texto branco sobre o fundo): Troncal 2,94, Interbairros 3,30, Alimentador 3,56 e o azul de destaque `#0284C7` 4,10 **reprovam AA** (mínimo 4,5). Expresso 4,70 e Ligeirinho 7,58 passam.

### Decidido: cor primária = azul escurecido
Primário **`#0369A1`** no claro (branco sobre ele: 5,93:1) e **`#7DD3FC`** no escuro (sobre `#0B1220`: 11,23:1). Substitui `#0284C7`. O vermelho `#E11D48` fica só como cor da categoria Expresso.
- Risco assumido: o azul fica perto do azul do Ligeirão (`#1D4ED8`) e de um azul institucional da Prefeitura de Curitiba (`#004F9F`, manual de identidade v1.2), que o usuário associa ao "app oficial". Mitigação: o primário só aparece em chrome de UI (aba ativa, botão, link, foco), **nunca** como fundo de badge de linha, cor de rota ou marcador; badge de linha sempre leva o código e o rótulo da categoria; e a tela "Sobre" declara que o app não é oficial. Não usar `#004F9F` nem tom próximo a ele.
- Rota selecionada no mapa: espessura e cor distintas da água (regra do Waze); nunca o azul primário sobre fundo de água.

### Proposta: categorias RIT (claro, texto do badge / escuro)
Cores reais são aproximações de tom (nenhuma fonte pública dá o hex oficial da RIT); o que vale é o rótulo da categoria estar sempre visível, porque a própria RIT admite confusão entre laranja e amarelo nas ruas.

| Categoria | Claro (fundo / texto) | Contraste | Escuro (fundo, texto `#0B1220`) | Contraste |
|---|---|---|---|---|
| Expresso | `#B91C1C` / branco | 6,47 | `#F87171` | 6,77 |
| Ligeirão (novo) | `#1D4ED8` / branco | 6,70 | `#60A5FA` | 7,36 |
| Ligeirinho | `#475569` / branco | 7,58 | `#94A3B8` | 7,30 |
| Interbairros | `#15803D` / branco | 5,02 | `#4ADE80` | 10,74 |
| Alimentador | `#C2410C` / branco | 5,18 | `#FB923C` | 8,27 |
| Convencional (novo) | `#FACC15` / `#1C1917` | 11,42 | `#FACC15` | 12,23 |

- Troncal e Alimentador são ambos laranja na rua: fundir Troncal em "Convencional/Troncal" ou dar a Troncal o mesmo tom com um marcador de forma. Decidir ao mapear as linhas reais (E3).
- O amarelo `#FACC15` contra fundo claro `#F8FAFC` tem só 1,46: o badge precisa de contorno `#A16207` de 1 px. Em fundo escuro `#111827` todos os badges passam de 6:1.
- Fora do escopo agora: Circular Centro, Turismo, Jardineira, SITES.
- Neutros e o primário viram tokens semânticos em `theme.ts`, com par claro/escuro: `text`, `textMuted`, `textSubtle`, `border`, `surface`, `surfaceMuted`, `background`, `accent` (o primário acima), `warning`, `danger`, `success`. Categorias ficam em `rit.ts`.
- Não usar cor dinâmica do sistema (Material You): a identidade por categoria não pode mudar com o papel de parede.
- Modo escuro segue o sistema, sem chave própria no app.

## Tipografia
### Hoje
Só fonte do sistema (`system-ui` no iOS, `normal` no Android). Sem escala: tamanhos 9, 11, 12, 13, 14, 16, 18, 22; pesos `'500'`, `'600'`, `'700'`, `'800'`, `'900'` misturando string e número.

### Proposta
Manter fonte do sistema (leve, boa leitura em mapa; as fontes da Prefeitura e da Transit/Waze são licenciadas e não entram). Escala de 5 passos: 12 (rótulo), 14 (corpo), 16 (título de item), 20 (título de tela), 32 (número grande: minutos de chegada, o maior elemento do cartão). Pesos 400, 600 e 700. Números de ETA em `tabular-nums`. Respeitar Dynamic Type / escala de fonte do sistema até 200% sem cortar texto.

## Layout e espaçamento
### Hoje
`Spacing` do template (2, 4, 8, 16, 24, 32...) definido mas sem uso nas telas. Raios em uso: 16 (8x), 12 (7x), 8 (6x), 4 (6x), 6 (4x), 5 (4x), 22 (2x), 3 (2x). Sombras (`shadowColor`/`elevation`) em quase todos os componentes, sem padrão.

### Proposta
Grade de 4 px. Raios: `sm=8`, `md=12`, `lg=16`, `pill=999` (cobre 16 dos usos e elimina 3, 5, 6, 22). Duas elevações (cartão e painel). Densidade confortável, alvo de toque mínimo de 44 pt no iOS e 48 dp no Android.

## Componentes (padrões)
- Badge de linha (`BusBadge`) e pílulas de categoria (`CategoryPills`): já existem; devem consumir os tokens de `rit.ts`. O código da linha e o rótulo da categoria ficam sempre visíveis.
- **Painel deslizante (`TransitBottomSheet`):** 3 alturas, 12%, 45% e 88% da área acima da tab bar. Mínimo `max(12%, ~96dp)`: handle com alvo de 48 dp mais uma linha de contexto (ex.: "Linha 203: 4 min"). Não modal, sem scrim. Handle com `accessibilityRole="adjustable"` e ações expandir/recolher; toque no handle alterna as alturas. Largura máxima de ~640 dp em tablet.
- **Botões do mapa** (localização, camadas): pilha à direita, logo acima do painel, ocultos acima de 45%. Alvo mínimo 48 dp, margem 16 dp, 56 dp no principal, fundo sólido e sombra, ícone com contraste 3:1, `accessibilityLabel` em todos. A bússola só aparece com o mapa rotacionado (canto superior esquerdo).
- **Marcadores do mapa:**
  - Ônibus: forma + seta de rumo + código da linha, contorno branco (`BusMarker`, rotação por bearing). Selecionado: maior, contorno espesso e halo, mesma cor.
  - Parada: círculo pequeno no zoom médio, rótulo só ao aproximar. Tubo = círculo; terminal/integração = barra (forma, não só cor).
  - Zoom distante: cluster com contagem, que se abre ao aproximar.
  - Rótulo de acessibilidade: "Linha 203, sentido Terminal Boa Vista, chegando em 4 min".
- **Mapa base:** esmaecido e dessaturado; esconder POIs comerciais e manter só terminais e tubos; linhas e ônibus em destaque.
- **Ao vivo vs programado:** dado em tempo real com ícone pulsante; dado só de tabela em cinza com rótulo "programado"; sempre mostrar a idade do dado ("há 2 min"). Viagem cancelada riscada com texto ("Cancelado", "Provável cancelamento") e o que fazer. Fecha o RNF-02.
- **Planejador ("Como ir"):** linha do tempo em vez de cartões soltos: trechos coloridos por categoria, espera, duração, nº de paradas e onde descer.
- Estados de carregando, vazio e erro: padrão único, definido quando os dados reais chegarem (E3).
- Ícones: `lucide-react-native` (licença ISC, já em uso; 21 ícones diferentes). Não misturar outra biblioteca.

## Acessibilidade
- Hoje: nenhum `accessibilityLabel` nem `testID` no app.
- Proposta: rótulo em todo botão, ícone-botão e marcador; alvo de toque conforme a seção Layout; contraste AA (4,5:1 para texto, 3:1 para componentes) nos dois modos; informação nunca só por cor, com teste em escala de cinza; texto escalável até 200%; alerta de "descer na próxima parada" no planejador.

## Telas de conta (proposta, E9)
- Ficam fora das abas (`src/app/(auth)/`), abertas a partir da seção "Conta" em Favoritos. O app nunca bloqueia atrás delas: sempre há "Continuar como visitante".
- Campos: rótulo visível acima, teclado correto (`email-address`, senha com mostrar/ocultar), `autoComplete` e `textContentType` para o gerenciador de senhas, erro em texto abaixo do campo (não só cor), botão principal com estado de carregando e desabilitado durante o envio.
- Mensagens de erro em pt-BR, curtas e sem revelar se o e-mail existe ("E-mail ou senha incorretos."). Confirmação: "Enviamos um link para confirmar seu e-mail."
- Excluir conta: ação destrutiva com confirmação em duas etapas e texto do que será apagado (e-mail e favoritos).

## Ativos de marca
**Aplicado em 22/09/2026.** Ícone, splash e ícone adaptativo do Android gerados na direção cápsula-tubo (ver abaixo) e aplicados em `app.json`. Removidos os assets de exemplo do template Expo (`react-logo*`, `expo-badge*`, `expo-logo.png`, `logo-glow.png`, `tutorial-web.png`, `tabIcons/`, `assets/expo.icon/`) e os componentes órfãos que só os usavam (`web-badge.tsx`, `animated-icon.tsx`/`.web.tsx`).

**Decidido: direção do ícone = cápsula-tubo.** Pílula horizontal branca com um ponto e uma faixa, sobre fundo no azul primário `#0369A1`. Evoca a estação-tubo, legível a 29 pt, sem cor de linha. Formas geométricas próprias.
- Não usar: brasão de Curitiba, logos da Prefeitura e da URBS, o pictograma oficial do tubo, o pin do Maps, o Wazer, o pin verde do Transit, o laranja do Moovit. Splash no mesmo primário.
- Sem texto no ícone (nome "Busier" já fechado, mas mantém a direção sem texto por legibilidade em tamanho pequeno).

## Tom e voz (microcopy)
- Idioma: pt-BR. Tratamento: "você", informal e curto, acolhedor. Sem humor em erro ou atraso; instrução acionável.
- Erros dizem o que fazer ("Sem conexão. Mostrando os últimos dados de 14:32."), não só o que falhou.
- Termos oficiais da RIT: tubo, terminal, Expresso, Ligeirão, Ligeirinho, Interbairros, Alimentador, integração.

## Regras (anti "AI slop")
- Nada de degradê arco-íris, emoji decorativo ou glassmorphism sem propósito.
- Estados completos em toda tela: carregando, vazio, erro, sem permissão (GPS), sem rede.
- Sem número mágico de espaçamento, raio ou cor: só tokens.
- Modo claro e escuro obrigatórios em toda tela nova.
- Testar o contraste dos badges de categoria sobre o mapa e sobre o painel, nos dois modos.
- Sem cópia de identidade de terceiros: só princípios (ver Brand e Ativos).

## Pendências de decisão
1. **Nome de exibição definitivo antes de publicar** — "Buser" é provisório e colide com app existente (ver Brand).
2. Aprovar a escala tipográfica (com o ETA em 32) e a de raios.
3. Aprovar a tabela de categorias RIT e a fusão Troncal/Convencional.
4. Busca de anterioridade do nome (Play, App Store, INPI) antes do release.

Fontes da pesquisa (21/09/2026): Transit (blog.transitapp.com, help.transitapp.com), Moovit (moovit.com/features/accessibility), Google Maps e Waze (developers.google.com/maps, Pentagram), Material 3 e Apple HIG (sheets, tab bars, maps, accessibility), Wikipédia pt (Rede Integrada de Transporte), Bandab e Gazeta do Povo (cores dos ônibus), Manual de Identidade Visual v1.2 da Prefeitura de Curitiba.
