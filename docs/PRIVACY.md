# Política de privacidade (RASCUNHO)

> **Rascunho técnico, sem validade jurídica.** Precisa de revisão jurídica antes de ser publicada e linkada nas lojas (App Store e Google Play exigem uma URL pública). Itens marcados `[CONFIRMAR]` não foram confirmados em fonte primária. Base: Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018). Fontes e pendências em [PRIVACY-CHECKLIST.md](PRIVACY-CHECKLIST.md); detalhes técnicos em [SECURITY.md](SECURITY.md) e [SSD.md](SSD.md).

## 1. Quem somos
Controlador: Lucas Stopinski da Silva, pessoa física (projeto acadêmico, sem CNPJ). Contato para assuntos de privacidade: lucasstopinskidasilva@gmail.com.

Como agente de tratamento de pequeno porte (pessoa natural), não indicamos encarregado (Res. CD/ANPD nº 2/2022, art. 11); o e-mail acima é o canal de comunicação com o titular exigido nesse caso.

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
| Endereço IP e navegador/aparelho (user agent) | A cada cadastro, login, troca de senha ou renovação de sessão | Registro de segurança dos eventos de autenticação, gerado automaticamente pelo Supabase Auth | Logs do Supabase |

## 4. Dados que NÃO coletamos
- **Localização:** o GPS é usado somente no aparelho para centralizar o mapa e sugerir rotas. Não é enviada, nem armazenada, nem registrada em log por nós.
- Histórico de viagens ou de buscas, contatos, fotos, identificadores de publicidade.

## 5. Base legal (LGPD art. 7)
- **Conta e sincronização de favoritos:** execução de contrato a pedido do titular (art. 7º, V). A conta é opcional e só existe porque você a criou.
- **Registros de segurança da autenticação (IP e user agent):** legítimo interesse em proteger as contas contra acesso indevido (art. 7º, IX). `[CONFIRMAR]` com advogado.
- **Localização:** não há tratamento por nós, porque o dado não sai do aparelho. O acesso ao GPS depende da sua permissão no aviso do sistema e pode ser revogado nos ajustes do aparelho.

## 6. Compartilhamento e operadores
- **Supabase** atua como operador (hospedagem de autenticação e banco), no projeto criado na região São Paulo (`sa-east-1`, confirmado no painel do projeto).
- **Provedor do mapa:** o mapa é desenhado pelo Apple Maps (iPhone) ou pelo Google Maps (Android), que recebem dados técnicos do aparelho ao carregar o mapa. No Android, o Google Maps SDK coleta automaticamente dados do aparelho (sistema, modelo), endereço IP, relatórios de falha, um identificador próprio do SDK e interações com o mapa (arrastar, zoom), para uso do próprio Google. No iPhone, o que o Apple Maps recebe dentro de apps de terceiros não está documentado de forma equivalente `[CONFIRMAR]`. Esses dados são tratados por Google e Apple conforme as políticas deles, não chegam a nós.
- Não vendemos nem compartilhamos dados para publicidade.

## 7. Transferência internacional
O Supabase é uma empresa sediada nos Estados Unidos. O banco fica em São Paulo, mas os logs e o acesso técnico da empresa podem envolver servidores ou equipes fora do Brasil `[CONFIRMAR]`. Se houver transferência internacional, ela se apoia em cláusulas contratuais (LGPD art. 33, II); o contrato de tratamento de dados do Supabase usa as cláusulas-padrão da União Europeia, e a ANPD exige as cláusulas-padrão brasileiras (Res. CD/ANPD nº 19/2024) `[CONFIRMAR]` se o Supabase já as incorporou.

## 8. Retenção e exclusão
Mantemos e-mail e favoritos enquanto a conta existir. Você pode **excluir a conta dentro do app** (Favoritos, seção Conta); a exclusão remove o usuário e seus favoritos. Sem conta, apagar o app apaga os dados locais.

- **Backups:** no plano atual (gratuito) o Supabase não faz backup automático do banco, então não sobra cópia dos seus dados em backup depois da exclusão. Se mudarmos para um plano pago, backups diários guardam os dados por até 7 dias após a exclusão, e esta política será atualizada.
- **Logs de segurança:** os registros de autenticação (item 3) ficam no armazenamento de logs do Supabase por 1 dia no plano atual. Se o armazenamento desses registros no banco estiver ativado no projeto, eles ficam até serem apagados `[CONFIRMAR]` configuração do projeto.
- **Pedido de exclusão pela web:** página para pedir a exclusão sem abrir o app, exigida pelo Google Play. Pendente: `[PREENCHER]` URL.

## 9. Seus direitos (LGPD art. 18)
Confirmação e acesso aos dados, correção, anonimização ou eliminação, portabilidade, informação sobre compartilhamento e revogação do consentimento. Peça pelo contato do item 1. A confirmação simplificada é imediata; a declaração completa sai em até 15 dias contados do pedido (LGPD art. 19).

## 10. Segurança
Sessão cifrada no aparelho, controle de acesso por linha no banco (RLS), comunicação por HTTPS. Veja [SECURITY.md](SECURITY.md). Em caso de incidente relevante, avisaremos os afetados e a ANPD conforme a lei.

## 11. Crianças e adolescentes
O app de ônibus pode ser usado por adolescentes (estudantes usam o transporte coletivo), então se enquadra como serviço de "acesso provável" por crianças e adolescentes do Estatuto Digital da Criança e do Adolescente (Lei 15.211/2025, em vigor desde 17/03/2026). Sem conta, o app não coleta dado pessoal de ninguém. A conta é opcional, pede só e-mail e senha, e não há perfilamento, publicidade nem interação entre usuários. Idade mínima para criar conta e obrigações específicas dessa lei (sinal de idade das lojas, consentimento dos responsáveis para menores de 12 anos, LGPD art. 14) `[CONFIRMAR]` com advogado.

## 12. Alterações
Mudanças relevantes serão avisadas no app. Data desta versão: 25/09/2026.
