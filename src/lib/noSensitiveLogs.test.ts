import * as fs from 'fs';
import * as path from 'path';

// C7: o código de conta nunca chama console.* (token, e-mail, senha e coordenadas não podem ir para log).
// Busca estática: se alguém precisar logar, tem de mudar este teste de propósito.
const root = path.resolve(__dirname, '..');
const dirs = ['lib', 'providers'];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('C7: nada de log no código de conta', () => {
  const files = dirs.flatMap((d) => sourceFiles(path.join(root, d)));

  it('encontra os arquivos a verificar', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [path.relative(root, f), f]))('%s não usa console.*', (_name, file) => {
    const code = fs.readFileSync(file, 'utf8');
    expect(code).not.toMatch(/\bconsole\s*\.\s*\w+/);
  });
});
