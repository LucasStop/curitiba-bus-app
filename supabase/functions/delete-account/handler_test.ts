// R6 (docs/TDD.md): delete-account so apaga o usuario dono do token.
// Roda com `deno test supabase/functions/delete-account/handler_test.ts`.
import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import { createHandler } from "./handler.ts";

const TOKENS: Record<string, string> = { "token-A": "user-A", "token-B": "user-B" };

function setup(opts: { adminFails?: boolean } = {}) {
  const deleted: string[] = [];
  const headersSeen: string[] = [];
  const handler = createHandler({
    // Cliente com a anon key + header do chamador: e ele quem diz quem e o usuario.
    userClientFor: (authHeader) => {
      headersSeen.push(authHeader);
      return {
        auth: {
          getUser: (jwt) => {
            const id = jwt ? TOKENS[jwt] : undefined;
            return Promise.resolve(
              id
                ? { data: { user: { id } }, error: null }
                : { data: { user: null }, error: { message: "invalid JWT: secret detail" } },
            );
          },
        },
      };
    },
    admin: {
      auth: {
        admin: {
          deleteUser: (id) => {
            if (opts.adminFails) {
              return Promise.resolve({ error: { message: "db exploded: secret detail" } });
            }
            deleted.push(id);
            return Promise.resolve({ error: null });
          },
        },
      },
    },
  });
  return { handler, deleted, headersSeen };
}

const post = (headers: HeadersInit = {}, body?: unknown, url = "http://localhost/delete-account") =>
  new Request(url, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

Deno.test("R6: token de A com user_id de B no corpo apaga so A", async () => {
  const { handler, deleted } = setup();
  const res = await handler(
    post({ Authorization: "Bearer token-A", "Content-Type": "application/json" }, {
      user_id: "user-B",
      id: "user-B",
      userId: "user-B",
    }),
  );
  assertEquals(res.status, 204);
  assertEquals(deleted, ["user-A"]);
});

Deno.test("R6: user_id de B na query string tambem e ignorado", async () => {
  const { handler, deleted } = setup();
  const res = await handler(
    post({ Authorization: "Bearer token-A" }, undefined, "http://localhost/delete-account?user_id=user-B"),
  );
  assertEquals(res.status, 204);
  assertEquals(deleted, ["user-A"]);
});

Deno.test("R6: passa o header do chamador ao cliente que valida o JWT", async () => {
  const { handler, headersSeen } = setup();
  await handler(post({ Authorization: "Bearer token-A" }));
  assertEquals(headersSeen, ["Bearer token-A"]);
});

Deno.test("R6: sem Authorization retorna 401 e nao apaga ninguem", async () => {
  const { handler, deleted } = setup();
  const res = await handler(post({}, { user_id: "user-B" }));
  assertEquals(res.status, 401);
  assertEquals(deleted, []);
});

Deno.test("R6: Authorization que nao e Bearer retorna 401", async () => {
  const { handler, deleted } = setup();
  const res = await handler(post({ Authorization: "token-A" }));
  assertEquals(res.status, 401);
  assertEquals(deleted, []);
});

Deno.test("R6: token invalido retorna 401 sem vazar detalhe interno", async () => {
  const { handler, deleted } = setup();
  const res = await handler(post({ Authorization: "Bearer forged" }, { user_id: "user-B" }));
  assertEquals(res.status, 401);
  assertEquals(deleted, []);
  assertFalse((await res.text()).includes("secret detail"));
});

Deno.test("R6: metodo diferente de POST retorna 405 e nao apaga ninguem", async () => {
  for (const method of ["GET", "DELETE", "PUT", "PATCH"]) {
    const { handler, deleted } = setup();
    const res = await handler(
      new Request("http://localhost/delete-account", {
        method,
        headers: { Authorization: "Bearer token-A" },
      }),
    );
    assertEquals(res.status, 405, method);
    assertEquals(res.headers.get("Allow"), "POST, OPTIONS");
    assertEquals(deleted, [], method);
  }
});

Deno.test("preflight OPTIONS responde 204 com CORS minimo e nao apaga ninguem", async () => {
  const { handler, deleted } = setup();
  const res = await handler(
    new Request("http://localhost/delete-account", { method: "OPTIONS" }),
  );
  assertEquals(res.status, 204);
  assertStringIncludes(res.headers.get("Access-Control-Allow-Methods") ?? "", "POST");
  assertEquals(deleted, []);
});

Deno.test("falha ao apagar retorna 500 generico sem vazar detalhe", async () => {
  const { handler } = setup({ adminFails: true });
  const res = await handler(post({ Authorization: "Bearer token-A" }));
  assertEquals(res.status, 500);
  assertFalse((await res.text()).includes("secret detail"));
});
