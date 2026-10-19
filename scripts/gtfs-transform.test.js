/* global describe, it, expect */
const {
  parseCsv,
  readTable,
  summarizeSchedule,
  cleanHeadsign,
  pickPatterns,
  mapStopId,
  buildNetwork,
  validate,
} = require('./gtfs-transform.cjs');

const hm = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

describe('parseCsv', () => {
  it('handles BOM, CRLF, quotes, escaped quotes, empty fields and newlines inside quotes', () => {
    expect(parseCsv('﻿a,b\r\n"x, ""y""",\r\n"multi\nline",z\n')).toEqual([
      ['a', 'b'],
      ['x, "y"', ''],
      ['multi\nline', 'z'],
    ]);
  });

  it('keeps the last row without a trailing newline and skips blank lines', () => {
    expect(parseCsv('a,b\n\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('readTable resolves columns by header name and rejects missing ones', () => {
    const t = readTable('stop_id,stop_code\n10,100\n');
    expect(t.rows[0][t.col('stop_code')]).toBe('100');
    expect(() => t.col('stop_name')).toThrow('stop_name');
  });
});

describe('summarizeSchedule', () => {
  it('spans first to last departure (24:15 shown as 00:15) and takes the median peak gap', () => {
    const times = ['05:30', '06:10', '06:40', '07:10', '24:15'].map(hm);
    expect(summarizeSchedule([times])).toEqual({
      horarioFuncionamento: 'Dias úteis, 05:30–00:15',
      frequenciaMinutosPico: 30,
    });
  });

  it('uses the direction with more peak departures', () => {
    const out = summarizeSchedule([['06:00', '08:00'].map(hm), ['06:00', '06:10', '06:20'].map(hm)]);
    expect(out.frequenciaMinutosPico).toBe(10);
  });

  it('other trips (variants) widen the operating hours but not the peak frequency', () => {
    expect(summarizeSchedule([['06:00', '06:30'].map(hm)], ['05:00', '06:05', '06:10'].map(hm))).toEqual({
      horarioFuncionamento: 'Dias úteis, 05:00–06:30',
      frequenciaMinutosPico: 30,
    });
  });

  it('a single peak departure gives no frequency; no departures give nothing', () => {
    expect(summarizeSchedule([['05:00', '06:30', '10:00'].map(hm)])).toEqual({
      horarioFuncionamento: 'Dias úteis, 05:00–10:00',
    });
    expect(summarizeSchedule([[]])).toEqual({});
  });
});

describe('cleanHeadsign', () => {
  it('drops parenthesised notes and falls back on loop labels', () => {
    expect(cleanHeadsign('Terminal Cabral (Via Centro)', 'x')).toBe('Terminal Cabral');
    expect(cleanHeadsign('Horário', 'Praça Tiradentes')).toBe('Praça Tiradentes');
    expect(cleanHeadsign('Anti-horário', 'Praça Tiradentes')).toBe('Praça Tiradentes');
    expect(cleanHeadsign('Sentido Horário', 'Praça Tiradentes')).toBe('Praça Tiradentes');
    expect(cleanHeadsign('Circular Centro', 'Praça Tiradentes')).toBe('Praça Tiradentes');
    expect(cleanHeadsign('', 'Praça Tiradentes')).toBe('Praça Tiradentes');
  });
});

describe('pickPatterns', () => {
  const A = [-25.4, -49.3];
  const B = [-25.4, -49.285];
  const trip = (id, shape) => ({ id, shape, headsign: '' });

  it('main shape has the most trips; the return is the shape with reversed ends', () => {
    const ends = { t1: [A, B], t2: [A, B], t3: [B, A], t4: [A, [-25.41, -49.29]] };
    const p = pickPatterns([trip('t1', 's1'), trip('t2', 's1'), trip('t4', 's3'), trip('t3', 's2')], (id) => ({
      first: ends[id][0],
      last: ends[id][1],
    }));
    expect(p.main.shape).toBe('s1');
    expect(p.back.shape).toBe('s2');
    expect(p.loop).toBe(false);
    expect(p.coverage).toBe(0.75);
  });

  it('ties go to the lower numeric shape id', () => {
    const p = pickPatterns([trip('t1', '10'), trip('t2', '9')], () => ({ first: A, last: B }));
    expect(p.main.shape).toBe('9');
  });

  it('a closed loop has a single direction', () => {
    const p = pickPatterns([trip('t1', 's1'), trip('t2', 's2')], (id) =>
      id === 't1' ? { first: A, last: [-25.4001, -49.3001] } : { first: B, last: A },
    );
    expect(p.back).toBeNull();
    expect(p.loop).toBe(true);
  });
});

describe('mapStopId', () => {
  const geoIds = new Set(['100', 'terminal-a']);
  const terminals = [{ id: 'terminal-a', pos: [-25.4, -49.3] }];

  it('matches by stop_code first, even for a tube platform with a parent station', () => {
    expect(mapStopId({ code: '100', parent: 'P', pos: [-25.4, -49.3] }, geoIds, terminals)).toEqual({
      id: '100',
      via: 'code',
    });
  });

  it('a terminal platform maps to the nearest merged terminal within 300 m', () => {
    const m = mapStopId({ code: 'T1', parent: 'P', pos: [-25.4001, -49.3001] }, geoIds, terminals);
    expect(m).toMatchObject({ id: 'terminal-a', via: 'terminal' });
  });

  it('gives null beyond 300 m or without a parent station', () => {
    expect(mapStopId({ code: 'T1', parent: 'P', pos: [-25.41, -49.3] }, geoIds, terminals).id).toBeNull();
    expect(mapStopId({ code: 'T1', parent: null, pos: [-25.4, -49.3] }, geoIds, terminals).id).toBeNull();
    expect(mapStopId(undefined, geoIds, terminals).id).toBeNull();
  });
});

// Rede mínima: terminal A → 100 → 101 → terminal B, ~500 m entre paradas, ao longo de -25.40.
const csv = (lines) => readTable(lines.join('\n'));
const geo = {
  source: 'test',
  stops: [
    { id: 'terminal-a', nome: 'Terminal A', tipo: 'terminal', latitude: -25.4, longitude: -49.3, linhas: [] },
    { id: '100', nome: 'Parada 100', tipo: 'comum', latitude: -25.4, longitude: -49.295, linhas: [] },
    { id: '101', nome: 'Parada 101', tipo: 'comum', latitude: -25.4, longitude: -49.29, linhas: [] },
    { id: 'terminal-b', nome: 'Terminal B', tipo: 'terminal', latitude: -25.4, longitude: -49.285, linhas: [] },
    { id: '200', nome: 'Parada 200', tipo: 'comum', latitude: -25.41, longitude: -49.3, linhas: [] },
    { id: '999', nome: 'Parada 999', tipo: 'comum', latitude: -25.45, longitude: -49.35, linhas: [] },
  ],
  lines: [
    {
      id: 'linha-203',
      codigo: '203',
      nome: 'SANTA CÂNDIDA / CAPÃO RASO',
      categoria: 'expresso',
      terminalOrigem: 'Horário',
      terminalDestino: 'Horário',
      trajeto: [
        [-25.4, -49.3],
        [-25.4, -49.29],
      ],
      paradasIda: ['terminal-a', '100'],
      paradasVolta: [],
    },
    {
      id: 'linha-500',
      codigo: '500',
      nome: 'MADRUGUEIRO',
      categoria: 'madrugueiro',
      terminalOrigem: 'Parada 200',
      terminalDestino: 'Sentido Horário',
      trajeto: [
        [-25.41, -49.3],
        [-25.4, -49.3],
      ],
      paradasIda: ['200', 'terminal-a'],
      paradasVolta: [],
    },
    {
      id: 'linha-202',
      codigo: '202',
      nome: 'EXTINTA',
      categoria: 'convencional',
      terminalOrigem: '',
      terminalDestino: '',
      trajeto: [
        [-25.45, -49.35],
        [-25.4, -49.295],
      ],
      paradasIda: ['999', '100'],
      paradasVolta: [],
    },
    {
      id: 'linha-300',
      codigo: '300',
      nome: 'SÓ IDA NO GTFS',
      categoria: 'convencional',
      terminalOrigem: 'Parada 100',
      terminalDestino: 'Parada 101',
      trajeto: [
        [-25.4, -49.295],
        [-25.4, -49.29],
      ],
      paradasIda: ['100', '101'],
      paradasVolta: ['101', '100'],
    },
    {
      id: 'linha-401',
      codigo: '401',
      nome: 'PADRÃO FRACO',
      categoria: 'interbairros',
      terminalOrigem: 'Parada 100',
      terminalDestino: 'Parada 101',
      trajeto: [
        [-25.4, -49.295],
        [-25.4, -49.29],
      ],
      paradasIda: ['100', '101'],
      paradasVolta: ['101', '100'],
    },
    {
      id: 'linha-607',
      codigo: '607',
      nome: 'MAPEAMENTO BAIXO',
      categoria: 'alimentador',
      terminalOrigem: 'Parada 101',
      terminalDestino: 'Terminal B',
      trajeto: [
        [-25.4, -49.29],
        [-25.4, -49.285],
      ],
      paradasIda: ['101', 'terminal-b'],
      paradasVolta: [],
    },
  ],
};
const linhas = [
  { COD: '203', NOME: 'SANTA CÂNDIDA / CAPÃO RASO', CATEGORIA_SERVICO: 'EXPRESSO' },
  { COD: '500', NOME: 'MADRUGUEIRO', CATEGORIA_SERVICO: 'MADRUGUEIRO' },
  { COD: '300', NOME: 'SÓ IDA NO GTFS', CATEGORIA_SERVICO: 'CONVENCIONAL' },
  { COD: '401', NOME: 'PADRÃO FRACO', CATEGORIA_SERVICO: 'INTERBAIRROS' },
  // No getLinhas, sem viagem no GTFS e fora do GeoCuritiba.
  { COD: 'X43', NOME: 'SEM VIAGEM', CATEGORIA_SERVICO: 'LIGEIRÃO' },
  { COD: '607', NOME: 'MAPEAMENTO BAIXO', CATEGORIA_SERVICO: 'ALIMENTADOR' },
  { COD: 'X37', NOME: 'LIGEIRÃO X37', CATEGORIA_SERVICO: 'LIGEIRÃO' },
];
const gtfs = {
  routes: csv([
    'route_id,route_short_name',
    'r203,203',
    'r300,300',
    'r401,401',
    'r607,607',
    'rX43,X43',
    'rX37,X37',
    'r888,888',
  ]),
  stops: csv([
    'stop_id,stop_code,stop_name,stop_lat,stop_lon,parent_station',
    'sPA,,Terminal A,-25.4,-49.3,',
    'sA1,T1,Terminal A plataforma,-25.4001,-49.3001,sPA',
    's100,100,Parada 100,-25.4,-49.295,',
    's101,101,Parada 101,-25.4,-49.29,',
    'sPB,,Terminal B,-25.4,-49.285,',
    'sB1,T2,Terminal B plataforma 1,-25.4001,-49.2851,sPB',
    'sB2,T3,Terminal B plataforma 2,-25.4002,-49.2852,sPB',
    'sX1,777,Fora do dataset,-25.43,-49.33,',
    'sX2,778,Fora do dataset 2,-25.431,-49.331,',
  ]),
  trips: csv([
    'route_id,service_id,trip_id,trip_headsign,shape_id',
    'r203,1,t1,Terminal B (Horário),sh1',
    'r203,1,t2,Terminal B,sh1',
    'r203,1,t3,Terminal A,sh2',
    'r203,2,t4,Sábado,sh1',
    'r607,1,t5,Terminal B,sh3',
    'rX37,1,t6,Terminal B,sh1',
    'r888,1,t7,Terminal B,sh1',
    // Linha aberta só de ida no GTFS, com volta no GeoCuritiba.
    'r300,1,t9,Terminal B,sh1',
    // Ida (2) + volta (1) = 3 de 7 viagens; o resto são trechos de outros shapes.
    'r401,1,u1,Terminal B,sh1',
    'r401,1,u2,Terminal B,sh1',
    'r401,1,u3,Terminal A,sh2',
    'r401,1,u4,Trecho,sh8',
    'r401,1,u5,Trecho,sh8',
    'r401,1,u6,Trecho,sh9',
    'r401,1,u7,Trecho,sh9',
    // Variante no meio do pico: não pode entrar na frequência da 203.
    'r203,1,t8,Terminal B,sh9',
  ]),
  stopTimes: csv([
    'trip_id,departure_time,stop_id,stop_sequence',
    ...['t1:06:00', 't2:06:30', 't6:06:10', 't7:06:20', 't9:06:40', 'u1:06:00', 'u2:06:05'].flatMap((s) => {
      const [t, time] = [s.slice(0, 2), s.slice(3)];
      return [`${t},${time}:00,sA1,1`, `${t},${time}:00,s100,2`, `${t},${time}:00,s101,3`, `${t},${time}:00,sB1,4`];
    }),
    't3,07:00:00,sB1,1',
    't3,07:00:00,sB2,2',
    't3,07:05:00,s101,3',
    't3,07:10:00,s100,4',
    't3,07:15:00,sA1,5',
    't8,06:05:00,sA1,1',
    't8,06:10:00,s100,2',
    'u3,07:00:00,sB1,1',
    'u3,07:10:00,sA1,2',
    't5,08:00:00,sX1,1',
    't5,08:05:00,sX2,2',
    't5,08:10:00,s101,3',
  ]),
  shapes: csv([
    'shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence',
    'sh1,-25.4,-49.3,1',
    'sh1,-25.4,-49.285,2',
    'sh2,-25.4,-49.285,3',
    'sh2,-25.4,-49.3,4',
    'sh3,-25.43,-49.33,5',
    'sh3,-25.4,-49.29,6',
  ]),
};

describe('buildNetwork', () => {
  const { dataset, report } = buildNetwork({ geo, linhas, gtfs });
  const line = (code) => dataset.lines.find((l) => l.codigo === code);
  const stop = (id) => dataset.stops.find((s) => s.id === id);

  it('builds both directions of a well-mapped line from the GTFS, with schedule', () => {
    expect(line('203')).toEqual({
      id: 'linha-203',
      codigo: '203',
      nome: 'SANTA CÂNDIDA / CAPÃO RASO',
      categoria: 'expresso',
      terminalOrigem: 'Terminal A',
      terminalDestino: 'Terminal B',
      trajetoIda: [
        [-25.4, -49.3],
        [-25.4, -49.285],
      ],
      trajetoVolta: [
        [-25.4, -49.285],
        [-25.4, -49.3],
      ],
      paradasIda: ['terminal-a', '100', '101', 'terminal-b'],
      // As duas plataformas do terminal B colapsam numa parada só.
      paradasVolta: ['terminal-b', '101', '100', 'terminal-a'],
      horarioFuncionamento: 'Dias úteis, 06:00–07:00',
      frequenciaMinutosPico: 30,
    });
  });

  it('keeps a line without GTFS trips whole from the GeoCuritiba, without trajetoVolta', () => {
    // terminalDestino 'Sentido Horário' no GeoCuritiba vira o nome da última parada.
    expect(line('500')).toEqual({
      id: 'linha-500',
      codigo: '500',
      nome: 'MADRUGUEIRO',
      categoria: 'madrugueiro',
      terminalOrigem: 'Parada 200',
      terminalDestino: 'Terminal A',
      trajetoIda: geo.lines.find((l) => l.codigo === '500').trajeto,
      paradasIda: ['200', 'terminal-a'],
      paradasVolta: [],
    });
    expect(report.fallback).toContainEqual({ code: '500', reason: 'sem viagens no GTFS' });
  });

  it('falls back to the GeoCuritiba geometry when the GTFS stops do not map, keeping the schedule', () => {
    expect(line('607')).toMatchObject({
      trajetoIda: geo.lines.find((l) => l.codigo === '607').trajeto,
      paradasIda: ['101', 'terminal-b'],
      horarioFuncionamento: 'Dias úteis, 08:00–08:00',
    });
    expect(line('607').trajetoVolta).toBeUndefined();
    expect(report.fallback).toContainEqual({ code: '607', reason: 'mapeamento 33%' });
  });

  it('keeps the GeoCuritiba line whole when the GTFS lost its return direction', () => {
    expect(line('300')).toMatchObject({ paradasIda: ['100', '101'], paradasVolta: ['101', '100'] });
    expect(line('300').trajetoVolta).toBeUndefined();
    expect(report.fallback).toContainEqual({ code: '300', reason: 'um sentido só no GTFS' });
  });

  it('falls back when the chosen ida/volta cover under half the weekday trips, without peak frequency', () => {
    expect(line('401')).toMatchObject({ paradasIda: ['100', '101'], paradasVolta: ['101', '100'] });
    expect(line('401').trajetoVolta).toBeUndefined();
    expect(line('401').horarioFuncionamento).toBe('Dias úteis, 06:00–07:00');
    expect(line('401').frequenciaMinutosPico).toBeUndefined();
    expect(report.fallback).toContainEqual({ code: '401', reason: 'padrão cobre 43% das viagens' });
    expect(report.weakPatterns).toEqual([{ code: '401', coverage: 0.43 }]);
  });

  it('reports getLinhas lines with no GTFS trips and no GeoCuritiba line', () => {
    expect(line('X43')).toBeUndefined();
    expect(report.untraced).toEqual(['X43']);
  });

  it('removes lines missing from getLinhas and ignores GTFS lines outside it', () => {
    expect(line('202')).toBeUndefined();
    expect(report.removed).toEqual(['202']);
    expect(line('888')).toBeUndefined();
    expect(report.ignoredGtfs).toEqual(['888']);
  });

  it('adds a getLinhas + GTFS line missing from the GeoCuritiba, with its category', () => {
    expect(line('X37')).toMatchObject({
      id: 'linha-X37',
      nome: 'LIGEIRÃO X37',
      categoria: 'ligeirao',
      terminalOrigem: 'Terminal A',
      terminalDestino: 'Terminal B',
      paradasIda: ['terminal-a', '100', '101', 'terminal-b'],
      paradasVolta: [],
    });
    expect(report.added).toEqual(['X37']);
  });

  it('recomputes stop.linhas from the final lines and drops orphan stops', () => {
    expect(stop('terminal-a').linhas).toEqual(['203', '500', 'X37']);
    expect(stop('100').linhas).toEqual(['203', '300', '401', 'X37']);
    expect(stop('999')).toBeUndefined();
    expect(report.stopsDropped).toBe(1);
  });

  it('reports coverage and stop mapping', () => {
    expect(report.counts).toMatchObject({ getLinhas: 7, getLinhasWithTrips: 5, final: 6, fromGtfs: 2 });
    // Conta as viagens representativas de todas as linhas do GTFS, inclusive a 888 ignorada.
    expect(report.stopMap).toMatchObject({ byCode: 13, byTerminal: 15, total: 30 });
    expect(report.stopsNearShape.near).toBe(report.stopsNearShape.total);
  });

  it('validate applies the thresholds and flags missing required ids', () => {
    expect(validate(dataset, report, { requiredLines: ['203'], requiredStops: ['terminal-a'] })).toEqual([
      'só 2/6 linhas vieram do GTFS',
    ]);
    expect(validate(dataset, report, { requiredLines: ['999'], requiredStops: ['nope'] }).slice(0, 2)).toEqual([
      'linha obrigatória ausente: 999',
      'parada obrigatória ausente: nope',
    ]);
  });
});
