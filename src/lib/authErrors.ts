// Traduz erros do Supabase Auth para mensagens pt-BR. Nunca repassa o texto original do servidor
// (pode conter detalhe interno) e, em login e recuperação, nunca revela se o e-mail existe (T5).

export type AuthErrorContext = 'signIn' | 'signUp' | 'reset' | 'other';

interface AuthLikeError {
  name?: string;
  status?: number;
  code?: string;
  message?: string;
}

const NETWORK = 'Sem conexão. Verifique a internet e tente de novo.';
const RATE_LIMIT = 'Muitas tentativas. Aguarde um pouco e tente de novo.';
const GENERIC = 'Algo deu errado. Tente novamente.';
const BAD_CREDENTIALS = 'E-mail ou senha incorretos.';
const RESET_FAILED = 'Não foi possível enviar o link agora. Tente de novo em instantes.';

// Resposta neutra: igual exista ou não uma conta com o e-mail.
export const RESET_SENT_MESSAGE = 'Se houver uma conta com esse e-mail, enviaremos um link para redefinir a senha.';

const RATE_LIMIT_CODES = ['over_request_rate_limit', 'over_email_send_rate_limit', 'over_sms_send_rate_limit'];
const NETWORK_NAMES = ['AuthRetryableFetchError', 'FunctionsFetchError'];

export function mapAuthError(error: unknown, context: AuthErrorContext = 'other'): string {
  const e = (typeof error === 'object' && error !== null ? error : {}) as AuthLikeError;

  if (NETWORK_NAMES.includes(e.name ?? '') || e.status === 0 || /network request failed|failed to fetch/i.test(e.message ?? '')) {
    return NETWORK;
  }
  if (e.status === 429 || RATE_LIMIT_CODES.includes(e.code ?? '')) return RATE_LIMIT;

  switch (context) {
    case 'signIn': {
      // email_not_confirmed só aparece depois que a senha confere, então não expõe a existência da conta a quem não a tem.
      if (e.code === 'email_not_confirmed') return 'Confirme seu e-mail para entrar. Veja sua caixa de entrada.';
      const clientError = e.status !== undefined && e.status >= 400 && e.status < 500;
      return clientError || e.code === 'invalid_credentials' || e.code === 'user_not_found' ? BAD_CREDENTIALS : GENERIC;
    }
    case 'signUp':
      if (e.code === 'user_already_exists' || e.code === 'email_exists') {
        return 'Este e-mail já tem cadastro. Entre ou recupere a senha.';
      }
      if (e.code === 'weak_password') return 'Senha fraca. Use pelo menos 8 caracteres.';
      return GENERIC;
    case 'reset':
      return RESET_FAILED;
    default:
      return GENERIC;
  }
}
