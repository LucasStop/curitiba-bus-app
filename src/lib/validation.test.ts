import { validateEmail, validatePassword } from './validation';

// C1
describe('validateEmail', () => {
  it('rejeita vazio', () => {
    expect(validateEmail('')).toBe('Informe o e-mail.');
  });

  it('rejeita sem @', () => {
    expect(validateEmail('usuario.exemplo.com')).toBe('E-mail inválido.');
  });

  it('rejeita sem domínio ou sem ponto no domínio', () => {
    expect(validateEmail('usuario@')).toBe('E-mail inválido.');
    expect(validateEmail('usuario@exemplo')).toBe('E-mail inválido.');
  });

  it('rejeita com espaços', () => {
    expect(validateEmail('usu ario@exemplo.com')).toBe('O e-mail não pode ter espaços.');
    expect(validateEmail(' usuario@exemplo.com')).toBe('O e-mail não pode ter espaços.');
  });

  it('aceita e-mail válido', () => {
    expect(validateEmail('usuario@exemplo.com')).toBeNull();
    expect(validateEmail('nome.sobrenome+tag@sub.exemplo.com.br')).toBeNull();
  });
});

// C2
describe('validatePassword', () => {
  it('rejeita vazia', () => {
    expect(validatePassword('')).toBe('Informe a senha.');
  });

  it('rejeita com menos de 8 caracteres', () => {
    expect(validatePassword('1234567')).toBe('A senha precisa ter pelo menos 8 caracteres.');
  });

  it('aceita exatamente 8 caracteres', () => {
    expect(validatePassword('12345678')).toBeNull();
  });

  it('aceita espaços no meio (frase-senha)', () => {
    expect(validatePassword('ônibus 203 azul')).toBeNull();
  });

  it('rejeita senha só de espaços, mesmo com 8 ou mais', () => {
    expect(validatePassword('        ')).toBe('A senha não pode ser só espaços.');
  });
});
