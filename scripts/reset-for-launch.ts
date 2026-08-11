/**
 * Clears operational app data so trainers start with an empty club setup.
 * Keeps schema / trainer login accounts (hardcoded in the client).
 *
 * Usage: npx tsx scripts/reset-for-launch.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "../server/db";
import * as schema from "../shared/schema";

async function main() {
  console.log("Resetting database for launch...");

  await db.transaction(async (tx) => {
    // Child / related tables first where FKs exist without cascade from all parents
    await tx.delete(schema.customAgendaEvents);
    await tx.delete(schema.ideeen);
    await tx.delete(schema.wedstrijden);
    await tx.delete(schema.ouderGesprekken);
    await tx.delete(schema.trainingSessions);
    await tx.delete(schema.sporterAttendanceArchives);
    await tx.delete(schema.sporterBlessures);
    await tx.delete(schema.sporters);
    await tx.delete(schema.onderdelenCatalog);
    await tx.delete(schema.appMeta);

    await tx.insert(schema.onderdelenCatalog).values({
      id: "default",
      data: {
        Vloer: [],
        Voltige: [],
        Ringen: [],
        Sprong: [],
        Brug: [],
        Rekstok: [],
      },
    });
  });

  const counts = await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM sporters) AS sporters,
      (SELECT count(*)::int FROM wedstrijden) AS wedstrijden,
      (SELECT count(*)::int FROM training_sessions) AS training_sessions,
      (SELECT count(*)::int FROM ouder_gesprekken) AS ouder_gesprekken,
      (SELECT count(*)::int FROM custom_agenda_events) AS agenda,
      (SELECT count(*)::int FROM ideeen) AS ideeen,
      (SELECT count(*)::int FROM onderdelen_catalog) AS catalog_rows
  `);

  console.log("Done. Row counts:", counts.rows?.[0] ?? counts);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
