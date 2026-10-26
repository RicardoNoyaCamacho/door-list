import assert from "node:assert/strict";
import test from "node:test";
import { validateRegistration, uuidPattern } from "../lib/registration.ts";

const ticketId = "11111111-1111-4111-8111-111111111111";
function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

test("normalizes attendee details before checking or submitting them", () => {
  const result = validateRegistration(form({ name: "  Ana López  ", email: " ANA@EXAMPLE.COM ", ticket_type_id: ticketId }));
  assert.deepEqual(result, { name: "Ana López", email: "ana@example.com", ticketTypeId: ticketId, fieldErrors: {} });
});

test("rejects empty, whitespace-only, malformed and oversized fields", () => {
  for (const values of [
    {},
    { name: " \t\n", email: "invalid", ticket_type_id: "bad-id" },
    { name: "a".repeat(201), email: `${"a".repeat(250)}@b.com`, ticket_type_id: "bad-id" },
  ]) {
    assert.deepEqual(Object.keys(validateRegistration(form(values)).fieldErrors).sort(), ["email", "name", "ticket_type_id"]);
  }
  for (const email of ["a b@example.com", "a@@example.com", "a@example", "@example.com"]) {
    assert.ok(validateRegistration(form({ name: "Ana", email, ticket_type_id: ticketId })).fieldErrors.email);
  }
});

test("rejects uploaded files in place of text and invalid route identifiers", () => {
  const data = form({ email: "ana@example.com", ticket_type_id: ticketId });
  data.set("name", new File(["Ana"], "name.txt"));
  assert.ok(validateRegistration(data).fieldErrors.name);
  assert.equal(uuidPattern.test("../../organizador"), false);
  assert.equal(uuidPattern.test(ticketId), true);
});
