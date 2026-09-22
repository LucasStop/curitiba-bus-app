import { mapAuthError, RESET_SENT_MESSAGE } from './authErrors';

// C3
const invalidCredentials = { name: 'AuthApiError', status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' };
const userNotFound = { name: 'AuthApiError', status: 400, code: 'user_not_found', message: 'User not found' };
const alreadyExists = { name: 'AuthApiError', status: 422, code: 'user_already_exists', message: 'User already registered' };
const rateLimit = { name: 'AuthApiError', status: 429, code: 'over_request_rate_limit', message: 'Request rate limit reached' };
const emailRateLimit = { name: 'AuthApiError', status: 429, code: 'over_email_send_rate_limit', message: 'Email rate limit exceeded' };
const network = { name: 'AuthRetryableFetchError', status: 0, message: 'Network request failed' };
const notConfirmed = { name: 'AuthApiError', status: 400, code: 'email_not_confirmed', message: 'Email not confirmed' };

const NETWORK_MSG = 'Sem conexão. Verifique a internet e tente de novo.';
const RATE_MSG = 'Muitas tentativas. Aguarde um pouco e tente de novo.';
const CONTEXTS = ['signIn', 'signUp', 'reset', 'other'] as const;

describe('mapAuthError', () => {
  it('login: credenciais inválidas e usuário inexistente dão a MESMA mensagem genérica', () => {
    const a = mapAuthError(invalidCredentials, 'signIn');
    const b = mapAuthError(userNotFound, 'signIn');
    expect(a).toBe('E-mail ou senha incorretos.');
    expect(b).toBe(a);
  });

  it('login: e-mail não confirmado orienta a confirmar', () => {
    expect(mapAuthError(notConfirmed, 'signIn')).toBe('Confirme seu e-mail para entrar. Veja sua caixa de entrada.');
  });

  it('cadastro: e-mail já cadastrado', () => {
    const msg = 'Este e-mail já tem cadastro. Entre ou recupere a senha.';
    expect(mapAuthError(alreadyExists, 'signUp')).toBe(msg);
    expect(mapAuthError({ ...alreadyExists, code: 'email_exists' }, 'signUp')).toBe(msg);
  });

  it('senha fraca: mesma mensagem em qualquer contexto (cadastro ou troca de senha)', () => {
    for (const ctx of CONTEXTS) {
      expect(mapAuthError({ status: 422, code: 'weak_password', message: 'x' }, ctx)).toBe(
        'Senha fraca. Use pelo menos 8 caracteres.',
      );
    }
  });

  it('rede: falha de conexão em qualquer contexto', () => {
    for (const ctx of CONTEXTS) {
      expect(mapAuthError(network, ctx)).toBe(NETWORK_MSG);
    }
    expect(mapAuthError(new TypeError('Network request failed'), 'signIn')).toBe(NETWORK_MSG);
  });

  it('limite de tentativas (429) em qualquer contexto', () => {
    for (const ctx of CONTEXTS) {
      expect(mapAuthError(rateLimit, ctx)).toBe(RATE_MSG);
    }
    expect(mapAuthError(emailRateLimit, 'reset')).toBe(RATE_MSG);
    expect(mapAuthError({ status: 429, message: 'x' }, 'signIn')).toBe(RATE_MSG);
  });

  it('recuperação: qualquer erro de conta é genérico e nunca revela se o e-mail existe', () => {
    const a = mapAuthError(userNotFound, 'reset');
    expect(a).toBe('Não foi possível enviar o link agora. Tente de novo em instantes.');
    expect(mapAuthError(invalidCredentials, 'reset')).toBe(a);
    expect(mapAuthError(alreadyExists, 'reset')).toBe(a);
  });

  it('a mensagem de sucesso da recuperação também é neutra', () => {
    expect(RESET_SENT_MESSAGE).toBe('Se houver uma conta com esse e-mail, enviaremos um link para redefinir a senha.');
  });

  it('erro desconhecido cai numa mensagem segura, sem vazar o texto original', () => {
    const msg = mapAuthError({ status: 500, message: 'select * from auth.users failed' }, 'other');
    expect(msg).toBe('Algo deu errado. Tente novamente.');
    expect(msg).not.toMatch(/select/i);
  });

  it('login com erro de cliente (4xx) desconhecido continua genérico', () => {
    expect(mapAuthError({ status: 400, message: 'whatever' }, 'signIn')).toBe('E-mail ou senha incorretos.');
  });

  it('login com erro de servidor (5xx) não acusa credencial', () => {
    expect(mapAuthError({ status: 500, message: 'boom' }, 'signIn')).toBe('Algo deu errado. Tente novamente.');
  });
});
