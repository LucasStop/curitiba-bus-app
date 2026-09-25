/* global describe, it, expect */
const { parseStopName, mapCategory, simplifyPath, buildDataset } = require('./geocuritiba-transform.cjs');

describe('parseStopName', () => {
  it('terminal platform keeps only the terminal name', () => {
    expect(
      parseStopName('Terminal Santa Cândida - 200 - Ligeirão Sta.Cândida/Pça. do Japão - 203 - Santa Cândida'),
    ).toEqual({
      nome: 'Terminal Santa Cândida',
    });
    expect(parseStopName('Terminal Santa Felicidade -  924 - Santa Felicidade/ Santa Cândida')).toEqual({
      nome: 'Terminal Santa Felicidade',
    });
  });

  it('address splits name and neighbourhood on the last dash', () => {
    expect(parseStopName('Av. Pres. Kennedy, 3860 - Portão')).toEqual({
      nome: 'Av. Pres. Kennedy, 3860',
      bairro: 'Portão',
    });
    expect(parseStopName('Rua Doutor Ovande do Amaral, 357- Jardim das Américas')).toEqual({
      nome: 'Rua Doutor Ovande do Amaral, 357',
      bairro: 'Jardim das Américas',
    });
    expect(parseStopName('Av. João Gualberto - Passeio Público - Centro')).toEqual({
      nome: 'Av. João Gualberto - Passeio Público',
      bairro: 'Centro',
    });
  });

  it('plain names stay whole, with collapsed spaces', () => {
    expect(parseStopName('Estação Tubo  Cel. Luiz José dos Santos')).toEqual({
      nome: 'Estação Tubo Cel. Luiz José dos Santos',
    });
    expect(parseStopName('Bosque Alemão')).toEqual({ nome: 'Bosque Alemão' });
  });

  it('street-side suffix like "Ld" is not mistaken for a line code', () => {
    expect(parseStopName('Av. Juscelino Kubitschek De Oliveira - Ld, 7822 - Cidade Industrial de Curitiba')).toEqual({
      nome: 'Av. Juscelino Kubitschek De Oliveira - Ld, 7822',
      bairro: 'Cidade Industrial de Curitiba',
    });
  });
});

describe('mapCategory', () => {
  it.each([
    ['LIGEIRÃO', 'ligeirao'],
    ['EXPRESSO', 'expresso'],
    ['LINHA DIRETA', 'ligeirinho'],
    ['INTERBAIRROS', 'interbairros'],
    ['ALIMENTADOR', 'alimentador'],
    ['TRONCAL', 'troncal'],
    ['CONVENCIONAL', 'convencional'],
    ['MADRUGUEIRO', 'madrugueiro'],
    ['JARDINEIRA', 'turismo'],
    ['SERVIÇO AOS OPERADORES', 'operacional'],
    [null, 'convencional'],
  ])('%s -> %s', (input, expected) => {
    expect(mapCategory(input)).toBe(expected);
  });
});

describe('simplifyPath', () => {
  it('drops collinear points and keeps the ends', () => {
    const path = [
      [-25.4, -49.2],
      [-25.40001, -49.2],
      [-25.40002, -49.2],
      [-25.41, -49.2],
    ];
    expect(simplifyPath(path, 8)).toEqual([
      [-25.4, -49.2],
      [-25.41, -49.2],
    ]);
  });

  it('keeps a real corner', () => {
    const path = [
      [-25.4, -49.2],
      [-25.41, -49.2],
      [-25.41, -49.21],
    ];
    expect(simplifyPath(path, 8)).toHaveLength(3);
  });
});

describe('buildDataset', () => {
  const stops = [
    {
      num: 1,
      nome_ponto: 'Terminal Cabral - 203 - Santa Cândida / Capão Raso',
      tipo: 'Plataforma',
      lat: -25.4,
      lon: -49.25,
    },
    { num: 2, nome_ponto: 'Terminal Cabral - 216 - Cabral / Portão', tipo: 'Plataforma', lat: -25.4002, lon: -49.2502 },
    { num: 3, nome_ponto: 'Estação Tubo Central', tipo: 'Estação tubo', lat: -25.43, lon: -49.27 },
    { num: 4, nome_ponto: 'Rua X, 10 - Centro', tipo: 'Placa em poste', lat: -25.44, lon: -49.28 },
  ];
  const lines = [
    {
      cod: '203',
      nome_linha: 'STA. CÂNDIDA / C. RASO',
      categoria_servico: 'EXPRESSO',
      paths: [
        [
          [-25.44, -49.28],
          [-25.43, -49.27],
          [-25.4, -49.25],
        ],
      ],
    },
    {
      cod: '999',
      nome_linha: 'SEM PARADAS',
      categoria_servico: 'CONVENCIONAL',
      paths: [
        [
          [-25.5, -49.3],
          [-25.6, -49.3],
        ],
      ],
    },
  ];
  const stopLines = [
    { num: 1, cod: '203', sentido: 'Terminal Capão Raso', seq: 1 },
    { num: 3, cod: '203', sentido: 'Terminal Capão Raso', seq: 2 },
    { num: 4, cod: '203', sentido: 'Terminal Capão Raso', seq: 3 },
    { num: 4, cod: '203', sentido: 'Terminal Cabral', seq: 1 },
    { num: 2, cod: '203', sentido: 'Terminal Cabral', seq: 2 },
  ];
  const terminals = [{ nome: 'Cabral', bairro: 'Cabral' }];
  const { dataset, stats } = buildDataset({ stops, lines, stopLines, terminals });

  it('merges terminal platforms into one stop with the terminal bairro', () => {
    const terminal = dataset.stops.find((s) => s.tipo === 'terminal');
    expect(terminal).toMatchObject({
      id: 'terminal-cabral',
      nome: 'Terminal Cabral',
      bairro: 'Cabral',
      linhas: ['203'],
    });
    expect(dataset.stops.filter((s) => s.tipo === 'terminal')).toHaveLength(1);
  });

  it('orders stops per direction and orients the path to start at the first ida stop', () => {
    const line = dataset.lines.find((l) => l.codigo === '203');
    // ida = primeiro sentido em ordem alfabética ("Terminal Cabral" < "Terminal Capão Raso")
    expect(line.paradasIda).toEqual(['4', 'terminal-cabral']);
    expect(line.paradasVolta).toEqual(['terminal-cabral', '3', '4']);
    expect(line.terminalOrigem).toBe('Terminal Capão Raso');
    expect(line.terminalDestino).toBe('Terminal Cabral');
    expect(line.categoria).toBe('expresso');
    expect(line.trajeto[0]).toEqual([-25.44, -49.28]);
  });

  it('drops lines without stops and reports it', () => {
    expect(dataset.lines.map((l) => l.codigo)).toEqual(['203']);
    expect(stats.linesWithoutStops).toEqual(['999']);
  });
});
