const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../database/aula.db');
const db = new Database(dbPath);

console.log('🔧 Applying migrations manually...\n');

// Check if academic_levels table exists
try {
  db.prepare('SELECT * FROM academic_levels LIMIT 1').get();
  console.log('✅ academic_levels table already exists');
} catch (error) {
  console.log('📦 Creating academic_levels table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS academic_levels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ academic_levels table created');
}

// Check if users.level_id exists
const usersColumns = db.prepare('PRAGMA table_info(users)').all();
const hasUserLevelId = usersColumns.some(col => col.name === 'level_id');

if (!hasUserLevelId) {
  console.log('📦 Adding level_id to users table...');
  db.exec('ALTER TABLE users ADD COLUMN level_id TEXT REFERENCES academic_levels(id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_level ON users(level_id) WHERE role = \'student\';');
  console.log('✅ level_id added to users');
} else {
  console.log('✅ users.level_id already exists');
}

// Check if classes.level_id exists
const classesColumns = db.prepare('PRAGMA table_info(classes)').all();
const hasClassLevelId = classesColumns.some(col => col.name === 'level_id');

if (!hasClassLevelId) {
  console.log('📦 Adding level_id to classes table...');
  db.exec('ALTER TABLE classes ADD COLUMN level_id TEXT REFERENCES academic_levels(id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level_id);');
  console.log('✅ level_id added to classes');
} else {
  console.log('✅ classes.level_id already exists');
}

// Check if groups.schedule_time exists
const groupsColumns = db.prepare('PRAGMA table_info(groups)').all();
const hasScheduleTime = groupsColumns.some(col => col.name === 'schedule_time');

if (!hasScheduleTime) {
  console.log('📦 Adding schedule_time to groups table...');
  db.exec('ALTER TABLE groups ADD COLUMN schedule_time TEXT;');
  console.log('✅ schedule_time added to groups');
} else {
  console.log('✅ groups.schedule_time already exists');
}

// Update migration tracking
db.exec(`
  INSERT OR IGNORE INTO schema_migrations (version, name) 
  VALUES (9, '009_add_academic_levels.sql');
`);

db.exec(`
  INSERT OR IGNORE INTO schema_migrations (version, name) 
  VALUES (10, '010_add_schedule_to_groups.sql');
`);

console.log('\n✅ All migrations applied successfully');

db.close();
