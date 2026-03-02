/**
 * Run migration 014 via PostgreSQL client
 */
import "dotenv/config";
import { query, closePool } from "./services/database/client.js";

const migration = `
CREATE TABLE IF NOT EXISTS pending_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  requested_date DATE,
  requested_time TIME,
  service TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_bookings_tenant ON pending_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_status ON pending_bookings(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_created ON pending_bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_call ON pending_bookings(call_id);
`;

async function runMigration() {
  console.log("Running migration 014_pending_bookings...");

  try {
    // Check if table exists by querying information_schema
    const result = await query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'pending_bookings'
      ) as exists`,
    );

    const tableExists = result.rows[0]?.exists;

    if (tableExists) {
      console.log("Table pending_bookings already exists!");
    } else {
      console.log("Creating pending_bookings table...");
      await query(migration);
      console.log("Migration completed successfully!");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

runMigration().catch(console.error);
