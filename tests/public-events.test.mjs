import assert from "node:assert/strict";
import test from "node:test";
import { registrationDayStart } from "../lib/public-events.ts";

test("registration opens for the entire Mexico City date, including earlier event times", () => {
  assert.equal(registrationDayStart(new Date("2026-10-26T23:00:00Z")), "2026-10-26T06:00:00.000Z");
  assert.equal(registrationDayStart(new Date("2026-10-27T05:59:59Z")), "2026-10-26T06:00:00.000Z");
  assert.equal(registrationDayStart(new Date("2026-10-27T06:00:00Z")), "2026-10-27T06:00:00.000Z");
});

test("date boundaries handle year changes and the historical timezone offset at midnight", () => {
  assert.equal(registrationDayStart(new Date("2027-01-01T05:59:59Z")), "2026-12-31T06:00:00.000Z");
  assert.equal(registrationDayStart(new Date("2027-01-01T06:00:00Z")), "2027-01-01T06:00:00.000Z");
  assert.equal(registrationDayStart(new Date("2021-04-04T20:00:00Z")), "2021-04-04T06:00:00.000Z");
  assert.equal(registrationDayStart(new Date("2021-10-31T20:00:00Z")), "2021-10-31T05:00:00.000Z");
});
