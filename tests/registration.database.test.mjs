import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

// An isolated, network-less container: never reads or modifies the linked project.
const container = `door-list-registration-test-${process.pid}`;
const image = process.env.REGISTRATION_TEST_POSTGRES_IMAGE || "postgres:16";
const owner = randomUUID();
const owner2 = randomUUID();
const today = "(clock_timestamp() at time zone 'America/Mexico_City')::date";
const startsAt = (offset = 1) => `((${today} + ${offset}) + time '00:01') at time zone 'America/Mexico_City'`;

function docker(args, input) {
  const result = spawnSync("docker", args, { input, encoding: "utf8", timeout: 60_000 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout);
  return result.stdout.trim();
}
// TCP skips the temporary socket-only server used during image initialization.
const psql = ["exec", "-i", "-e", "PGPASSWORD=isolated-test-only", container, "psql", "-h", "127.0.0.1", "-U", "postgres", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"];
const sql = (query) => docker(psql, query);
const rpc = (event, ticket, email = `${randomUUID()}@example.com`, name = "Ana") =>
  `select public.register_event_attendee('${event}', '${ticket}', '${name}', '${email}');`;
const register = (...args) => JSON.parse(sql(`set role anon; ${rpc(...args)}`));
const availability = (event) => JSON.parse(sql(`set role anon; select public.get_public_registration_event('${event}');`) || "null");
const count = (event) => Number(sql(`select count(*) from public.registrations where event_id = '${event}';`));
const ticketCount = (event) => Number(sql(`select count(*) from public.tickets t join public.registrations r on r.id = t.registration_id where r.event_id = '${event}';`));
const literal = (value) => value === null ? "null" : `'${value.replaceAll("'", "''")}'`;
const publicTicket = (code) => JSON.parse(sql(`set role anon; select public.get_public_ticket(${literal(code)});`) || "null");

function concurrent(query) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", psql, { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", error = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { error += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
    child.stdin.end(query);
  });
}

let eventTable = "event";

function fixture({ capacity = 2, offset = 1, status = "published" } = {}) {
  const event = randomUUID(), ticket = randomUUID();
  sql(`begin;
    insert into public.${eventTable} (id, owner_id, title, venue, capacity, starts_at, status)
      values ('${event}', '${owner}', 'Evento de prueba', 'CDMX', ${capacity}, ${startsAt(offset)}, '${status}');
    insert into public.ticket_types (id, event_id, name, capacity) values ('${ticket}', '${event}', 'General', ${capacity});
    commit;`);
  return { event, ticket };
}

test("public registration database integration", { timeout: 120_000 }, async (t) => {
  docker(["run", "--rm", "-d", "--name", container, "--network", "none", "-e", "POSTGRES_PASSWORD=isolated-test-only", image]);
  try {
    for (let attempt = 0; ; attempt++) {
      try { sql("select 1;"); break; } catch (error) {
        if (attempt === 40) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    sql(`create role anon nologin; create role authenticated nologin;
      create schema auth; create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
      insert into auth.users values ('${owner}'), ('${owner2}');`);
    const migrations = new URL("../supabase/migrations/", import.meta.url);
    const files = readdirSync(migrations).filter((file) => file.endsWith(".sql")).sort();
    // Verify the pending compatibility migration preserves existing capacities.
    sql(readFileSync(new URL(files[0], migrations), "utf8"));
    const existing = fixture({ capacity: 20 });
    sql(`update public.event set capacity = 99 where id = '${existing.event}';`);
    for (const file of files.slice(1)) {
      if (file.endsWith("_issue_registration_tickets.sql")) {
        assert.equal(register(existing.event, existing.ticket, "legacy@example.com").code, "success");
      }
      sql(readFileSync(new URL(file, migrations), "utf8"));
      if (file.endsWith("_rename_event_to_events.sql")) eventTable = "events";
    }
    assert.equal(Number(sql(`select capacity from public.events where id = '${existing.event}';`)), 99);

    await t.test("backfills one valid, unpredictable ticket for each existing registration", () => {
      assert.equal(count(existing.event), 1);
      assert.equal(ticketCount(existing.event), 1);
      const code = sql(`select t.code from public.tickets t join public.registrations r on r.id = t.registration_id where r.event_id = '${existing.event}';`);
      assert.match(code, /^[0-9a-f]{64}$/);
      assert.equal(publicTicket(code).status, "valid");
      assert.equal(publicTicket(code).attendee.email, "legacy@example.com");
    });

    await t.test("today (including after start) and future are available; past, draft and missing are private", () => {
      for (const offset of [0, 1]) {
        const { event, ticket } = fixture({ offset });
        assert.equal(availability(event).id, event);
        assert.equal(register(event, ticket).code, "success");
      }
      for (const settings of [{ offset: -1 }, { status: "draft" }]) {
        const { event, ticket } = fixture(settings);
        assert.equal(availability(event), null);
        assert.equal(register(event, ticket).code, "event_unavailable");
        assert.equal(count(event), 0);
      }
      assert.equal(availability(randomUUID()), null);
      // UTC 02:00 still belongs to the previous calendar date in Mexico City.
      assert.equal(sql("select ('2026-10-27 02:00:00+00'::timestamptz at time zone 'America/Mexico_City')::date;"), "2026-10-26");
    });

    await t.test("validation, ownership of tickets, normalized uniqueness and minimum returned data", () => {
      const { event, ticket } = fixture();
      const other = fixture();
      assert.equal(register(event, ticket, "bad-email").code, "invalid_input");
      assert.equal(register(event, ticket, "ana@example.com", "   ").code, "invalid_input");
      assert.equal(register(event, other.ticket).code, "ticket_unavailable");
      assert.equal(register(event, ticket, " ANA@EXAMPLE.COM ", " Ana ").code, "success");
      assert.equal(register(event, ticket, "ana@example.com").code, "duplicate");
      assert.equal(count(event), 1);
      assert.equal(ticketCount(event), 1);
      assert.equal(sql(`select name || ':' || email from public.registrations where event_id = '${event}';`), "Ana:ana@example.com");
      const publicData = JSON.stringify(availability(event));
      assert.ok(!publicData.includes("ana@example.com") && !publicData.includes(owner));
      assert.equal(availability(event).ticket_types[0].remaining, 1);
    });

    await t.test("rechecks unpublished, past, deleted and sold-out choices after initial read", () => {
      const { event, ticket } = fixture({ capacity: 1 });
      assert.equal(availability(event).ticket_types[0].remaining, 1);
      sql(`update public.events set status = 'draft' where id = '${event}';`);
      assert.equal(register(event, ticket).code, "event_unavailable");
      sql(`update public.events set status = 'published', starts_at = ${startsAt(-1)} where id = '${event}';`);
      assert.equal(register(event, ticket).code, "event_unavailable");
      sql(`update public.events set starts_at = ${startsAt()} where id = '${event}';`);
      assert.equal(register(event, ticket).code, "success");
      assert.equal(register(event, ticket).code, "ticket_unavailable");
      assert.equal(count(event), 1);
      assert.equal(ticketCount(event), 1);
      const removed = fixture({ capacity: 2 });
      const spare = randomUUID();
      sql(`begin; update public.ticket_types set capacity = 1 where id = '${removed.ticket}';
        insert into public.ticket_types (id, event_id, name, capacity) values ('${spare}', '${removed.event}', 'Otra', 1); commit;
        delete from public.ticket_types where id = '${removed.ticket}';`);
      assert.equal(register(removed.event, removed.ticket).code, "ticket_unavailable");
      assert.equal(register(removed.event, spare).code, "success");
    });

    await t.test("two concurrent requests for the last spot create exactly one attendee", async () => {
      const { event, ticket } = fixture({ capacity: 1 });
      // Keep the first transaction open to ensure the second must wait on it.
      const first = concurrent(`begin; set role anon; ${rpc(event, ticket)} select pg_sleep(0.5); commit;`);
      const second = concurrent(`set role anon; ${rpc(event, ticket)}`);
      const results = await Promise.all([first, second]);
      assert.deepEqual(results.map((value) => JSON.parse(value).code).sort(), ["success", "ticket_unavailable"]);
      assert.equal(count(event), 1);
    });

    await t.test("concurrent retries of an email, even across tickets, create only one record", async () => {
      const { event, ticket } = fixture({ capacity: 4 });
      const secondTicket = randomUUID();
      sql(`begin; update public.ticket_types set capacity = 2 where id = '${ticket}';
        insert into public.ticket_types (id, event_id, name, capacity) values ('${secondTicket}', '${event}', 'VIP', 2); commit;`);
      const results = await Promise.all([
        concurrent(`begin; set role anon; ${rpc(event, ticket, "same@example.com")} select pg_sleep(0.5); commit;`),
        concurrent(`set role anon; ${rpc(event, secondTicket, "SAME@example.com")}`),
      ]);
      assert.deepEqual(results.map((value) => JSON.parse(value).code).sort(), ["duplicate", "success"]);
      assert.equal(count(event), 1);
    });

    await t.test("protects existing attendees against capacity reductions, deletion and reassignment", () => {
      const { event, ticket } = fixture();
      register(event, ticket); register(event, ticket);
      const organizer = `set role authenticated; set request.jwt.claim.sub = '${owner}';`;
      assert.throws(() => sql(`${organizer} update public.ticket_types set capacity = 1 where id = '${ticket}';`), /menor que sus registros/);
      assert.throws(() => sql(`${organizer} update public.events set capacity = 1 where id = '${event}';`), /menor que sus registros/);
      assert.throws(() => sql(`${organizer} delete from public.ticket_types where id = '${ticket}';`), /foreign key constraint/);
      assert.throws(() => sql(`${organizer} delete from public.events where id = '${event}';`), /foreign key constraint/);
      const other = fixture();
      assert.throws(() => sql(`update public.ticket_types set event_id = '${other.event}', name = 'Moved' where id = '${ticket}';`), /foreign key constraint/);
    });

    await t.test("capacity changes racing with registration cannot leave an overbooked ticket", async () => {
      const { event, ticket } = fixture({ capacity: 2 });
      assert.equal(register(event, ticket).code, "success");
      const results = await Promise.allSettled([
        concurrent(`begin; set role anon; ${rpc(event, ticket)} select pg_sleep(0.5); commit;`),
        concurrent(`update public.ticket_types set capacity = 1 where id = '${ticket}';`),
      ]);
      assert.equal(results[0].status, "fulfilled");
      assert.ok(["success", "ticket_unavailable"].includes(JSON.parse(results[0].value).code));
      assert.ok(count(event) <= Number(sql(`select capacity from public.ticket_types where id = '${ticket}';`)));
      if (results[1].status === "rejected") assert.match(results[1].reason.message, /menor que sus registros/);
    });

    await t.test("anonymous and authenticated clients cannot access personal data or write directly", () => {
      const { event, ticket } = fixture();
      for (const role of ["anon", "authenticated"]) {
        if (role === "anon") assert.throws(() => sql(`set role ${role}; select * from public.registrations;`), /permission denied/);
        else assert.equal(sql("set role authenticated; select count(*) from public.registrations;"), "0");
        assert.throws(() => sql(`set role ${role}; insert into public.registrations (event_id, ticket_type_id, name, email)
          values ('${event}', '${ticket}', 'Bypass', 'bypass@example.com');`), /permission denied/);
        assert.throws(() => sql(`set role ${role}; update public.registrations set email = 'changed@example.com';`), /permission denied/);
        assert.throws(() => sql(`set role ${role}; delete from public.registrations;`), /permission denied/);
        assert.equal(JSON.parse(sql(`set role ${role}; ${rpc(event, ticket)}`)).code, "success");
      }
      assert.equal(count(event), 2);
    });

    await t.test("dashboard exposes attendees and accurate paginated totals only to the event owner", () => {
      const { event, ticket } = fixture({ capacity: 1100 });
      const emptyTicket = randomUUID();
      sql(`begin;
        update public.ticket_types set capacity = 1090 where id = '${ticket}';
        insert into public.ticket_types (id, event_id, name, capacity) values ('${emptyTicket}', '${event}', 'VIP', 10);
        insert into public.registrations (event_id, ticket_type_id, name, email)
          select '${event}', '${ticket}', 'Asistente ' || n, 'attendee' || n || '@example.com'
          from generate_series(1, 1005) n;
        commit;`);
      const context = (id) => `set role authenticated; set request.jwt.claim.sub = '${id}';`;
      const dashboard = (id, offset = 0) => JSON.parse(sql(`${context(id)} select public.get_organizer_event('${event}', ${offset});`) || "null");
      const detail = dashboard(owner);
      assert.equal(detail.id, event);
      assert.equal(detail.registration_count, 1005);
      assert.equal(detail.registrations.length, 50);
      assert.equal(detail.ticket_types.find((type) => type.id === ticket).registration_count, 1005);
      assert.equal(detail.ticket_types.find((type) => type.id === emptyTicket).registration_count, 0);
      assert.equal(detail.ticket_types.find((type) => type.id === emptyTicket).capacity, 10);
      assert.equal(dashboard(owner, 1000).registrations.length, 5);
      assert.equal(dashboard(owner, 1050).registrations.length, 0);
      assert.equal(dashboard(owner, 1050).registration_count, 1005);
      const secondPage = dashboard(owner, 50);
      assert.ok(secondPage.registrations.every((r) => !detail.registrations.some((first) => first.id === r.id)));
      assert.equal(sql(`${context(owner)} select count(*) from public.registrations where event_id = '${event}';`), "1005");
      assert.equal(dashboard(owner2), null);
      assert.equal(sql(`${context(owner2)} select count(*) from public.registrations where event_id = '${event}';`), "0");
      assert.equal(sql(`set role authenticated; select public.get_organizer_event('${event}');`), "");
      assert.throws(() => sql(`set role anon; select public.get_organizer_event('${event}');`), /permission denied/);
      assert.equal(sql(`${context(owner)} select public.get_organizer_event('${randomUUID()}');`), "");
      sql(`update public.events set status = 'draft' where id = '${event}';`);
      assert.equal(dashboard(owner).registration_count, 1005);
      assert.equal(dashboard(owner2), null);
      const empty = fixture({ status: "draft" });
      const emptyDetail = JSON.parse(sql(`${context(owner)} select public.get_organizer_event('${empty.event}');`));
      assert.equal(emptyDetail.registration_count, 0);
      assert.deepEqual(emptyDetail.registrations, []);
      assert.equal(emptyDetail.ticket_types[0].registration_count, 0);
    });

    await t.test("registration issues exactly one ticket and duplicate emails never reveal its code", () => {
      const { event, ticket } = fixture();
      const issued = register(event, ticket, "ticket@example.com");
      assert.equal(issued.code, "success");
      assert.match(issued.ticket_code, /^[0-9a-f]{64}$/);
      assert.deepEqual(register(event, ticket, "TICKET@example.com"), { code: "duplicate" });
      assert.equal(ticketCount(event), 1);
      const entry = publicTicket(issued.ticket_code);
      assert.equal(entry.code, issued.ticket_code);
      assert.equal(entry.status, "valid");
      assert.deepEqual(entry.attendee, { name: "Ana", email: "ticket@example.com" });
      assert.equal(entry.event.title, "Evento de prueba");
      assert.equal(entry.ticket_type.name, "General");
      assert.ok(!JSON.stringify(entry).includes(owner));
      const another = register(event, ticket, "another@example.com");
      assert.notEqual(another.ticket_code, issued.ticket_code);
      assert.equal(ticketCount(event), 2);
      const registrationId = sql(`select registration_id from public.tickets where code = '${issued.ticket_code}';`);
      assert.throws(() => sql(`insert into public.tickets (registration_id) values ('${registrationId}');`), /tickets_registration_id_key/);
      assert.throws(() => sql(`insert into public.tickets (registration_id, code) values ('${randomUUID()}', '${issued.ticket_code}');`), /tickets_code_key/);
    });

    await t.test("ticket issuance failure rolls back the attendee and preserves available capacity", () => {
      const { event, ticket } = fixture();
      assert.throws(() => sql(`begin;
        create function pg_temp.reject_test_ticket() returns trigger language plpgsql as $$begin raise exception 'Simulated ticket issuance failure'; end;$$;
        create trigger reject_test_ticket before insert on public.tickets for each row execute function pg_temp.reject_test_ticket();
        set role anon; ${rpc(event, ticket)} commit;`), /Simulated ticket issuance failure/);
      assert.equal(count(event), 0);
      assert.equal(ticketCount(event), 0);
      assert.equal(availability(event).ticket_types[0].remaining, 2);
      assert.equal(register(event, ticket).code, "success");
      assert.equal(ticketCount(event), 1);
    });

    await t.test("invalid, truncated, guessed and enumerable identifiers disclose no ticket details", () => {
      const { event, ticket } = fixture();
      const issued = register(event, ticket);
      const registrationId = sql(`select registration_id from public.tickets where code = '${issued.ticket_code}';`);
      const ticketId = sql(`select id from public.tickets where code = '${issued.ticket_code}';`);
      for (const value of [null, "", "%", "*", "' OR 1=1 --", "1", registrationId, ticketId, event, "ana@example.com", issued.ticket_code.slice(0, 32), issued.ticket_code.toUpperCase(), `${issued.ticket_code}\n`, "0".repeat(64)]) {
        assert.equal(publicTicket(value), null);
      }
      assert.throws(() => sql("set role anon; select public.get_public_ticket();"), /does not exist/);
      assert.throws(() => sql("set role anon; select public.generate_entry_code();"), /permission denied/);
    });

    await t.test("reads current valid, used and revoke states without changing ticket identity", () => {
      const { event, ticket } = fixture();
      const { ticket_code: code } = register(event, ticket);
      for (const status of ["valid", "used", "revoke"]) {
        sql(`update public.tickets set status = '${status}' where code = '${code}';`);
        assert.equal(publicTicket(code).status, status);
        assert.equal(publicTicket(code).code, code);
      }
      assert.throws(() => sql(`update public.tickets set status = 'revoked' where code = '${code}';`), /check constraint/);
      assert.throws(() => sql(`update public.tickets set code = '${"a".repeat(64)}' where code = '${code}';`), /identidad de una entrada/);
      assert.throws(() => sql(`update public.tickets set registration_id = '${randomUUID()}' where code = '${code}';`), /identidad de una entrada/);
      // Tickets remain readable after the registration period or publication ends.
      sql(`update public.events set status = 'draft', starts_at = ${startsAt(-1)} where id = '${event}';`);
      assert.equal(publicTicket(code).status, "revoke");
    });

    await t.test("public roles cannot list, forge, duplicate or change tickets", () => {
      const { event, ticket } = fixture();
      const { ticket_code: code } = register(event, ticket);
      const registrationId = sql(`select registration_id from public.tickets where code = '${code}';`);
      for (const role of ["anon", "authenticated"]) {
        assert.throws(() => sql(`set role ${role}; select * from public.tickets;`), /permission denied/);
        assert.throws(() => sql(`set role ${role}; insert into public.tickets (registration_id, code) values ('${registrationId}', '${"a".repeat(64)}');`), /permission denied/);
        assert.throws(() => sql(`set role ${role}; update public.tickets set status = 'used' where code = '${code}';`), /permission denied/);
        assert.throws(() => sql(`set role ${role}; delete from public.tickets where code = '${code}';`), /permission denied/);
        assert.equal(JSON.parse(sql(`set role ${role}; select public.get_public_ticket('${code}');`)).code, code);
      }
      assert.equal(publicTicket(code).status, "valid");
      assert.equal(Number(sql("select count(*) from public.registrations r left join public.tickets t on t.registration_id = r.id where t.id is null;")), 0);
      assert.equal(Number(sql("select count(*) - count(distinct code) from public.tickets;")), 0);
    });
  } finally {
    docker(["stop", "--time", "1", container]);
  }
});
