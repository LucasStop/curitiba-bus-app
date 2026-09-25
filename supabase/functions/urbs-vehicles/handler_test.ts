// Handler urbs-vehicles com dependencias falsas: auth, throttle, erros e ausencia de segredo em log.
import { assertEquals, assertFalse } from "@std/assert";
import { createHandler } from "./handler.ts";

const fixture = await Deno.readTextFile(new URL("./fixtures/getVeiculos.sample.json", import.meta.url));
const NOW = new Date("2026-09-25T20:39:00Z");
const SECRET = "cron-secret-de-teste";
const TEST_CODE = "codigo-urbs-de-teste";

function setup(opts: { lastAttempt?: string | null; upstream?: () => Promise<Response> } = {}) {
  const calls = { urbs: 0, attempts: [] as (string | undefined)[], ingested: [] as unknown[][] };
  const logs: string[] = [];
  const origError = console.error;
  console.error = (...a: unknown[]) => logs.push(a.join(" "));
  const handler = createHandler({
    cronSecret: SECRET,
    fetchUrbs: () => {
      calls.urbs++;
      return (opts.upstream ?? (() => Promise.resolve(new Response(fixture))))();
    },
    db: {
      lastAttemptAt: () => Promise.resolve(opts.lastAttempt ?? null),
      markAttempt: (err) => {
        calls.attempts.push(err);
        return Promise.resolve();
      },
      ingest: (rows) => {
        calls.ingested.push(rows);
        return Promise.resolve(rows.length);
      },
    },
    now: () => NOW,
  });
  return { handler, calls, logs, restore: () => (console.error = origError) };
}

const post = (secret?: string) =>
  new Request("https://x.test/urbs-vehicles", { method: "POST", headers: secret ? { "x-cron-secret": secret } : {} });

Deno.test("segredo errado ou ausente: 401 e a URBS nao e chamada", async () => {
  const t = setup();
  assertEquals((await t.handler(post())).status, 401);
  assertEquals((await t.handler(post("errado"))).status, 401);
  assertEquals(t.calls.urbs, 0);
  t.restore();
});

Deno.test("metodo diferente de POST: 405", async () => {
  const t = setup();
  assertEquals((await t.handler(new Request("https://x.test/", { method: "GET" }))).status, 405);
  assertEquals(t.calls.urbs, 0);
  t.restore();
});

Deno.test("tentativa ha 30 s: 204 sem chamar a URBS", async () => {
  const t = setup({ lastAttempt: new Date(NOW.getTime() - 30_000).toISOString() });
  assertEquals((await t.handler(post(SECRET))).status, 204);
  assertEquals(t.calls.urbs, 0);
  assertEquals(t.calls.attempts.length, 0);
  t.restore();
});

Deno.test("fluxo feliz: 1 chamada, ingere so os veiculos em operacao", async () => {
  const t = setup({ lastAttempt: new Date(NOW.getTime() - 120_000).toISOString() });
  const res = await t.handler(post(SECRET));
  assertEquals(res.status, 200);
  assertEquals(t.calls.urbs, 1);
  assertEquals(t.calls.ingested.length, 1);
  const prefixes = (t.calls.ingested[0] as { prefix: string }[]).map((r) => r.prefix);
  assertFalse(prefixes.includes("KE701"));
  assertFalse(prefixes.includes("BC927"));
  assertEquals((await res.json()).count, prefixes.length);
  t.restore();
});

for (
  const [name, upstream, category] of [
    ["503", () => Promise.resolve(new Response("x", { status: 503 })), "http_503"],
    ["timeout", () => Promise.reject(new DOMException("t", "TimeoutError")), "timeout"],
    ["rede", () => Promise.reject(new TypeError(`fetch failed ?c=${TEST_CODE}`)), "network"],
    ["json invalido", () => Promise.resolve(new Response("<html>")), "parse"],
    ["feed vazio", () => Promise.resolve(new Response("{}")), "empty"],
  ] as const
) {
  Deno.test(`URBS ${name}: 502, categoria registrada, nada ingerido, log sem segredo`, async () => {
    const t = setup({ upstream });
    assertEquals((await t.handler(post(SECRET))).status, 502);
    assertEquals(t.calls.attempts.at(-1), category);
    assertEquals(t.calls.ingested.length, 0);
    const out = t.logs.join("\n");
    assertFalse(out.includes("?c="));
    assertFalse(out.includes(TEST_CODE));
    t.restore();
  });
}
