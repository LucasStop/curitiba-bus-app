# SECURITY: modelo de ameaças e controles

Escopo: app Expo (iOS/Android), projeto Supabase (Auth + Postgres + Edge Functions) e o repositório público `LucasStop/curitiba-bus-app`. Requisitos em [PRD.md](PRD.md), arquitetura em [SSD.md](SSD.md), privacidade em [PRIVACY.md](PRIVACY.md). Itens marcados **Proposto** ainda não existem no código.

## 1. Ativos
| Ativo | Onde vive | Sensibilidade |
|---|---|---|
| Sessão (access e refresh token) | Aparelho do usuário | Alta: dá acesso à conta |
| E-mail e senha da conta | Supabase Auth (senha só como hash, nunca acessível ao app) | Alta (dado pessoal) |
| Favoritos (linhas e paradas) | Aparelho; nuvem se logado | Baixa, mas vinculada a e-mail |
| Localização do usuário | Só no aparelho, nunca enviada | Alta (dado pessoal) |
| Chave publishable e URL do Supabase | App (bundle) | Pública por desenho |
| `service_role` / secret key do Supabase | Só no ambiente da Edge Function | Crítica |
| Chave da URBS (se a API exigir) | Fora do bundle (proxy) | Média |
| Chave do Google Maps (Android) | EAS secret | Média (restringir por app) |

## 2. Ameaças e controles
| # | Ameaça | Controle | Estado |
|---|---|---|---|
| T1 | Segredo vazado no repositório público | gitleaks no pre-commit (lefthook), secret scanning e push protection do GitHub, `.env*.local` ignorado, `.env.example` sem valores, segredos só em EAS secrets | Ativo (exceto `.env.example`) |
| T2 | Usuário A lê ou altera dados do usuário B | RLS ligada em toda tabela, políticas por `(select auth.uid()) = user_id`, testes de isolamento com duas contas | Proposto |
| T3 | `service_role` exposta no app | Nunca no bundle nem no repo; só na Edge Function, que a recebe do ambiente do Supabase | Proposto |
| T4 | Roubo de sessão no aparelho | Sessão cifrada (AES-256) no AsyncStorage com a chave no `expo-secure-store` (Keychain/Keystore); tokens de vida curta com refresh | Proposto |
| T5 | Força bruta e enumeração de contas | Rate limits do Supabase Auth, senha mínima de 8, mensagens genéricas em login e recuperação ("e-mail ou senha incorretos"), confirmação de e-mail | Proposto |
| T6 | Phishing ou desvio no link de recuperação/confirmação | Allowlist de redirect só `curitibabusapp://**`, links de uso único com expiração | Proposto |
| T7 | Abuso da função de excluir conta | A função valida o JWT e apaga apenas o usuário do próprio token, nunca um id vindo de parâmetro | Proposto |
| T8 | Dependência vulnerável | `yarn audit` (hoje 5 moderadas, transitivas), Dependabot alerts e version updates, `npx expo install --fix` | Parcial |
| T9 | Vazamento de localização | Usada só no aparelho; proibido enviar ou registrar coordenadas | Ativo (não há rede hoje) |
| T10 | Push malicioso ou histórico reescrito na `main` | Proteção da `main`: PR obrigatório com CI verde, sem force push | Proposto (hoje desprotegida) |
| T11 | Permissões excessivas no CI | `permissions: contents: read` no workflow; ações fixadas por versão | Proposto (o `ci.yml` atual não declara `permissions`) |
| T12 | Dado pessoal em issue, doc ou log | Repo é público: nada de e-mail, token ou coordenada real em docs, issues, screenshots ou logs | Regra |

## 3. Regras de segurança do código
1. Nunca logar token, e-mail, senha ou coordenadas (`console.log` revisado antes de cada release).
2. Toda tabela nova nasce com RLS ligada e políticas; sem política = sem acesso.
3. Segredo novo entra em `.env.local` e no EAS, nunca em arquivo versionado.
4. Só HTTPS; nenhuma URL `http://` fora do desenvolvimento.
5. Entradas do usuário (e-mail, senha) validadas no cliente e de novo no servidor (Auth e políticas).
6. O app pede localização só quando o usuário usa o recurso, com texto claro em pt-BR.

## 4. Reportar uma vulnerabilidade
Não abra issue pública. Use "Report a vulnerability" na aba Security do repositório (relato privado, precisa estar habilitado nas configurações do GitHub) ou escreva ao responsável pelo projeto. Espere resposta em até 7 dias.

## 5. Pendências para fechar este documento
- Habilitar private vulnerability reporting e proteção da `main` no GitHub.
- Criar `.env.example` e o `permissions` do workflow.
- Medir T2 e T7 com testes reais (docs/TDD.md, casos R1 a R6).
- Revisão de segurança independente antes do release nas lojas.
