// Logica de delete-account separada do runtime para poder testar com clientes falsos.
// T7 (docs/SECURITY.md): so o usuario dono do JWT e apagado; id vindo de corpo, query
// ou header e ignorado de proposito (o corpo nem e lido).

// Formas minimas do supabase-js que a funcao usa; o index.ts injeta os clientes reais.
export interface UserClient {
  auth: {
    getUser(jwt?: string): Promise<{
      data: { user: { id: string } | null };
      error: unknown;
    }>;
  };
}

export interface AdminClient {
  auth: {
    admin: { deleteUser(id: string): Promise<{ error: unknown }> };
  };
}

export interface Deps {
  // Cliente criado com a anon key e o header Authorization do chamador.
  userClientFor(authHeader: string): UserClient;
  // Cliente service_role: nunca sai desta funcao nem vai para o app.
  admin: AdminClient;
}

// App nativo nao precisa de CORS; mantido no minimo para preflight de navegador (Expo web).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Respostas sem corpo de erro: nada de mensagem interna do Auth ou do banco para o cliente.
const reply = (status: number, extra: HeadersInit = {}) =>
  new Response(null, { status, headers: { ...CORS, ...extra } });

export function createHandler({ userClientFor, admin }: Deps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return reply(204);
    if (req.method !== "POST") return reply(405, { Allow: "POST, OPTIONS" });

    const authHeader = req.headers.get("Authorization") ?? "";
    const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
    if (!match) return reply(401);

    try {
      const { data, error } = await userClientFor(authHeader).auth.getUser(match[1]);
      if (error || !data.user) return reply(401);

      const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
      if (deleteError) {
        console.error("delete-account: deleteUser failed");
        return reply(500);
      }
      return reply(204);
    } catch {
      // Sem repassar a excecao: pode conter URL, chave ou id.
      console.error("delete-account: unexpected failure");
      return reply(500);
    }
  };
}
