// Edge Function urbs-vehicles: 1 chamada de getVeiculos por rodada do pg_cron (a cada 2 min).
// URBS_CODE e URBS_CRON_SECRET sao secrets do Supabase; nada disso vai para arquivo ou log.
import { createClient } from "@supabase/supabase-js";
import { createHandler } from "./handler.ts";

const urbsCode = Deno.env.get("URBS_CODE")!;
const cronSecret = Deno.env.get("URBS_CRON_SECRET")!;
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(
  createHandler({
    cronSecret,
    fetchUrbs: () =>
      fetch(
        `https://transporteservico.urbs.curitiba.pr.gov.br/getVeiculos.php?c=${encodeURIComponent(urbsCode)}`,
        { signal: AbortSignal.timeout(10_000) },
      ),
    db: {
      async lastAttemptAt() {
        const { data, error } = await admin.from("bus_feed_status").select("last_attempt_at").eq("id", 1).single();
        if (error) throw new Error("status read failed");
        return data.last_attempt_at;
      },
      async markAttempt(err) {
        const { error } = await admin.rpc("mark_bus_feed_attempt", { err: err ?? null });
        if (error) throw new Error("mark failed");
      },
      async ingest(rows, runAt) {
        const { data, error } = await admin.rpc("ingest_bus_positions", { rows, run_at: runAt });
        if (error) throw new Error("ingest failed");
        return data as number;
      },
    },
    now: () => new Date(),
  }),
);
