import { mergeFavorites } from './favoritesMerge';

// C4
describe('mergeFavorites', () => {
  it('une linhas e paradas dos dois lados sem perder nenhum', () => {
    const merged = mergeFavorites(
      { favoriteLines: ['203'], favoriteStops: ['tubo-central'] },
      { favoriteLines: ['500'], favoriteStops: ['terminal-cabral'] },
    );
    expect([...merged.favoriteLines].sort()).toEqual(['203', '500']);
    expect([...merged.favoriteStops].sort()).toEqual(['terminal-cabral', 'tubo-central']);
  });

  it('não duplica o que existe nos dois lados', () => {
    const merged = mergeFavorites(
      { favoriteLines: ['203', '500'], favoriteStops: ['a'] },
      { favoriteLines: ['500', '203'], favoriteStops: ['a', 'b'] },
    );
    expect(merged.favoriteLines).toHaveLength(2);
    expect([...merged.favoriteStops].sort()).toEqual(['a', 'b']);
  });

  it('tira duplicatas que já vêm dentro de um mesmo lado', () => {
    const merged = mergeFavorites(
      { favoriteLines: ['203', '203'], favoriteStops: [] },
      { favoriteLines: [], favoriteStops: [] },
    );
    expect(merged.favoriteLines).toEqual(['203']);
  });

  it('local vazio e nuvem com dados (e o inverso) devolve o lado com dados', () => {
    const empty = { favoriteLines: [], favoriteStops: [] };
    const full = { favoriteLines: ['203'], favoriteStops: ['a'] };
    expect(mergeFavorites(empty, full)).toEqual(full);
    expect(mergeFavorites(full, empty)).toEqual(full);
  });

  it('ordem estável: locais primeiro, depois o que só existe na nuvem', () => {
    const merged = mergeFavorites(
      { favoriteLines: ['3', '1'], favoriteStops: [] },
      { favoriteLines: ['2', '1'], favoriteStops: [] },
    );
    expect(merged.favoriteLines).toEqual(['3', '1', '2']);
  });

  it('não altera as entradas', () => {
    const local = { favoriteLines: ['1'], favoriteStops: ['a'] };
    const remote = { favoriteLines: ['2'], favoriteStops: ['b'] };
    mergeFavorites(local, remote);
    expect(local).toEqual({ favoriteLines: ['1'], favoriteStops: ['a'] });
    expect(remote).toEqual({ favoriteLines: ['2'], favoriteStops: ['b'] });
  });
});
