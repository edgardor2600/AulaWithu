const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../database/aula.db');
const migrationsPath = path.join(__dirname, '../../database/migrations');

console.log(`🗄️  Conectando a: ${dbPath}`);
const db = new Database(dbPath);

// Ejecutar solo la migración 009
const migrationFile = '009_fix_sessions_schema.sql';
const filePath = path.join(migrationsPath, migrationFile);

console.log(`📄 Ejecutando: ${migrationFile}`);

try {
    const sql = fs.readFileSync(filePath, 'utf-8');
    db.exec(sql);
    console.log(`   ✅ OK - Columnas agregadas a sessions`);
} catch (error) {
    if (error.message.includes('duplicate column')) {
        console.log(`   ⏭️  Ya aplicada (columnas ya existen)`);
    } else {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

// Verificar columnas de sessions
console.log('\n📊 Verificando columnas de sessions:');
const columns = db.pragma('table_info(sessions)');
columns.forEach(col => {
    console.log(`   - ${col.name} (${col.type || 'TEXT'})`);
});

db.close();
console.log('\n🎉 Listo!');
