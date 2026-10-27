import assert from "node:assert/strict";
import test from "node:test";
import { validateRegistration, uuidPattern } from "../lib/registration.ts";

const ticketId = "11111111-1111-4111-8111-111111111111";
function form(values) { return values; }

test("normalizes attendee details before checking or submitting them", () => {
  const result = validateRegistration(form({ name: "  Ana López  ", email: " ANA@EXAMPLE.COM ", ticketTypeId: ticketId }));
  assert.deepEqual(result, { name: "Ana López", email: "ana@example.com", ticketTypeId: ticketId, fieldErrors: {} });
});

test("rejects empty, whitespace-only, malformed and oversized fields", () => {
  for (const values of [
    {},
    { name: " \t\n", email: "invalid", ticketTypeId: "bad-id" },
    { name: "a".repeat(201), email: `${"a".repeat(250)}@b.com`, ticketTypeId: "bad-id" },
  ]) {
    assert.deepEqual(Object.keys(validateRegistration(form(values)).fieldErrors).sort(), ["email", "name", "ticketTypeId"]);
  }
  for (const email of ["a b@example.com", "a@@example.com", "a@example", "@example.com"]) {
    assert.ok(validateRegistration(form({ name: "Ana", email, ticketTypeId: ticketId })).fieldErrors.email);
  }
});

test("rejects uploaded files in place of text and invalid route identifiers", () => {
  const data = form({ email: "ana@example.com", ticketTypeId: ticketId });
  data.name = new File(["Ana"], "name.txt");
  assert.ok(validateRegistration(data).fieldErrors.name);
  assert.equal(uuidPattern.test("../../organizador"), false);
  assert.equal(uuidPattern.test(ticketId), true);
});
