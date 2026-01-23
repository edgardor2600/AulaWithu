const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../database/aula.db');
const migrationsPath = path.join(__dirname, '../../database/migrations');

console.log(`🗄️  Conectando a: ${dbPath}`);
const db = new Database(dbPath);

// Orden correcto de migraciones
const migrations = [
    '000_migration_control.sql',
    '001_initial_schema.sql',
    '002_add_indexes.sql',
    '003_add_auth_fields.sql',
    '004_add_admin_and_assignments.sql',
    '004b_fix_role_constraint.sql',
    '005_add_messaging_system.sql',
    '006_add_groups_and_enrollments.sql',
    '008_add_topics.sql'
];

console.log('🚀 Ejecutando migraciones...\n');

for (const file of migrations) {
    const filePath = path.join(migrationsPath, file);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Archivo no encontrado: ${file}`);
        continue;
    }

    console.log(`📄 Ejecutando: ${file}`);
    
    try {
        const sql = fs.readFileSync(filePath, 'utf-8');
        db.exec(sql);
        console.log(`   ✅ OK`);
    } catch (error) {
        // Ignorar errores de "already exists" o "duplicate column"
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate column') ||
            error.message.includes('UNIQUE constraint failed')) {
            console.log(`   ⏭️  Ya aplicada (omitiendo)`);
        } else {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
}

// Verificar tablas creadas
console.log('\n📊 Verificando tablas...');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tablas existentes:');
tables.forEach(t => console.log(`   - ${t.name}`));

db.close();
console.log('\n🎉 Migraciones completadas!');
