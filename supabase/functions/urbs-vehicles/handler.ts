// Logica da Edge Function urbs-vehicles separada do runtime para testar com dependencias falsas.
// Regras da URBS (docs/URBS-WEBSERVICE.md): no maximo 1 chamada de getVeiculos a cada ~2 min,
// so o servidor chama, e o codigo de acesso nunca aparece em log, resposta ou erro.
import { parseVehicles } from "./parse.ts";

export interface Db {
  // Le bus_feed_status.last_attempt_at (ISO) ou null se nunca tentou.
  lastAttemptAt(): Promise<string | null>;
  markAttempt(err?: string): Promise<void>;
  ingest(rows: unknown[], runAt: string): Promise<number>;
}

export interface Deps {
  cronSecret: string;
  // Faz a unica chamada a URBS (URL com o codigo fica so no index.ts).
  fetchUrbs(): Promise<Response>;
  db: Db;
  now(): Date;
}

// Piso do throttle: menor que os 2 min do cron para tolerar jitter, maior que qualquer retry.
const MIN_INTERVAL_MS = 90_000;

const reply = (status: number, body?: unknown) =>
  body === undefined
    ? new Response(null, { status })
    : new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function createHandler({ cronSecret, fetchUrbs, db, now }: Deps) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return reply(405);
    const provided = req.headers.get("x-cron-secret") ?? "";
    if (!cronSecret || !safeEqual(provided, cronSecret)) return reply(401);

    let category = "unexpected";
    try {
      const last = await db.lastAttemptAt();
      if (last && now().getTime() - new Date(last).getTime() < MIN_INTERVAL_MS) return reply(204);

      await db.markAttempt();

      category = "network";
      let res: Response;
      try {
        res = await fetchUrbs();
      } catch (e) {
        category = e instanceof DOMException && e.name === "TimeoutError" ? "timeout" : "network";
        await db.markAttempt(category);
        console.error("urbs-vehicles: fetch failed");
        return reply(502);
      }
      if (res.status !== 200) {
        await db.markAttempt(`http_${res.status}`);
        console.error("urbs-vehicles: upstream error");
        return reply(502);
      }

      let raw: unknown;
      try {
        raw = await res.json();
      } catch {
        await db.markAttempt("parse");
        console.error("urbs-vehicles: invalid json");
        return reply(502);
      }

      const runAt = now();
      const rows = parseVehicles(raw, runAt);
      // Feed vazio e sinal de problema na URBS: nao apagar o mapa inteiro por isso.
      if (rows.length === 0) {
        await db.markAttempt("empty");
        console.error("urbs-vehicles: empty feed");
        return reply(502);
      }
      const count = await db.ingest(rows, runAt.toISOString());
      return reply(200, { count });
    } catch {
      // Sem repassar a excecao: pode conter URL com o codigo.
      console.error("urbs-vehicles: unexpected failure");
      return reply(500);
    }
  };
}
