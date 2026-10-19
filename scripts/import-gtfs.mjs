// Combina o GTFS público da URBS com a rede do GeoCuritiba e grava src/data/network.json, que é o
// que o app carrega. Uso: yarn data:gtfs (depois de yarn data:geocuritiba, se ele mudar).
//
// Regras da URBS (docs/URBS-WEBSERVICE.md): dado estático no máximo 1 vez por dia, então o zip
// fica em cache por 24 h em docs/urbs-lai/gtfs/ (fora do git). A lista de linhas vigentes vem do
// último getLinhas salvo em docs/urbs-lai/amostras/; este script não chama o WebService.
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { readTable, buildNetwork, validate } = createRequire(import.meta.url)('./gtfs-transform.cjs');

const GTFS_URL = 'https://files.urbs.curitiba.pr.gov.br/google/google_transit.zip';
const CACHE_DIR = new URL('../docs/urbs-lai/gtfs/', import.meta.url);
const ZIP = new URL('google_transit.zip', CACHE_DIR);
const SAMPLES = new URL('../docs/urbs-lai/amostras/', import.meta.url);
const GEO = new URL('../src/data/geocuritiba.json', import.meta.url);
const OUT = new URL('../src/data/network.json', import.meta.url);
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BYTES = 3 * 1024 * 1024;

// Ids fixos em src/app/(tabs)/routes.tsx e nos testes que usam o dataset real.
const REQUIRED_LINES = ['203'];
const REQUIRED_STOPS = ['terminal-cabral', 'terminal-boqueirao', 'terminal-portao', '108030', '108065'];

async function ensureZip() {
  const fresh = existsSync(ZIP) && Date.now() - statSync(ZIP).mtimeMs < DAY_MS;
  if (fresh) return 'cache (menos de 24 h)';
  mkdirSync(CACHE_DIR, { recursive: true });
  try {
    const res = await fetch(GTFS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.subarray(0, 2).toString() !== 'PK') throw new Error('resposta não é um zip');
    writeFileSync(ZIP, buf);
    return `baixado (${Math.round(buf.length / 1024)} KB)`;
  } catch (e) {
    if (existsSync(ZIP)) return `cache antigo (download falhou: ${e.message})`;
    throw e;
  }
}

const unzip = (name) =>
  readTable(execFileSync('unzip', ['-p', ZIP.pathname, name], { maxBuffer: 64 << 20, encoding: 'utf8' }));

function latestLinhas() {
  if (!existsSync(SAMPLES)) return null;
  const file = readdirSync(SAMPLES)
    .filter((f) => /^getLinhas-.*\.json$/.test(f))
    .sort()
    .pop();
  if (!file) return null;
  const raw = JSON.parse(readFileSync(new URL(file, SAMPLES), 'utf8'));
  return { file, linhas: Array.isArray(raw) ? raw : Object.values(raw) };
}

const zipStatus = await ensureZip();
const geo = JSON.parse(readFileSync(GEO, 'utf8'));
const linhasSample = latestLinhas();
if (!linhasSample) console.warn('AVISO: sem getLinhas salvo; nenhuma linha será adicionada ou removida.');

const feedInfo = unzip('feed_info.txt');
const feedVersion = feedInfo.rows[0]?.[feedInfo.col('feed_version')] ?? '';
const gtfs = Object.fromEntries(
  ['routes', 'trips', 'stops', 'stop_times', 'shapes'].map((n) => [
    n === 'stop_times' ? 'stopTimes' : n,
    unzip(`${n}.txt`),
  ]),
);

const { dataset, report } = buildNetwork({ geo, linhas: linhasSample?.linhas ?? null, gtfs });
const out = {
  source: {
    gtfs: `URBS GTFS feed_version ${feedVersion} (${GTFS_URL}), CC BY 4.0, via Portal de Dados Abertos de Curitiba`,
    geocuritiba: geo.source,
    linhas: linhasSample ? `URBS getLinhas (${linhasSample.file})` : null,
  },
  generatedAt: new Date().toISOString().slice(0, 10),
  ...dataset,
};
const json = JSON.stringify(out);

const errors = validate(dataset, report, {
  requiredLines: REQUIRED_LINES,
  requiredStops: REQUIRED_STOPS,
  geoStops: geo.stops.length,
});
if (json.length > MAX_BYTES) errors.push(`saída com ${Math.round(json.length / 1024)} KB (limite 3 MB)`);

const c = report.counts;
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '-');
console.log(`GTFS: feed_version ${feedVersion}, zip ${zipStatus}`);
console.log(
  `getLinhas: ${linhasSample?.file ?? '(ausente)'} (${c.getLinhas ?? '-'} linhas, ${c.getLinhasWithTrips ?? '-'} com viagens no GTFS)`,
);
console.log(
  `Linhas: GeoCuritiba ${c.geo} → final ${c.final}; do GTFS ${c.fromGtfs} (${pct(c.fromGtfs, c.final)}); um sentido só ${report.singleDirection}`,
);
console.log(`Por categoria: ${JSON.stringify(c.byCategory)}`);
console.log(`Removidas (fora do getLinhas): ${report.removed.join(', ') || '-'}`);
console.log(`Adicionadas: ${report.added.join(', ') || '-'}`);
console.log(
  `No GTFS e ignoradas (fora do getLinhas, mapeamento baixo ou padrão fraco): ${report.ignoredGtfs.join(', ') || '-'}`,
);
console.log(`No getLinhas sem viagem no GTFS e fora do GeoCuritiba: ${report.untraced.join(', ') || '-'}`);
const byReason = {};
const LABEL = { mapeamento: 'paradas mapeadas abaixo de 90%', padrão: 'ida + volta cobrem menos de 50% das viagens' };
for (const f of report.fallback) {
  const pctIn = f.reason.match(/\d+%/)?.[0];
  (byReason[LABEL[f.reason.split(' ')[0]] ?? f.reason] ??= []).push(pctIn ? `${f.code} (${pctIn})` : f.code);
}
for (const [reason, codes] of Object.entries(byReason))
  console.log(`Fallback GeoCuritiba, ${reason} (${codes.length}): ${codes.join(', ')}`);
const m = report.stopMap;
console.log(
  `Paradas das viagens: ${m.total}; por código ${m.byCode}, por terminal ${m.byTerminal} (máx ${m.maxTerminalDist} m); taxa ${pct(m.byCode + m.byTerminal, m.total)}`,
);
console.log(`Top falhas: ${m.misses.map(([k, n]) => `${k} ×${n}`).join('; ') || '-'}`);
console.log(
  `Paradas a até 100 m do traçado (linhas do GTFS): ${report.stopsNearShape.near}/${report.stopsNearShape.total} (${pct(report.stopsNearShape.near, report.stopsNearShape.total)})`,
);
console.log(`Paradas sem linha descartadas: ${report.stopsDropped}`);
console.log(
  `Padrões com cobertura < 50%: ${report.weakPatterns.map((w) => `${w.code} ${w.coverage}`).join(', ') || '-'}`,
);
console.log(
  `Horário: ${c.withHorario} linhas; frequência no pico: ${c.withFreq} (de ${c.freqRange?.[0]} a ${c.freqRange?.[1]} min)`,
);
console.log(`Saída: ${Math.round(json.length / 1024)} KB`);

if (errors.length) {
  console.error(`\nNÃO GRAVADO:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
writeFileSync(OUT, json);
console.log(`\nGravado ${OUT.pathname}`);
