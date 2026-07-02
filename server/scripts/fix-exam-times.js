require('dotenv').config();
const { Pool, types } = require('pg');
types.setTypeParser(1114, v => v);
types.setTypeParser(1184, v => v);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // These exams have UTC values stored as plain TIMESTAMP literals.
  // With the new system (treat as Colombia wall-clock), 13:40 = 1:40pm Colombia.
  // But the user set 8:40am Colombia, so we subtract 5h to get 08:40.
  const toFix = ['b2 12', 'b2-wrri'];

  for (const title of toFix) {
    // Subtract 5 hours using PostgreSQL interval
    const result = await pool.query(
      `UPDATE exams 
       SET available_from = available_from - INTERVAL '5 hours',
           available_to   = available_to   - INTERVAL '5 hours'
       WHERE title = $1 RETURNING title, available_from::text, available_to::text`,
      [title]
    );
    if (result.rows.length) {
      const r = result.rows[0];
      console.log(`\n✅ Fixed: ${r.title}`);
      console.log(`  New raw value: ${r.available_from} → ${r.available_to}`);
    } else {
      console.log(`Not found: ${title}`);
    }
  }

  // Verify
  console.log('\n=== FINAL VERIFICATION ===');
  const res = await pool.query(
    "SELECT title, status, available_from, available_to FROM exams WHERE available_from IS NOT NULL ORDER BY created_at DESC"
  );
  for (const row of res.rows) {
    if (row.available_from) {
      // Interpret raw value as Colombia wall-clock time (new system)
      const d = new Date(row.available_from.replace(' ', 'T') + '-05:00');
      console.log(`\n${row.title} [${row.status}]`);
      console.log(`  DB raw:    ${row.available_from}`);
      console.log(`  Colombia:  ${d.toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' })}`);
    }
  }

  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
