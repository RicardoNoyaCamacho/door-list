import assert from "node:assert/strict";
import test from "node:test";
import jsQR from "jsqr";
import sharp from "sharp";
import { sendTicketEmail } from "../lib/ticket-email.ts";

const ticket = {
  code: "a".repeat(64), status: "valid", issuedAt: "2026-10-26T12:00:00Z",
  attendee: { name: 'Ana <img src=x onerror="alert(1)">', email: "ana@example.com" },
  event: { title: "Música & Arte <2026>", venue: 'Foro "Centro" <script>bad()</script>', startsAt: "2026-10-27T01:30:00Z" },
  ticketType: { name: "General & amigos" },
};
const config = { apiKey: "test-key", from: "Door List <entradas@example.com>" };
const accepted = () => Response.json({ id: "test-email-id" });

test("sends authoritative event details and a scannable inline PNG without remote image URLs", async () => {
  let sent;
  await sendTicketEmail(ticket, config, async (url, options) => {
    sent = { url, options };
    return accepted();
  });
  const { url, options } = sent;
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options.method, "POST");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers.Authorization, "Bearer test-key");
    assert.ok(!options.headers["Idempotency-Key"].includes(ticket.code));
    const body = JSON.parse(options.body);
    assert.equal(body.from, config.from);
    assert.deepEqual(body.to, [ticket.attendee.email]);
    assert.equal(body.subject, `Tu entrada para ${ticket.event.title}`);
    assert.match(body.html, /Música &amp; Arte &lt;2026&gt;/);
    assert.match(body.html, /Foro &quot;Centro&quot; &lt;script&gt;/);
    assert.match(body.html, /Ana &lt;img/);
    assert.ok(!body.html.includes("<script>"));
    assert.ok(!body.html.includes("<img src=x"));
    assert.match(body.html, /26 de octubre de 2026/);
    assert.match(body.html, /19:30/);
    assert.match(body.html, /hora de Ciudad de México/);
    assert.match(body.html, /General &amp; amigos/);
    assert.match(body.html, /src="cid:ticket-qr"/);
    assert.ok(!/src="(?:https?:|data:)/.test(body.html));
    assert.match(body.text, /Evento: Música & Arte <2026>/);
    assert.ok(body.text.includes(ticket.code));
    assert.equal(body.attachments.length, 1);
    const attachment = body.attachments[0];
    assert.equal(attachment.content_id, "ticket-qr");
    assert.equal(attachment.content_type, "image/png");
    assert.equal(attachment.filename, "entrada-qr.png");
    const png = Buffer.from(attachment.content, "base64");
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.format, "raw");
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    assert.equal(decoded?.data, ticket.code);
});

test("rejects missing server configuration without making requests", async () => {
  for (const missing of [{}, { apiKey: "test" }, { from: "test@example.com" }, { ...config, apiKey: " " }]) {
    await assert.rejects(sendTicketEmail(ticket, missing, () => assert.fail("must not send")), /configuration/);
  }
});

test("retries transient API failures with identical payload and idempotency key", async () => {
  for (const status of [429, 500, 503]) {
    const requests = [];
    await sendTicketEmail(ticket, config, async (_url, options) => {
      requests.push(options);
      return requests.length === 1 ? new Response("provider error", { status }) : accepted();
    });
    assert.equal(requests.length, 2);
    assert.equal(requests[0].body, requests[1].body);
    assert.deepEqual(requests[0].headers, requests[1].headers);
    assert.notEqual(requests[0].signal, requests[1].signal);
  }
});

test("retries a lost response once, but stops after repeated network failures", async () => {
  let calls = 0;
  await sendTicketEmail(ticket, config, async () => {
    if (++calls === 1) throw new DOMException("timeout", "TimeoutError");
    return accepted();
  });
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(sendTicketEmail(ticket, config, async () => {
    calls++;
    throw new Error("secret provider details");
  }), /Ticket email request failed/);
  assert.equal(calls, 2);
});

test("does not retry permanent errors or expose the provider response", async () => {
  for (const status of [400, 401, 403, 409, 422]) {
    let calls = 0;
    await assert.rejects(sendTicketEmail(ticket, config, async () => {
      calls++;
      return new Response("secret provider details", { status });
    }), { message: `Ticket email rejected (${status})` });
    assert.equal(calls, 1);
  }
});

test("does not report success without an accepted email id", async () => {
  for (const result of [{}, { id: null }, { id: "" }]) {
    await assert.rejects(sendTicketEmail(ticket, config, async () => Response.json(result)), /Invalid ticket email response/);
  }
});
