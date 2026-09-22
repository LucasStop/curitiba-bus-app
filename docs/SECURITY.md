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
| T1 | Segredo vazado no repositório público | gitleaks no pre-commit (lefthook), secret scanning e push protection do GitHub, `.env*.local` ignorado, `.env.example` sem valores, segredos só em EAS secrets | Ativo (exceto `.env.example`, ainda a criar; secret scanning e push protection dependem de configuração do dono no GitHub) |
| T2 | Usuário A lê ou altera dados do usuário B | RLS ligada em toda tabela, políticas por `(select auth.uid()) = user_id`, testes de isolamento com duas contas | Proposto |
| T3 | `service_role` exposta no app | Nunca no bundle nem no repo; só na Edge Function, que a recebe do ambiente do Supabase | Proposto |
| T4 | Roubo de sessão no aparelho | Sessão cifrada (AES-256) no AsyncStorage com a chave no `expo-secure-store` (Keychain/Keystore); tokens de vida curta com refresh | Proposto |
| T5 | Força bruta e enumeração de contas | Rate limits do Supabase Auth, senha mínima de 8, mensagens genéricas em login e recuperação ("e-mail ou senha incorretos"), confirmação de e-mail | Proposto |
| T6 | Phishing ou desvio no link de recuperação/confirmação | Allowlist de redirect só `curitibabusapp://**`, links de uso único com expiração | Proposto |
| T7 | Abuso da função de excluir conta | A função valida o JWT e apaga apenas o usuário do próprio token, nunca um id vindo de parâmetro | Proposto |
| T8 | Dependência vulnerável | `yarn audit` no CI (informativo), Dependabot version updates semanais (`.github/dependabot.yml`), `npx expo install --fix`, `resolutions` quando seguro | Parcial: 1 moderada sem correção segura (abaixo); Dependabot alerts/security updates dependem do dono |
| T9 | Vazamento de localização | Usada só no aparelho; proibido enviar ou registrar coordenadas | Ativo (não há rede hoje) |
| T10 | Push malicioso ou histórico reescrito na `main` | Proteção da `main`: PR obrigatório com CI verde, sem force push | Proposto (hoje desprotegida) |
| T11 | Permissões excessivas no CI | `permissions: contents: read` no workflow; ações fixadas por versão | Parcial: `permissions: contents: read` ativo; ações ainda por tag (`@v4`), não por SHA (o Dependabot `github-actions` mantém as versões em dia) |
| T12 | Dado pessoal em issue, doc ou log | Repo é público: nada de e-mail, token ou coordenada real em docs, issues, screenshots ou logs | Regra |

### Auditoria de dependências (T8), estado em 21/09/2026
`yarn audit` acusava 5 moderadas transitivas. São dois advisories:

| Pacote | Advisory | Caminho | Estado |
|---|---|---|---|
| `uuid` 7.0.3 (4 caminhos) | 1119441: falta checagem de limite do buffer em v3/v5/v6 quando `buf` é passado | `expo > @expo/config-plugins > xcode > uuid` (e as variantes via `@expo/config`, `@expo/cli`, `@expo/metro-config`) | **Corrigido**: `resolutions` `"**/xcode/uuid": "^11.1.1"`. O `xcode` só chama `uuid.v4()`; só roda em build (prebuild/config plugins), não entra no bundle do app. Validado com `expo prebuild --platform ios` e `expo export --platform ios`. |
| `decode-uri-component` 0.2.2 | 1147955: DoS por decodificação exponencial de entrada malformada; corrigido em >=0.5.0 | `expo-router > query-string@7.1.3 > decode-uri-component` | **Sem correção segura** |

Por que `decode-uri-component` não foi forçado: as versões corrigidas (0.3+) são só ESM (`"type": "module"`, `export default`) e o `query-string@7` faz `require('decode-uri-component')`. Testado: `require()` da 0.5.0 devolve `{ __esModule, default }` em vez da função, então o parse de query string do `expo-router` quebraria em runtime. `query-string` 8+ também é só ESM e é dependência fixada pelo `expo-router` (`^7.1.3`); trocar exige upgrade do `expo-router`, fora deste escopo.

Mitigação: o pacote roda no cliente e só recebe query strings de deep links e rotas do próprio app (`curitibabusapp://`); o pior caso é travar o app do próprio usuário com um link malformado, sem vazar dado nem executar código. Não há servidor. Reavaliar quando o `expo-router` do SDK seguinte atualizar o `query-string`; o Dependabot abre o PR.

`yarn audit --level high` fecha sem altas/críticas, mas o `yarn` 1 mantém o exit code 4 (moderada) mesmo com `--level`; por isso o passo do CI segue com `continue-on-error`.

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
- Criar `.env.example` (`EXPO_PUBLIC_SUPABASE_URL=` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`, sem valores).
- Resolver ou aceitar formalmente a moderada de `decode-uri-component` (T8) e então tornar o `yarn audit` bloqueante.
- Habilitar Dependabot alerts/security updates e secret scanning com push protection no GitHub (decisão do dono).
- Medir T2 e T7 com testes reais (docs/TDD.md, casos R1 a R6).
- Revisão de segurança independente antes do release nas lojas.
