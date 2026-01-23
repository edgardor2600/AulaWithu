import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';

// Ruta a la base de datos
const dbPath = path.join(__dirname, '../../database/aula.db');
const db = new Database(dbPath);
console.log(`🔌 Conectando a: ${dbPath}`);

const createUsers = async () => {
    const saltRounds = 10;
    const adminPass = await bcrypt.hash('123456', saltRounds);
    const userPass = await bcrypt.hash('password123', saltRounds);
    const teacherPass = await bcrypt.hash('password123', saltRounds);

    console.log('🔑 Generando usuarios...');

    try {
        // 1. Insertar Admin
        const insertUser = db.prepare(`
            INSERT OR REPLACE INTO users (id, username, password_hash, role, name, email) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        insertUser.run(
            'admin-id-123', 
            'admin', 
            adminPass, 
            'admin', 
            'Administrador', 
            'admin@sistema.com'
        );
        console.log('✅ Admin creado: admin / 123456');

        // 2. Insertar Profesor
        insertUser.run(
            'prof-id-456', 
            'prof.garcia', 
            teacherPass, 
            'teacher', 
            'Profesor García', 
            'profesor@escuela.com'
        );
        console.log('✅ Profesor creado: prof.garcia / password123');

        // 3. Insertar Estudiante
        insertUser.run(
            'est-id-789', 
            'ana.martinez', 
            userPass, 
            'student', 
            'Ana Martínez', 
            'ana@escuela.com'
        );
        console.log('✅ Estudiante creado: ana.martinez / password123');

    } catch (error: any) {
        console.error('❌ Error insertando usuarios:', error.message);
        // Si no existe columna password_hash, intentar con password
        if (error.message.includes('password_hash')) {
             console.log('⚠️  Intentando con columna "password"...');
             const insertUser = db.prepare(`
                INSERT OR REPLACE INTO users (id, username, password, role, name, email) 
                VALUES (?, ?, ?, ?, ?, ?)
            `);
             insertUser.run(
                'admin-id-123', 
                'admin', 
                adminPass, 
                'admin', 
                'Administrador', 
                'admin@sistema.com'
            );
            console.log('✅ Admin creado (columna password)');
        }
    }
};

createUsers();
