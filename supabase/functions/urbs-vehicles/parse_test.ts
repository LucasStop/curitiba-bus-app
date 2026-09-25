// Parsing de getVeiculos com fixture gravada (zero chamada real a URBS).
// Roda com `deno test --config supabase/functions/urbs-vehicles/deno.json supabase/functions/urbs-vehicles/`.
import { assertEquals } from "@std/assert";
import { parseVehicles, refreshToTimestamp } from "./parse.ts";

const fixture = JSON.parse(await Deno.readTextFile(new URL("./fixtures/getVeiculos.sample.json", import.meta.url)));
// Amostra gravada as 17:38 BRT = 20:38 UTC.
const NOW = new Date("2026-09-25T20:39:00Z");

Deno.test("descarta fora de operacao, recolhimento e posicao velha", () => {
  const rows = parseVehicles(fixture, NOW);
  const prefixes = rows.map((r) => r.prefix);
  assertEquals(prefixes.includes("BC927"), false, "SITUACAO/SENT vazios");
  assertEquals(prefixes.includes("KE701"), false, "REC");
  assertEquals(prefixes.includes("HA603"), false, "REFRESH com 14 min");
  assertEquals(prefixes.includes("JE709"), true);
});

Deno.test("normaliza situacao, rota, acessibilidade e coordenadas", () => {
  const byPrefix = Object.fromEntries(parseVehicles(fixture, NOW).map((r) => [r.prefix, r]));
  assertEquals(byPrefix.JE709.status, "on_time");
  assertEquals(byPrefix.BB608.status, "late");
  assertEquals(byPrefix.JE704.status, "early");
  assertEquals(byPrefix.JB612.status, "nonconforming");
  assertEquals(byPrefix.BI882.route_state, "off_route");
  assertEquals(byPrefix.JB608.route_state, "other");
  assertEquals(byPrefix.HB699.accessible, true);
  assertEquals(byPrefix.HB699.lat, -25.51366);
  assertEquals(byPrefix.BC189.urbs_direction, "CIRCULAR");
  assertEquals(byPrefix.HB699.refreshed_at, "2026-09-25T20:35:37.000Z");
});

Deno.test("aceita array e ignora lixo e coordenada fora de Curitiba", () => {
  const ok = { COD: "X1", REFRESH: "17:38:00", LAT: "-25.4", LON: "-49.3", CODIGOLINHA: "203", ADAPT: "0", SITUACAO: "ATRASADO", SITUACAO2: "REALIZANDO ROTA", SENT: "IDA" };
  const rows = parseVehicles(
    [ok, { ...ok, COD: "X2", LAT: "0", LON: "0" }, { ...ok, COD: "X3", LAT: "abc" }, null, "x"],
    NOW,
  );
  assertEquals(rows.map((r) => r.prefix), ["X1"]);
  assertEquals(parseVehicles(null, NOW), []);
  assertEquals(parseVehicles("erro", NOW), []);
});

Deno.test("refreshToTimestamp trata a virada de meia-noite", () => {
  // Agora = 00:01 BRT de 26/09 (03:01Z); leitura 23:59:30 e do dia 25.
  const now = new Date("2026-09-26T03:01:00Z");
  assertEquals(refreshToTimestamp("23:59:30", now).toISOString(), "2026-09-26T02:59:30.000Z");
  assertEquals(refreshToTimestamp("00:00:30", now).toISOString(), "2026-09-26T03:00:30.000Z");
});
