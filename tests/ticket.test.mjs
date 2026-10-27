import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import jsQR from "jsqr";
import sharp from "sharp";
import { isTicketCode, ticketPath, ticketStatusDetails, privateTicketHeaders } from "../lib/ticket.ts";
import { ticketQrDataUrl } from "../lib/ticket-qr.ts";

test("only full lowercase 256-bit codes can form a public ticket URL", () => {
  const code = randomBytes(32).toString("hex");
  assert.equal(isTicketCode(code), true);
  assert.equal(ticketPath(code), `/entradas/${code}`);
  for (const value of [null, undefined, 1, "", "1", "../organizador", "javascript:alert(1)", "a".repeat(63), "a".repeat(65), "A".repeat(64), `${code}\n`, `${code}%00`, "11111111-1111-4111-8111-111111111111"]) {
    assert.equal(isTicketCode(value), false);
    assert.throws(() => ticketPath(value), /no válido/);
  }
});

test("generated QR actually decodes to the exact bearer code without personal data", async () => {
  const code = randomBytes(32).toString("hex");
  const image = await ticketQrDataUrl(code);
  assert.ok(image.startsWith("data:image/svg+xml;base64,"));
  const svg = Buffer.from(image.split(",")[1], "base64");
  const { data, info } = await sharp(svg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  assert.ok(decoded, "QR must be scannable");
  assert.equal(decoded.data, code);
});

test("ticket states and privacy headers cover every supported status", () => {
  assert.deepEqual(Object.keys(ticketStatusDetails).sort(), ["revoke", "used", "valid"]);
  assert.match(ticketStatusDetails.used.description, /no permite otro acceso/);
  assert.match(ticketStatusDetails.revoke.description, /no permite el acceso/);
  assert.match(privateTicketHeaders["Cache-Control"], /private, no-store/);
  assert.equal(privateTicketHeaders["Referrer-Policy"], "no-referrer");
  assert.match(privateTicketHeaders["X-Robots-Tag"], /noindex, nofollow/);
});
