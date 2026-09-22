// Devolvem a mensagem de erro em pt-BR, ou null quando o valor é válido.
// O servidor (Supabase Auth) valida de novo: isto é só feedback rápido na tela.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN_LENGTH = 8;

export function validateEmail(email: string): string | null {
  if (email === '') return 'Informe o e-mail.';
  if (/\s/.test(email)) return 'O e-mail não pode ter espaços.';
  if (!EMAIL.test(email)) return 'E-mail inválido.';
  return null;
}

// Espaços no meio são permitidos (frases-senha); só recusa senha feita só de espaços.
export function validatePassword(password: string): string | null {
  if (password === '') return 'Informe a senha.';
  if (password.length < PASSWORD_MIN_LENGTH) return `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  if (password.trim() === '') return 'A senha não pode ser só espaços.';
  return null;
}
