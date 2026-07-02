require('dotenv').config();
const { Pool, types } = require('pg');
// Read raw strings, no Date parsing
types.setTypeParser(1114, v => v);
types.setTypeParser(1184, v => v);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const res = await pool.query(
    "SELECT id, title, available_from, available_to FROM exams WHERE available_from IS NOT NULL ORDER BY created_at DESC"
  );

  console.log('\n=== RAW DB VALUES (after all fixes) ===');
  for (const row of res.rows) {
    console.log(`\n${row.title}:`);
    console.log(`  available_from (raw): ${row.available_from}`);
    console.log(`  available_to   (raw): ${row.available_to}`);
    // Interpret as Colombia time (what the user sees)
    if (row.available_from) {
      const d = new Date(row.available_from.replace(' ', 'T') + '-05:00');
      console.log(`  → Colombia display: ${d.toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' })}`);
    }
  }

  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
