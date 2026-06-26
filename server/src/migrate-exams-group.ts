import { runQuery, closeDb } from './db/database';

async function migrate() {
  console.log('🚀 Starting DB migration to add group_id to exams table...');
  try {
    // 1. Add group_id column to exams table if it does not exist
    console.log('Adding group_id column to exams table...');
    await runQuery(`
      ALTER TABLE exams 
      ADD COLUMN IF NOT EXISTS group_id VARCHAR(255) REFERENCES groups(id) ON DELETE SET NULL;
    `);

    // 2. Add performance index
    console.log('Creating index for exams.group_id...');
    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_exams_group_id ON exams(group_id);
    `);

    console.log('✅ DB migration for group_id completed successfully!');
  } catch (error: any) {
    console.error('❌ DB migration failed:', error.message);
  } finally {
    await closeDb();
    process.exit(0);
  }
}

migrate();
