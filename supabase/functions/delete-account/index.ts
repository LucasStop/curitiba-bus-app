// Edge Function delete-account (docs/SSD.md 10.1). Deploy e variaveis ficam com o dono do
// projeto; SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY sao injetadas pelo
// proprio Supabase no runtime, nada disso vai para arquivo.
import { createClient } from "@supabase/supabase-js";
import { createHandler } from "./handler.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

const admin = createClient(url, serviceRoleKey, noSession);

Deno.serve(
  createHandler({
    userClientFor: (authHeader) =>
      createClient(url, anonKey, { ...noSession, global: { headers: { Authorization: authHeader } } }),
    admin,
  }),
);
