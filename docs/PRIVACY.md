# Política de privacidade (RASCUNHO)

> **Rascunho técnico, sem validade jurídica.** Precisa de revisão jurídica e de preenchimento dos campos `[PREENCHER]` antes de ser publicada e linkada nas lojas (App Store e Google Play exigem uma URL pública). Base: Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018). Detalhes técnicos em [SECURITY.md](SECURITY.md) e [SSD.md](SSD.md).

## 1. Quem somos
Controlador: `[PREENCHER: nome ou razão social]`. Contato para assuntos de privacidade: `[PREENCHER: e-mail]`.

## 2. Modos de uso
- **Visitante (sem conta):** mapa, linhas, previsão de chegada, planejador e favoritos funcionam sem cadastro. Nada é enviado a servidores nossos; os favoritos ficam só no aparelho.
- **Com conta (opcional):** permite sincronizar favoritos entre aparelhos.

## 3. Dados que tratamos
| Dado | Quando | Para quê | Onde fica |
|---|---|---|---|
| E-mail | Só se você criar conta | Identificar a conta, confirmar o e-mail e recuperar a senha | Supabase Auth |
| Senha | Só se você criar conta | Entrar na conta. Guardada apenas como hash pelo provedor; nós não a vemos | Supabase Auth |
| Favoritos (linhas e paradas) | Se você estiver logado | Sincronizar entre aparelhos | Banco Postgres do Supabase |
| Dados técnicos de sessão | Se você estiver logado | Manter o login | No aparelho, cifrados |

## 4. Dados que NÃO coletamos
- **Localização:** o GPS é usado somente no aparelho para centralizar o mapa e sugerir rotas. Não é enviada, nem armazenada, nem registrada em log.
- Histórico de viagens ou de buscas, contatos, fotos, identificadores de publicidade.

## 5. Base legal (LGPD art. 7)
Execução do serviço pedido por você (conta e sincronização) e consentimento para o uso da localização, dado no aviso do sistema. `[REVISAR JURIDICAMENTE]`

## 6. Compartilhamento e operadores
O Supabase atua como operador (hospedagem de autenticação e banco), no projeto criado na região São Paulo. Não vendemos nem compartilhamos dados para publicidade. `[PREENCHER: confirmar região e cláusulas contratuais do operador]`

## 7. Retenção e exclusão
Mantemos e-mail e favoritos enquanto a conta existir. Você pode **excluir a conta dentro do app** (Favoritos, seção Conta); a exclusão remove o usuário e seus favoritos. Sem conta, apagar o app apaga os dados locais.

## 8. Seus direitos (LGPD art. 18)
Confirmação e acesso aos dados, correção, anonimização ou eliminação, portabilidade, informação sobre compartilhamento e revogação do consentimento. Peça pelo contato do item 1; respondemos em até `[PREENCHER: prazo]`.

## 9. Segurança
Sessão cifrada no aparelho, controle de acesso por linha no banco (RLS), comunicação por HTTPS. Veja [SECURITY.md](SECURITY.md). Em caso de incidente relevante, avisaremos os afetados e a ANPD conforme a lei.

## 10. Crianças
`[DECIDIR: idade mínima e tratamento de menores]`

## 11. Alterações
Mudanças relevantes serão avisadas no app. Data desta versão: `[PREENCHER]`.
