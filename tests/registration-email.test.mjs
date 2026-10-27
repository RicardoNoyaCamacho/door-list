import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// Exercise the actual Server Action with isolated database/HTTP boundaries.
// No .env files, live Supabase, Resend calls or attendee emails are used.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase/server") {
      return { url: "data:text/javascript,export const createClient = async () => globalThis.ticketEmailTestClient", shortCircuit: true };
    }
    if (specifier.startsWith("@/lib/")) {
      return { url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { registerAttendee } = await import("../app/eventos/[eventId]/registro/actions.ts");
hooks.deregister();

const eventId = "11111111-1111-4111-8111-111111111111";
const ticketId = "22222222-2222-4222-8222-222222222222";
const code = "b".repeat(64);
const ticket = {
  code, status: "valid", issued_at: "2026-10-26T12:00:00Z",
  attendee: { name: "Nombre guardado", email: "guardado@example.com" },
  event: { title: "Evento guardado", venue: "Foro", starts_at: "2026-10-28T20:00:00Z" },
  ticket_type: { name: "General" },
};

function setup(t, registration, ticketResult = { data: ticket, error: null }) {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_FROM_EMAIL = "entrada@example.com";
  const calls = [];
  globalThis.ticketEmailTestClient = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === "register_event_attendee") return registration;
      if (name === "get_public_ticket") return ticketResult;
      assert.fail(`Unexpected RPC: ${name}`);
    },
  };
  const logger = t.mock.method(console, "error", () => {});
  t.after(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = originalFrom;
    delete globalThis.ticketEmailTestClient;
  });
  const form = new FormData();
  form.set("name", "Nombre enviado");
  form.set("email", "enviado@example.com");
  form.set("ticket_type_id", ticketId);
  return { calls, logger, submit: () => registerAttendee(eventId, { status: "idle" }, form) };
}
const success = { data: { code: "success", event_title: "Evento guardado", ticket_type_name: "General", ticket_code: code }, error: null };

test("confirmation sends only after registration commits, to the database email", async (t) => {
  const { calls, submit } = setup(t, success);
  let sends = 0;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    sends++;
    assert.deepEqual(calls.map((call) => call.name), ["register_event_attendee", "get_public_ticket"]);
    assert.equal(calls[1].args.p_code, code);
    const email = JSON.parse(options.body);
    assert.deepEqual(email.to, [ticket.attendee.email]);
    assert.match(email.html, /Nombre guardado/);
    assert.ok(!email.html.includes("Nombre enviado"));
    return Response.json({ id: "accepted" });
  });
  const result = await submit();
  assert.equal(result.status, "success");
  assert.equal(result.confirmation.ticketCode, code);
  assert.equal(result.confirmation.emailStatus, "sent");
  assert.equal(sends, 1);
});

test("Resend rejection preserves the confirmed registration and ticket link", async (t) => {
  const { calls, logger, submit } = setup(t, success);
  t.mock.method(globalThis, "fetch", async () => new Response("private error", { status: 403 }));
  const result = await submit();
  assert.equal(result.status, "success");
  assert.equal(result.confirmation.ticketCode, code);
  assert.equal(result.confirmation.emailStatus, "failed");
  assert.equal(calls.filter((call) => call.name === "register_event_attendee").length, 1);
  assert.deepEqual(logger.mock.calls[0].arguments, ["No se pudo enviar el email de confirmación de entrada."]);
});

test("failure to retrieve email details does not lose the issued ticket", async (t) => {
  const { submit } = setup(t, success, { data: null, error: { message: "database unavailable" } });
  t.mock.method(globalThis, "fetch", () => assert.fail("must not send"));
  const result = await submit();
  assert.equal(result.status, "success");
  assert.equal(result.confirmation.ticketCode, code);
  assert.equal(result.confirmation.emailStatus, "failed");
});

test("duplicate and unavailable registrations never retrieve or email an existing ticket", async (t) => {
  for (const resultCode of ["duplicate", "event_unavailable", "invalid_input"]) {
    await t.test(resultCode, async (t) => {
      const { calls, submit } = setup(t, { data: { code: resultCode }, error: null });
      t.mock.method(globalThis, "fetch", () => assert.fail("must not send"));
      const result = await submit();
      assert.equal(result.status, "error");
      assert.equal(result.confirmation, undefined);
      assert.deepEqual(calls.map((call) => call.name), ["register_event_attendee"]);
    });
  }
});
