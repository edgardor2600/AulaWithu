import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../database/aula.db');
const db = new Database(dbPath);

const tableInfo = db.pragma('table_info(users)');
tableInfo.forEach((col: any) => {
    console.log(`- ${col.name} (${col.type})`);
});
