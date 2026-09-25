// Baixa a rede estática da RIT do GeoCuritiba (IPPUC, público, sem login) e grava
// src/data/geocuritiba.json. Uso: yarn data:geocuritiba
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { buildDataset } = createRequire(import.meta.url)('./geocuritiba-transform.cjs');

const BASE = 'https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/URBS_Transporte_Publico/MapServer';
const OUT = new URL('../src/data/geocuritiba.json', import.meta.url);
const PAGE = 1000;

async function get(path, params) {
  const url = `${BASE}/${path}?${new URLSearchParams({ f: 'json', ...params })}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (body.error) throw new Error(body.error.message);
      return body;
    } catch (e) {
      if (attempt === 3) throw new Error(`${path}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function queryAll(layer, params) {
  const out = [];
  for (let offset = 0; ; offset += PAGE) {
    const body = await get(`${layer}/query`, {
      where: '1=1',
      resultOffset: offset,
      resultRecordCount: PAGE,
      orderByFields: 'objectid',
      ...params,
    });
    out.push(...body.features);
    if (!body.exceededTransferLimit && body.features.length < PAGE) return out;
  }
}

const stopFeatures = await queryAll(1, { outFields: 'objectid,num,nome_ponto,tipo,lat,lon', returnGeometry: false });
console.log(`paradas: ${stopFeatures.length}`);

const lineFeatures = await queryAll(2, {
  outFields: 'objectid,cod,nome_linha,categoria_servico',
  returnGeometry: true,
  outSR: 4326,
});
console.log(`traçados: ${lineFeatures.length}`);

const terminalFeatures = await queryAll(0, { outFields: 'objectid,nome,bairro', returnGeometry: false });

// pontos_linha não expõe o num da parada; ele vem pela relação a partir da camada de paradas.
const stopLines = [];
const numByOid = new Map(stopFeatures.map((f) => [f.attributes.objectid, f.attributes.num]));
const oids = [...numByOid.keys()];
for (let i = 0; i < oids.length; i += 200) {
  const body = await get('1/queryRelatedRecords', {
    objectIds: oids.slice(i, i + 200).join(','),
    relationshipId: 0,
    outFields: 'cod,sentido,seq',
    returnGeometry: false,
  });
  for (const g of body.relatedRecordGroups) {
    for (const r of g.relatedRecords) stopLines.push({ num: numByOid.get(g.objectId), ...r.attributes });
  }
  process.stdout.write(`\rrelações: ${Math.min(i + 200, oids.length)}/${oids.length}`);
}
console.log(`\nparada↔linha: ${stopLines.length}`);

const { dataset, stats } = buildDataset({
  stops: stopFeatures.map((f) => f.attributes).filter((s) => s.lat != null && s.lon != null),
  lines: lineFeatures.map((f) => ({
    ...f.attributes,
    paths: f.geometry.paths.map((p) => p.map(([lon, lat]) => [lat, lon])),
  })),
  stopLines,
  terminals: terminalFeatures.map((f) => f.attributes),
});

const json = JSON.stringify({
  source: `${BASE} (IPPUC/URBS)`,
  generatedAt: new Date().toISOString().slice(0, 10),
  ...dataset,
});
writeFileSync(OUT, json);
const byCat = dataset.lines.reduce((a, l) => ({ ...a, [l.categoria]: (a[l.categoria] ?? 0) + 1 }), {});
console.log({
  linhas: dataset.lines.length,
  paradas: dataset.stops.length,
  porCategoria: byCat,
  semParadas: stats.linesWithoutStops.length,
  semTracado: stats.linesWithoutPath,
  paradasSemLinha: stats.stopsWithoutLines,
  pontosTracado: dataset.lines.reduce((a, l) => a + l.trajeto.length, 0),
  tamanhoKB: Math.round(json.length / 1024),
});
