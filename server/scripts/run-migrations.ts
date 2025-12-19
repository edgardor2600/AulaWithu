import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const dbPath = path.join(__dirname, '../../database/aula.db');
const migrationsPath = path.join(__dirname, '../../database/migrations');

console.log('🔄 Running database migrations...\n');

const db = new Database(dbPath);

// Get all migration files
const files = fs.readdirSync(migrationsPath)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`Found ${files.length} migration files\n`);

// Run each migration
files.forEach((file) => {
  console.log(`📄 Applying: ${file}`);
  const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
  
  try {
    db.exec(sql);
    console.log(`✅ Success: ${file}\n`);
  } catch (error: any) {
    console.error(`❌ Error in ${file}:`, error.message);
  }
});

db.close();
console.log('✅ All migrations completed!');
