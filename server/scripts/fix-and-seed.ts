import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';

const dbPath = path.join(__dirname, '../../database/aula.db');
const db = new Database(dbPath);
console.log(`🔌 Conectando a: ${dbPath}`);

const fixAndCreateUsers = async () => {
    try {
        console.log('🔧 Verificando esquema...');
        
        // 1. Verificar columnas
        const columns = db.pragma('table_info(users)').map((c: any) => c.name);
        
        if (!columns.includes('username')) {
            console.log('   - Agregando columna username...');
            db.exec('ALTER TABLE users ADD COLUMN username TEXT;');
            db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_unique_username ON users(username) WHERE username IS NOT NULL;');
        }
        
        if (!columns.includes('password_hash')) {
            console.log('   - Agregando columna password_hash...');
            db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT;');
        }
        
        if (!columns.includes('active')) {
             db.exec('ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT 1;');
        }
        
        if (!columns.includes('last_login')) {
             db.exec('ALTER TABLE users ADD COLUMN last_login DATETIME;');
        }
        
        console.log('✅ Esquema verificado y reparado.');

        // 2. Crear credenciales
        const saltRounds = 10;
        const adminPass = await bcrypt.hash('123456', saltRounds);
        const commonPass = await bcrypt.hash('password123', saltRounds);

        console.log('🔑 Insertando usuarios...');

        const insertUser = db.prepare(`
            INSERT OR REPLACE INTO users (id, name, username, password_hash, role, email, active) 
            VALUES (?, ?, ?, ?, ?, ?, 1)
        `);

        // Admin
        insertUser.run('admin-id-123', 'Administrador', 'admin', adminPass, 'admin', 'admin@sistema.com');
        console.log('   ✅ Admin: admin / 123456');

        // Profesor
        insertUser.run('prof-id-456', 'Profesor García', 'prof.garcia', commonPass, 'teacher', 'profesor@escuela.com');
        console.log('   ✅ Profesor: prof.garcia / password123');

        // Estudiante Ana
        insertUser.run('est-id-789', 'Ana Martínez', 'ana.martinez', commonPass, 'student', 'ana@escuela.com');
        console.log('   ✅ Estudiante: ana.martinez / password123');
        
        // Estudiante Carlos
        insertUser.run('est-id-101', 'Carlos López', 'carlos.lopez', commonPass, 'student', 'carlos@escuela.com');
        console.log('   ✅ Estudiante: carlos.lopez / password123');

        console.log('\n🎉 ¡Base de datos lista! Ya puedes iniciar sesión.');

    } catch (error: any) {
        console.error('❌ Error crítico:', error.message);
    }
};

fixAndCreateUsers();
