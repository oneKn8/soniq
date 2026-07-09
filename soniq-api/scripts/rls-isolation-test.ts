/**
 * RLS tenant-isolation integration test (throwaway local Postgres).
 *
 * Proves, against the REAL tenantQuery() path in src/services/database/pool.ts:
 *   1. Tenant A cannot READ tenant B's rows (RLS filters them out).
 *   2. Tenant A cannot WRITE tenant B's rows (RLS blocks the UPDATE).
 *   3. A system path (plain query, load ALL tenants) still sees every tenant.
 *
 * Run:
 *   DATABASE_URL=postgres://postgres:postgres@localhost:55432/soniq \
 *     npx tsx scripts/rls-isolation-test.ts
 */
import {
  query,
  tenantQueryAll,
  tenantQueryOne,
  tenantQueryCount,
  closePool,
} from "../src/services/database/pool.js";

const A_PHONE = "+19995550001";
const B_PHONE = "+19995550002";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  const label = ok ? "PASS" : "FAIL";
  if (!ok) failures++;
  console.log(`[${label}] ${name}${detail ? " -- " + detail : ""}`);
}

async function main() {
  // --- Seed via the owner/system path (plain query bypasses RLS) ---
  await query(`DELETE FROM contacts WHERE phone IN ($1,$2)`, [
    A_PHONE,
    B_PHONE,
  ]);
  await query(
    `DELETE FROM tenants
      WHERE business_name IN ('RLS_TEST_A','RLS_TEST_B')
         OR phone_number IN ($1,$2)`,
    [A_PHONE, B_PHONE],
  );

  const tA = await query<{ id: string }>(
    `INSERT INTO tenants (business_name, phone_number, greeting_standard)
     VALUES ('RLS_TEST_A', $1, 'hi') RETURNING id`,
    [A_PHONE],
  );
  const tB = await query<{ id: string }>(
    `INSERT INTO tenants (business_name, phone_number, greeting_standard)
     VALUES ('RLS_TEST_B', $1, 'hi') RETURNING id`,
    [B_PHONE],
  );
  const tenantA = tA.rows[0].id;
  const tenantB = tB.rows[0].id;
  console.log(`Seeded tenantA=${tenantA} tenantB=${tenantB}`);

  const cA = await query<{ id: string }>(
    `INSERT INTO contacts (tenant_id, phone, phone_normalized, name)
     VALUES ($1, $2, $2, 'Alice A') RETURNING id`,
    [tenantA, A_PHONE],
  );
  const cB = await query<{ id: string }>(
    `INSERT INTO contacts (tenant_id, phone, phone_normalized, name)
     VALUES ($1, $2, $2, 'Bob B') RETURNING id`,
    [tenantB, B_PHONE],
  );
  const contactA = cA.rows[0].id;
  const contactB = cB.rows[0].id;

  // --- 1. READ isolation: tenant A lists contacts -> only sees its own ---
  const aRows = await tenantQueryAll<{ id: string; name: string }>(
    tenantA,
    `SELECT id, name FROM contacts WHERE phone IN ($1,$2)`,
    [A_PHONE, B_PHONE],
  );
  check(
    "tenantA sees exactly its own contact",
    aRows.length === 1 && aRows[0].id === contactA,
    `got ${aRows.length} row(s): ${aRows.map((r) => r.name).join(",")}`,
  );

  // --- 1b. Tenant A directly targets tenant B's row by id -> RLS hides it ---
  const leaked = await tenantQueryOne<{ id: string }>(
    tenantA,
    `SELECT id FROM contacts WHERE id = $1`,
    [contactB],
  );
  check(
    "tenantA cannot read tenantB's row by id (RLS -> null)",
    leaked === null,
    leaked ? `LEAKED row ${leaked.id}` : "null as expected",
  );

  // --- 2. WRITE isolation: tenant A tries to update tenant B's contact ---
  const affected = await tenantQueryCount(
    tenantA,
    `UPDATE contacts SET name = 'HIJACKED' WHERE id = $1`,
    [contactB],
  );
  check(
    "tenantA cannot update tenantB's row (0 rows affected)",
    affected === 0,
    `${affected} row(s) affected`,
  );
  // Confirm B's row is untouched (read back via owner path).
  const bAfter = await query<{ name: string }>(
    `SELECT name FROM contacts WHERE id = $1`,
    [contactB],
  );
  check(
    "tenantB's row value unchanged after cross-tenant write attempt",
    bAfter.rows[0]?.name === "Bob B",
    `name is now '${bAfter.rows[0]?.name}'`,
  );

  // --- 2b. Tenant B sees only its own row (symmetry) ---
  const bRows = await tenantQueryAll<{ id: string }>(
    tenantB,
    `SELECT id FROM contacts WHERE phone IN ($1,$2)`,
    [A_PHONE, B_PHONE],
  );
  check(
    "tenantB sees exactly its own contact",
    bRows.length === 1 && bRows[0].id === contactB,
    `got ${bRows.length} row(s)`,
  );

  // --- 3. SYSTEM path: load ALL tenants via plain query (no RLS role) ---
  const allTenants = await query<{ id: string }>(
    `SELECT id FROM tenants WHERE business_name IN ('RLS_TEST_A','RLS_TEST_B')`,
  );
  check(
    "system path (plain query) loads ALL tenants across boundaries",
    allTenants.rows.length === 2,
    `saw ${allTenants.rows.length} tenants`,
  );

  // --- Cleanup ---
  await query(`DELETE FROM contacts WHERE phone IN ($1,$2)`, [
    A_PHONE,
    B_PHONE,
  ]);
  await query(
    `DELETE FROM tenants WHERE business_name IN ('RLS_TEST_A','RLS_TEST_B')`,
  );

  console.log("");
  if (failures === 0) {
    console.log("RESULT: ALL CHECKS PASSED -- RLS tenant isolation is enforced.");
  } else {
    console.log(`RESULT: ${failures} CHECK(S) FAILED.`);
  }
  await closePool();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error("Integration test crashed:", err);
  await closePool().catch(() => {});
  process.exit(2);
});
