// Funções puras do importador GeoCuritiba (scripts/import-geocuritiba.mjs). CommonJS para o Jest
// e o Node 20 carregarem sem transpilar.

const LINE_CODE_SEGMENT = /\s*-\s*\d{2,3}[A-Z]?\s*-/;
const LAST_DASH = /^(.*\S)\s*-\s+(\S.*)$|^(.*\S)\s+-\s*(\S.*)$/;

function parseStopName(raw) {
  const text = String(raw).replace(/\s+/g, ' ').trim();
  const code = text.search(LINE_CODE_SEGMENT);
  if (code > 0) return { nome: text.slice(0, code).trim() };
  const m = text.match(LAST_DASH);
  if (m) return { nome: (m[1] ?? m[3]).trim(), bairro: (m[2] ?? m[4]).trim() };
  return { nome: text };
}

const CATEGORY = {
  'LIGEIRÃO': 'ligeirao',
  EXPRESSO: 'expresso',
  'LINHA DIRETA': 'ligeirinho',
  INTERBAIRROS: 'interbairros',
  ALIMENTADOR: 'alimentador',
  TRONCAL: 'troncal',
  CONVENCIONAL: 'convencional',
  MADRUGUEIRO: 'madrugueiro',
  JARDINEIRA: 'turismo',
  'SERVIÇO AOS OPERADORES': 'operacional',
};
const mapCategory = (raw) => CATEGORY[raw] ?? 'convencional';

const round5 = (n) => Math.round(n * 1e5) / 1e5;

// Distância de p ao segmento a-b em metros (equiretangular: erro desprezível na escala de uma cidade).
function segmentDistanceMeters(p, a, b) {
  const k = Math.cos((p[0] * Math.PI) / 180) * 111320;
  const [px, py, ax, ay, bx, by] = [p[1] * k, p[0] * 110540, a[1] * k, a[0] * 110540, b[1] * k, b[0] * 110540];
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Douglas-Peucker iterativo (traçados longos estouram a pilha na versão recursiva).
function simplifyPath(path, toleranceMeters) {
  if (path.length < 3) return path.map(([a, b]) => [round5(a), round5(b)]);
  const keep = new Uint8Array(path.length);
  keep[0] = keep[path.length - 1] = 1;
  const stack = [[0, path.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let max = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = segmentDistanceMeters(path[i], path[s], path[e]);
      if (d > max) [max, idx] = [d, i];
    }
    if (max > toleranceMeters) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return path.filter((_, i) => keep[i]).map(([a, b]) => [round5(a), round5(b)]);
}

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

function buildDataset({ stops, lines, stopLines, terminals }) {
  const terminalBairro = new Map(terminals.map((t) => [slug(`Terminal ${t.nome}`), t.bairro]));
  const stopIdByNum = new Map();
  const byId = new Map();

  for (const s of stops) {
    const parsed = parseStopName(s.nome_ponto);
    const isTerminal = s.tipo === 'Plataforma' && /^Terminal\b/i.test(parsed.nome);
    const id = isTerminal ? slug(parsed.nome) : String(s.num);
    stopIdByNum.set(s.num, id);
    const existing = byId.get(id);
    if (existing) {
      existing._pts.push([s.lat, s.lon]);
      continue;
    }
    byId.set(id, {
      id,
      nome: parsed.nome,
      tipo: isTerminal ? 'terminal' : s.tipo === 'Estação tubo' ? 'tubo' : 'comum',
      bairro: isTerminal ? terminalBairro.get(id) : parsed.bairro,
      _pts: [[s.lat, s.lon]],
      _lines: new Set(),
    });
  }

  // cod -> sentido -> [{seq, id}]
  const routes = new Map();
  for (const r of stopLines) {
    const id = stopIdByNum.get(r.num);
    if (!id) continue;
    byId.get(id)._lines.add(r.cod);
    if (!routes.has(r.cod)) routes.set(r.cod, new Map());
    const dirs = routes.get(r.cod);
    if (!dirs.has(r.sentido)) dirs.set(r.sentido, []);
    dirs.get(r.sentido).push({ seq: r.seq, id });
  }

  const orderedIds = (entries) =>
    entries
      .sort((a, b) => a.seq - b.seq)
      .map((e) => e.id)
      .filter((id, i, arr) => id !== arr[i - 1]);

  const outStops = [...byId.values()]
    .filter((s) => s._lines.size)
    .map(({ _pts, _lines, bairro, ...s }) => ({
      ...s,
      latitude: round5(_pts.reduce((a, p) => a + p[0], 0) / _pts.length),
      longitude: round5(_pts.reduce((a, p) => a + p[1], 0) / _pts.length),
      ...(bairro ? { bairro } : {}),
      linhas: [..._lines].sort(),
    }));
  const stopById = new Map(outStops.map((s) => [s.id, s]));

  const byCode = new Map();
  for (const l of lines) {
    const path = l.paths.flat();
    if (!byCode.has(l.cod) || path.length > byCode.get(l.cod).path.length) byCode.set(l.cod, { ...l, path });
  }

  const stats = { linesWithoutStops: [], linesWithoutPath: [], stopsWithoutLines: byId.size - outStops.length };
  const outLines = [];
  for (const [cod, dirs] of routes) {
    const l = byCode.get(cod);
    if (!l || l.path.length < 2) {
      stats.linesWithoutPath.push(cod);
      continue;
    }
    const [ida, volta] = [...dirs.keys()].sort();
    const paradasIda = orderedIds(dirs.get(ida));
    const paradasVolta = volta ? orderedIds(dirs.get(volta)) : [];
    const first = stopById.get(paradasIda[0]);
    let path = l.path;
    if (first) {
      const p0 = [first.latitude, first.longitude];
      if (dist2(path[path.length - 1], p0) < dist2(path[0], p0)) path = [...path].reverse();
    }
    outLines.push({
      id: `linha-${cod}`,
      codigo: cod,
      nome: String(l.nome_linha).trim(),
      categoria: mapCategory(l.categoria_servico),
      terminalOrigem: volta ?? first?.nome ?? ida,
      terminalDestino: ida,
      trajeto: simplifyPath(path, 8),
      paradasIda,
      paradasVolta,
    });
  }
  for (const cod of byCode.keys()) if (!routes.has(cod)) stats.linesWithoutStops.push(cod);

  outLines.sort((a, b) => a.codigo.localeCompare(b.codigo));
  outStops.sort((a, b) => a.id.localeCompare(b.id));
  return { dataset: { stops: outStops, lines: outLines }, stats };
}

module.exports = { parseStopName, mapCategory, simplifyPath, buildDataset };
