import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/aula.db');
const migrationsPath = path.join(__dirname, '../../database/migrations');

export const initializeDatabase = () => {
  const db = new Database(dbPath);
  
  console.log('🗄️  Initializing database...');
  
  // Read and execute migration control table first
  const controlMigration = fs.readFileSync(
    path.join(migrationsPath, '000_migration_control.sql'),
    'utf-8'
  );
  db.exec(controlMigration);
  
  // Get list of migration files
  const migrationFiles = fs.readdirSync(migrationsPath)
    .filter(f => f.endsWith('.sql') && f !== '000_migration_control.sql')
    .sort();
  
  // Check which migrations have been applied
  const appliedMigrations = db.prepare('SELECT version FROM schema_migrations').all();
  const appliedVersions = new Set(appliedMigrations.map((m: any) => m.version));
  
  // Apply pending migrations
  migrationFiles.forEach((file, index) => {
    const version = parseInt(file.split('_')[0]);
    
    if (!appliedVersions.has(version)) {
      console.log(`  ⚡ Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf-8');
      
      db.exec(sql);
      
      // Record migration
      db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(
        version,
        file
      );
      
      console.log(`  ✅ Migration ${file} applied successfully`);
    }
  });
  
  console.log('✅ Database initialized successfully\n');
  db.close();
};

export const seedDatabase = () => {
  const db = new Database(dbPath);
  const seedPath = path.join(__dirname, '../../database/seeds/dev-data.sql');
  
  console.log('🌱 Seeding database with development data...');
  
  const seedSQL = fs.readFileSync(seedPath, 'utf-8');
  
  try {
    db.exec(seedSQL);
    console.log('✅ Database seeded successfully\n');
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log('ℹ️  Seed data already exists, skipping...\n');
    } else {
      throw error;
    }
  }
  
  db.close();
};

// Run if called directly
if (require.main === module) {
  initializeDatabase();
  seedDatabase();
}
