# Privacidade: o que falta para publicar (25/09/2026)

Complementa [PRIVACY.md](PRIVACY.md). Fontes consultadas nesta data.

## Lojas

| Exigência | Status | Fonte |
|---|---|---|
| Google Play: excluir conta **dentro do app** | Feito (Favoritos > Conta, Edge Function `delete-account`) | [Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111) |
| Google Play: **link web** para pedir exclusão da conta e dos dados | Falta (página + URL no Play Console) | idem |
| Google Play: formulário Data Safety, incluindo o que o Maps SDK coleta (IP, dados do aparelho, falhas, identificador do SDK, interações com o mapa) | Falta | [Maps SDK: data disclosure](https://developers.google.com/maps/documentation/android-sdk/play-data-disclosure) |
| App Store: excluir conta dentro do app | Feito | [App Review Guidelines 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage), [Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/) |
| App Store: link da política **no App Store Connect e dentro do app** | Falta (app não tem link para a política hoje) | [Guidelines 5.1.1(i)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage) |
| App Store: rótulos de privacidade (App Privacy), incluindo SDKs de terceiros | Falta | [App privacy details](https://developer.apple.com/app-store/app-privacy-details/) |
| Política publicada em URL pública | Falta (GitHub Pages ou Vercel) | ambas acima |

## Fatos confirmados usados na política

- Pessoa natural é agente de pequeno porte e pode dispensar encarregado, mantendo canal de contato; perde o benefício se o tratamento for de alto risco (larga escala + critério específico, como dados de crianças/adolescentes). [Res. CD/ANPD nº 2/2022, arts. 2º, 3º, 4º, 11](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-2-de-27-de-janeiro-de-2022-376562019)
- Bases legais e prazos: [LGPD arts. 4º, 7º, 14, 18, 19, 33, 41](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- Cláusulas-padrão da ANPD obrigatórias para transferência internacional por contrato (12 meses a partir de 23/08/2024): [Res. CD/ANPD nº 19/2024](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-19-de-23-de-agosto-de-2024-580095396)
- ECA Digital vale para serviço "de acesso provável" por crianças e adolescentes, em vigor desde 17/03/2026: [Lei 15.211/2025, arts. 1º, 12–14, 41-A](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm)
- Supabase Auth registra IP e user agent em cada evento de autenticação ([audit logs](https://supabase.com/docs/guides/auth/audit-logs)); retenção de logs de 1 dia e sem backup automático no plano Free ([pricing](https://supabase.com/pricing), [backups](https://supabase.com/docs/guides/platform/backups)); DPA usa cláusulas-padrão da UE ([DPA](https://supabase.com/legal/dpa)).

## Para o advogado

1. Legítimo interesse (art. 7º, IX) é a base certa para os logs de IP do Supabase, ou exige teste de balanceamento documentado?
2. Transferência internacional: o Supabase (EUA) com dados em `sa-east-1` configura transferência? O DPA com cláusulas da UE atende a Res. ANPD 19/2024?
3. ECA Digital: quais obrigações se aplicam a um app de transporte sem conteúdo adulto, com conta opcional só de e-mail? Idade mínima para criar conta e consentimento dos responsáveis (LGPD art. 14).
4. A isenção acadêmica (LGPD art. 4º, II, b) deixa de valer quando o app é publicado nas lojas para o público?
5. Apple MapKit: o que precisa ser declarado nos rótulos da App Store (a Apple não publica tabela equivalente à do Google Maps SDK)?

## Pendências técnicas (fora deste PR)

- Link para a política dentro do app (tela de Favoritos/Conta).
- Página web de pedido de exclusão.
- Conferir no painel do Supabase se o armazenamento de audit logs em banco (`auth.audit_log_entries`) está ativado e se os registros são apagados na exclusão da conta.
