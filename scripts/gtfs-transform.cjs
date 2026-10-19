// Funções puras do importador GTFS (scripts/import-gtfs.mjs). Combina o GTFS público da URBS
// com a rede do GeoCuritiba (src/data/geocuritiba.json). CommonJS pelo mesmo motivo do
// geocuritiba-transform.cjs.
//
// O que o GTFS da URBS (feed 20260818) tem de peculiar, e por isso a lógica abaixo:
// - direction_id não separa ida e volta: a 203 tem os dois sentidos no direction_id 0, cada um
//   com seu shape. Os sentidos saem dos dois traçados mais usados com terminais invertidos.
// - service_id segue o código DIA do WebService (1 = dia útil); os dias do calendar.txt não
//   refletem isso (o serviço 1 marca todos os dias).
// - ~50 rotas não têm viagem nenhuma: essas linhas ficam como estão no GeoCuritiba.
// - stop_code é o número da parada da URBS, o mesmo id do GeoCuritiba; plataformas de terminal
//   apontam para a estação-mãe (parent_station) e viram o terminal fundido do GeoCuritiba.

const { mapCategory, simplifyPath, segmentDistanceMeters } = require('./geocuritiba-transform.cjs');

const WEEKDAY_SERVICE = '1';
const TERMINAL_RADIUS_M = 300;
const CLOSED_LOOP_M = 300;
const REVERSED_ENDS_M = 800;
const MIN_MAPPED_RATIO = 0.9;
// Ida + volta escolhidas precisam cobrir metade das viagens de dia útil. Abaixo disso a linha é
// feita de trechos (a 022, Inter 2, tem 6 shapes, um por perna) e o par escolhido não é ida/volta.
const MIN_PATTERN_COVERAGE = 0.5;
const NEAR_SHAPE_M = 100;

const distMeters = (a, b) => segmentDistanceMeters(a, b, b);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Tabela GTFS: colunas pelo nome do cabeçalho, linhas como arrays (stop_times tem ~300 mil).
function readTable(text) {
  const [header = [], ...rows] = parseCsv(text);
  const idx = new Map(header.map((h, i) => [h.trim(), i]));
  const col = (name) => {
    if (!idx.has(name)) throw new Error(`coluna ausente no GTFS: ${name}`);
    return idx.get(name);
  };
  return { col, rows };
}

const toMinutes = (hms) => {
  const [h, m] = String(hms).split(':').map(Number);
  return h * 60 + m;
};
const pad = (n) => String(n).padStart(2, '0');
// GTFS escreve viagens depois da meia-noite como 24:15; na tela vira 00:15.
const fmtTime = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

const median = (sorted) => (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2;

// groups: minutos da 1ª partida das viagens de dia útil de cada sentido (só o traçado
// representativo); others: as demais viagens (variantes), que só contam no horário.
function summarizeSchedule(groups, others = []) {
  const all = [...groups.flat(), ...others];
  if (!all.length) return {};
  const out = {
    horarioFuncionamento: `Dias úteis, ${fmtTime(Math.min(...all))}–${fmtTime(Math.max(...all))}`,
  };
  const peak = groups
    .map((g) => g.filter((m) => m >= 360 && m < 540).sort((a, b) => a - b))
    .sort((a, b) => b.length - a.length)[0];
  if (peak.length >= 2) {
    const gaps = peak
      .slice(1)
      .map((m, i) => m - peak[i])
      .sort((a, b) => a - b);
    out.frequenciaMinutosPico = Math.max(1, Math.round(median(gaps)));
  }
  return out;
}

// Rótulo de sentido de linha circular, que não diz para onde o ônibus vai.
const LOOP_LABEL = /^(sentido )?(anti[- ]?)?hor[aá]rio$/i;

function cleanHeadsign(raw, fallback) {
  const s = String(raw ?? '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return !s || LOOP_LABEL.test(s) || /circular/i.test(s) ? fallback : s;
}

const compareIds = (a, b) => {
  const [x, y] = [Number(a), Number(b)];
  return Number.isFinite(x) && Number.isFinite(y) ? x - y : String(a).localeCompare(String(b));
};

// Traçado principal = shape com mais viagens (empate: menor id). O outro sentido é o shape mais
// usado que começa onde o principal termina e termina onde ele começa. Traçado fechado (anel) ou
// sem par = linha de um sentido só.
function pickPatterns(trips, endsOf) {
  const byShape = new Map();
  for (const t of trips) {
    if (!byShape.has(t.shape)) byShape.set(t.shape, { shape: t.shape, trips: [] });
    byShape.get(t.shape).trips.push(t);
  }
  const ranked = [...byShape.values()].sort((a, b) => b.trips.length - a.trips.length || compareIds(a.shape, b.shape));
  const main = ranked[0];
  const e1 = main && endsOf(main.trips[0].id);
  if (!e1) return null;
  const loop = distMeters(e1.first, e1.last) < CLOSED_LOOP_M;
  let back = null;
  if (!loop) {
    back =
      ranked.slice(1).find((g) => {
        const e = endsOf(g.trips[0].id);
        return e && distMeters(e.first, e1.last) < REVERSED_ENDS_M && distMeters(e.last, e1.first) < REVERSED_ENDS_M;
      }) ?? null;
  }
  const used = main.trips.length + (back?.trips.length ?? 0);
  return { main, back, loop, coverage: used / trips.length };
}

// Id da parada no nosso dataset: o stop_code quando existe lá; plataforma de terminal vira o
// terminal fundido mais próximo. stop_code vem antes: plataforma de tubo também tem parent.
function mapStopId(gStop, geoIds, terminals) {
  if (!gStop) return { id: null };
  if (geoIds.has(gStop.code)) return { id: gStop.code, via: 'code' };
  if (gStop.parent) {
    let best = null;
    for (const t of terminals) {
      const d = distMeters(gStop.pos, t.pos);
      if (d <= TERMINAL_RADIUS_M && (!best || d < best.d)) best = { id: t.id, d };
    }
    if (best) return { id: best.id, via: 'terminal', d: best.d };
  }
  return { id: null };
}

const dedupeConsecutive = (ids) => ids.filter((id, i) => id !== ids[i - 1]);

const mostCommon = (values) => {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0];
};

function nearestSegmentMeters(point, path) {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) best = Math.min(best, segmentDistanceMeters(point, path[i], path[i + 1]));
  return best;
}

function buildNetwork({ geo, linhas, gtfs }) {
  const { routes, trips, stops, stopTimes, shapes } = gtfs;
  const report = {
    removed: [],
    added: [],
    fallback: [],
    ignoredGtfs: [],
    untraced: [],
    weakPatterns: [],
    stopMap: { total: 0, byCode: 0, byTerminal: 0, maxTerminalDist: 0, misses: new Map() },
    stopsNearShape: { near: 0, total: 0 },
    singleDirection: 0,
    weekdayTrips: 0,
  };

  const geoStopById = new Map(geo.stops.map((s) => [s.id, s]));
  const geoIds = new Set(geoStopById.keys());
  const terminals = geo.stops
    .filter((s) => s.tipo === 'terminal')
    .map((s) => ({ id: s.id, pos: [s.latitude, s.longitude] }));
  const linhaByCode = linhas ? new Map(linhas.map((l) => [String(l.COD).trim(), l])) : null;

  const codeByRoute = new Map(
    routes.rows.map((r) => [r[routes.col('route_id')], r[routes.col('route_short_name')].trim()]),
  );

  const gStops = new Map();
  for (const r of stops.rows) {
    gStops.set(r[stops.col('stop_id')], {
      code: r[stops.col('stop_code')].trim(),
      name: r[stops.col('stop_name')].trim(),
      pos: [Number(r[stops.col('stop_lat')]), Number(r[stops.col('stop_lon')])],
      parent: r[stops.col('parent_station')]?.trim() || null,
    });
  }

  const tripsByCode = new Map();
  const [cRoute, cService, cTrip, cHead, cShape] = [
    'route_id',
    'service_id',
    'trip_id',
    'trip_headsign',
    'shape_id',
  ].map(trips.col);
  for (const r of trips.rows) {
    if (r[cService] !== WEEKDAY_SERVICE) continue;
    const code = codeByRoute.get(r[cRoute]);
    if (!code) continue;
    if (!tripsByCode.has(code)) tripsByCode.set(code, []);
    tripsByCode.get(code).push({ id: r[cTrip], shape: r[cShape], headsign: r[cHead] });
    report.weekdayTrips++;
  }

  // 1ª passada no stop_times: extremos e 1ª partida de cada viagem.
  const [sTrip, sDep, sStop, sSeq] = ['trip_id', 'departure_time', 'stop_id', 'stop_sequence'].map(stopTimes.col);
  const ends = new Map();
  for (const r of stopTimes.rows) {
    const seq = Number(r[sSeq]);
    const e = ends.get(r[sTrip]);
    if (!e) ends.set(r[sTrip], { minSeq: seq, first: r[sStop], dep: r[sDep], maxSeq: seq, last: r[sStop] });
    else {
      if (seq < e.minSeq) Object.assign(e, { minSeq: seq, first: r[sStop], dep: r[sDep] });
      if (seq > e.maxSeq) Object.assign(e, { maxSeq: seq, last: r[sStop] });
    }
  }
  const posOf = (stopId) => gStops.get(stopId)?.pos;
  const endsOf = (tripId) => {
    const e = ends.get(tripId);
    const [first, last] = e ? [posOf(e.first), posOf(e.last)] : [];
    return first && last ? { first, last } : null;
  };

  const patterns = new Map();
  for (const [code, list] of tripsByCode) {
    const p = pickPatterns(list, endsOf);
    if (!p) continue;
    patterns.set(code, p);
    if (p.coverage < MIN_PATTERN_COVERAGE)
      report.weakPatterns.push({ code, coverage: Math.round(p.coverage * 100) / 100 });
  }

  // 2ª passada: sequência completa só das viagens representativas.
  const repIds = new Set();
  const neededShapes = new Set();
  for (const p of patterns.values())
    for (const g of [p.main, p.back].filter(Boolean)) {
      repIds.add(g.trips[0].id);
      neededShapes.add(g.shape);
    }
  const seqByTrip = new Map();
  for (const r of stopTimes.rows) {
    if (!repIds.has(r[sTrip])) continue;
    if (!seqByTrip.has(r[sTrip])) seqByTrip.set(r[sTrip], []);
    seqByTrip.get(r[sTrip]).push([Number(r[sSeq]), r[sStop]]);
  }
  const pointsByShape = new Map();
  const [shId, shLat, shLon, shSeq] = ['shape_id', 'shape_pt_lat', 'shape_pt_lon', 'shape_pt_sequence'].map(shapes.col);
  for (const r of shapes.rows) {
    if (!neededShapes.has(r[shId])) continue;
    if (!pointsByShape.has(r[shId])) pointsByShape.set(r[shId], []);
    pointsByShape.get(r[shId]).push([Number(r[shSeq]), Number(r[shLat]), Number(r[shLon])]);
  }
  const pathOf = (shape) =>
    simplifyPath(
      (pointsByShape.get(shape) ?? []).sort((a, b) => a[0] - b[0]).map(([, lat, lon]) => [lat, lon]),
      8,
    );

  const direction = (group) => {
    const seq = (seqByTrip.get(group.trips[0].id) ?? []).sort((a, b) => a[0] - b[0]).map(([, id]) => id);
    const mapped = [];
    for (const stopId of seq) {
      const g = gStops.get(stopId);
      const m = mapStopId(g, geoIds, terminals);
      report.stopMap.total++;
      if (m.via === 'code') report.stopMap.byCode++;
      else if (m.via === 'terminal') {
        report.stopMap.byTerminal++;
        report.stopMap.maxTerminalDist = Math.max(report.stopMap.maxTerminalDist, Math.round(m.d));
      } else {
        const key = g ? `${g.code} ${g.name}` : stopId;
        report.stopMap.misses.set(key, (report.stopMap.misses.get(key) ?? 0) + 1);
      }
      if (m.id) mapped.push(m.id);
    }
    const paradas = dedupeConsecutive(mapped);
    const lastName = geoStopById.get(paradas[paradas.length - 1])?.nome;
    return {
      total: seq.length,
      hits: mapped.length,
      paradas,
      trajeto: pathOf(group.shape),
      headsign: cleanHeadsign(mostCommon(group.trips.map((t) => t.headsign)), lastName),
    };
  };

  const gtfsLine = new Map();
  for (const [code, p] of patterns) {
    const ida = direction(p.main);
    const volta = p.back ? direction(p.back) : null;
    if (!volta) report.singleDirection++;
    const dirs = [ida, volta].filter(Boolean);
    const total = dirs.reduce((a, d) => a + d.total, 0);
    const hits = dirs.reduce((a, d) => a + d.hits, 0);
    const ok =
      total > 0 &&
      hits / total >= MIN_MAPPED_RATIO &&
      dirs.every((d) => d.paradas.length >= 2 && d.trajeto.length >= 2);

    // A frequência sai só das viagens dos traçados representativos: em linha circular, horário e
    // anti-horário (e variantes) saem do mesmo ponto e, misturados, davam "pico a cada 1 min".
    const depsOf = (list) =>
      list
        .map((t) => ends.get(t.id)?.dep)
        .filter(Boolean)
        .map(toMinutes);
    const repShapes = new Set([p.main.shape, p.back?.shape]);
    const groups = [p.main, p.back].filter(Boolean).map((g) => depsOf(g.trips));
    const others = depsOf(tripsByCode.get(code).filter((t) => !repShapes.has(t.shape)));
    const schedule = summarizeSchedule(groups, others);
    const weak = p.coverage < MIN_PATTERN_COVERAGE;
    // Padrão fraco: a frequência dos dois trechos escolhidos não é a da linha.
    if (weak) delete schedule.frequenciaMinutosPico;
    gtfsLine.set(code, {
      ok,
      weak,
      coverage: p.coverage,
      // Linha aberta com um sentido só: o feed perdeu a volta (a 184 tem 3 viagens, só de ida).
      oneWay: !p.back && !p.loop,
      ratio: total ? hits / total : 0,
      ida,
      volta,
      schedule,
    });
  }

  const nameOf = (id) => geoStopById.get(id)?.nome;
  const fromGtfs = (base, g) => {
    for (const [dir, path] of [
      [g.ida, g.ida.trajeto],
      [g.volta, g.volta?.trajeto],
    ])
      if (dir)
        for (const id of dir.paradas) {
          const s = geoStopById.get(id);
          report.stopsNearShape.total++;
          if (nearestSegmentMeters([s.latitude, s.longitude], path) <= NEAR_SHAPE_M) report.stopsNearShape.near++;
        }
    return {
      ...base,
      terminalOrigem: g.volta ? g.volta.headsign : (nameOf(g.ida.paradas[0]) ?? base.terminalOrigem),
      terminalDestino: g.ida.headsign ?? base.terminalDestino,
      trajetoIda: g.ida.trajeto,
      ...(g.volta ? { trajetoVolta: g.volta.trajeto } : {}),
      paradasIda: g.ida.paradas,
      paradasVolta: g.volta ? g.volta.paradas : [],
      ...g.schedule,
    };
  };

  const lines = [];
  for (const l of geo.lines) {
    if (linhaByCode && !linhaByCode.has(l.codigo)) {
      report.removed.push(l.codigo);
      continue;
    }
    const g = gtfsLine.get(l.codigo);
    const base = {
      id: l.id,
      codigo: l.codigo,
      nome: l.nome,
      categoria: l.categoria,
      terminalOrigem: l.terminalOrigem,
      terminalDestino: LOOP_LABEL.test(l.terminalDestino.trim())
        ? (nameOf(l.paradasIda[l.paradasIda.length - 1]) ?? l.terminalDestino)
        : l.terminalDestino,
    };
    // Se o GTFS perdeu a volta que o GeoCuritiba tem, vale o GeoCuritiba.
    const lostReturn = g?.oneWay && l.paradasVolta.length > 0;
    if (g?.ok && !g.weak && !lostReturn) {
      lines.push({ ...fromGtfs(base, g), fonte: 'gtfs' });
      continue;
    }
    // Nunca misturar fontes na geometria: fica o GeoCuritiba inteiro (horário do GTFS é da linha).
    report.fallback.push({
      code: l.codigo,
      reason: !g
        ? 'sem viagens no GTFS'
        : g.weak
          ? `padrão cobre ${Math.round(g.coverage * 100)}% das viagens`
          : lostReturn && g.ok
            ? 'um sentido só no GTFS'
            : `mapeamento ${Math.round(g.ratio * 100)}%`,
    });
    lines.push({
      ...base,
      trajetoIda: l.trajeto,
      paradasIda: l.paradasIda,
      paradasVolta: l.paradasVolta,
      ...(g?.schedule ?? {}),
      fonte: 'geocuritiba',
    });
  }
  const geoCodes = new Set(geo.lines.map((l) => l.codigo));
  for (const [code, g] of gtfsLine) {
    if (geoCodes.has(code)) continue;
    const rec = linhaByCode?.get(code);
    if (!rec || !g.ok || g.weak) {
      report.ignoredGtfs.push(code);
      continue;
    }
    report.added.push(code);
    lines.push({
      ...fromGtfs(
        {
          id: `linha-${code}`,
          codigo: code,
          nome: String(rec.NOME).trim(),
          categoria: mapCategory(rec.CATEGORIA_SERVICO),
          terminalOrigem: '',
          terminalDestino: '',
        },
        g,
      ),
      fonte: 'gtfs',
    });
  }
  lines.sort((a, b) => a.codigo.localeCompare(b.codigo));
  // Linha vigente que não sai em lugar nenhum: sem viagem no GTFS e fora do GeoCuritiba (X37, X43).
  if (linhaByCode) report.untraced = [...linhaByCode.keys()].filter((c) => !geoCodes.has(c) && !gtfsLine.has(c)).sort();

  const linesByStop = new Map();
  for (const l of lines)
    for (const id of [...l.paradasIda, ...l.paradasVolta]) {
      if (!linesByStop.has(id)) linesByStop.set(id, new Set());
      linesByStop.get(id).add(l.codigo);
    }
  const outStops = geo.stops
    .filter((s) => linesByStop.has(s.id))
    .map((s) => ({ ...s, linhas: [...linesByStop.get(s.id)].sort() }));
  report.stopsDropped = geo.stops.length - outStops.length;

  const byCategory = {};
  for (const l of lines) byCategory[l.categoria] = (byCategory[l.categoria] ?? 0) + 1;
  const withFreq = lines.filter((l) => l.frequenciaMinutosPico != null).map((l) => l.frequenciaMinutosPico);
  report.counts = {
    getLinhas: linhaByCode?.size ?? null,
    getLinhasWithTrips: linhaByCode ? [...linhaByCode.keys()].filter((c) => tripsByCode.has(c)).length : null,
    geo: geo.lines.length,
    final: lines.length,
    fromGtfs: lines.filter((l) => l.fonte === 'gtfs').length,
    byCategory,
    withHorario: lines.filter((l) => l.horarioFuncionamento).length,
    withFreq: withFreq.length,
    freqRange: withFreq.length ? [Math.min(...withFreq), Math.max(...withFreq)] : null,
  };
  report.stopMap.misses = [...report.stopMap.misses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  return {
    dataset: { stops: outStops, lines: lines.map(({ fonte, ...l }) => l) },
    report,
  };
}

const THRESHOLDS = {
  // O feed 20260818 tem viagens para 210 das 309 linhas do getLinhas (68%); as demais caem no
  // GeoCuritiba. Abaixo de 65% é sinal de feed quebrado ou de código de linha mal lido.
  minLinhasWithTrips: 0.65,
  minFromGtfs: 0.6,
  minStopMapping: 0.9,
  minNearShape: 0.95,
  maxRemoved: 10,
  maxDroppedStops: 0.05,
};

function validate(dataset, report, { requiredLines = [], requiredStops = [], geoStops, thresholds = THRESHOLDS }) {
  const errors = [];
  const lineCodes = new Set(dataset.lines.map((l) => l.codigo));
  const stopIds = new Set(dataset.stops.map((s) => s.id));
  for (const c of requiredLines) if (!lineCodes.has(c)) errors.push(`linha obrigatória ausente: ${c}`);
  for (const id of requiredStops) if (!stopIds.has(id)) errors.push(`parada obrigatória ausente: ${id}`);
  const c = report.counts;
  if (!report.weekdayTrips) errors.push('nenhuma viagem de dia útil (service_id 1)');
  if (c.getLinhas && c.getLinhasWithTrips / c.getLinhas < thresholds.minLinhasWithTrips)
    errors.push(`só ${c.getLinhasWithTrips}/${c.getLinhas} linhas do getLinhas têm viagens no GTFS`);
  if (c.fromGtfs / c.final < thresholds.minFromGtfs) errors.push(`só ${c.fromGtfs}/${c.final} linhas vieram do GTFS`);
  const m = report.stopMap;
  if (m.total && (m.byCode + m.byTerminal) / m.total < thresholds.minStopMapping)
    errors.push(`mapeamento de paradas ${m.byCode + m.byTerminal}/${m.total}`);
  const n = report.stopsNearShape;
  if (n.total && n.near / n.total < thresholds.minNearShape)
    errors.push(`só ${n.near}/${n.total} paradas a até 100 m do traçado`);
  if (report.removed.length > thresholds.maxRemoved) errors.push(`remoção de ${report.removed.length} linhas`);
  if (geoStops && report.stopsDropped / geoStops > thresholds.maxDroppedStops)
    errors.push(`${report.stopsDropped} paradas ficariam sem linha`);
  const broken = dataset.stops.filter((s) => /�|Ã[\x80-\xBF]/.test(s.nome)).length;
  if (broken) errors.push(`${broken} nomes de parada com encoding quebrado`);
  return errors;
}

module.exports = {
  parseCsv,
  readTable,
  summarizeSchedule,
  cleanHeadsign,
  pickPatterns,
  mapStopId,
  buildNetwork,
  validate,
  THRESHOLDS,
};
