const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../database/aula.db');
const db = new Database(dbPath);

console.log('Columnas de la tabla sessions:\n');
const columns = db.pragma('table_info(sessions)');
columns.forEach(col => {
    console.log(`  ${col.cid}. ${col.name} - ${col.type || 'TEXT'} ${col.dflt_value ? `(default: ${col.dflt_value})` : ''}`);
});

db.close();
