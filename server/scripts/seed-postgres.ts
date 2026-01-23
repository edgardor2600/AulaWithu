/**
 * 🌱 SCRIPT DE SEED PARA POSTGRESQL
 * 
 * Crea usuarios iniciales: admin, teacher, students
 * 
 * Ejecución: npx ts-node scripts/seed-postgres.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function seedDatabase() {
  console.log('\n🌱 ========================================');
  console.log('   SEED DE DATOS INICIALES');
  console.log('========================================\n');

  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL no configurado');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Conectando a Supabase...\n');

    // Limpiar datos anteriores (solo en desarrollo)
    console.log('🧹 Limpiando datos anteriores...');
    await pool.query('DELETE FROM users WHERE id LIKE $1', ['%-seed']);
    console.log('✅ Datos anteriores eliminados\n');

    // Crear usuarios
    console.log('👥 Creando usuarios...\n');

    // 1. ADMIN
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO users (id, name, username, password_hash, role, avatar_color, active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role
    `, ['admin-001', 'Administrador', 'admin', adminPassword, 'admin', '#1e293b', 1]);
    console.log('✅ Admin creado (username: admin, password: admin123)');

    // 2. TEACHER
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    await pool.query(`
      INSERT INTO users (id, name, username, password_hash, role, avatar_color, active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role
    `, ['teacher-001', 'Prof. García', 'teacher', teacherPassword, 'teacher', '#3b82f6', 1]);
    console.log('✅ Teacher creado (username: teacher, password: teacher123)');

    // 3. STUDENTS
    const students = [
      { id: 'student-001', name: 'Ana Martínez', username: 'ana', color: '#ef4444' },
      { id: 'student-002', name: 'Carlos López', username: 'carlos', color: '#10b981' },
      { id: 'student-003', name: 'María Rodríguez', username: 'maria', color: '#f59e0b' },
      { id: 'student-004', name: 'Juan Pérez', username: 'juan', color: '#8b5cf6' },
      { id: 'student-005', name: 'Laura Gómez', username: 'laura', color: '#ec4899' }
    ];

    const studentPassword = await bcrypt.hash('student123', 10);
    
    for (const student of students) {
      await pool.query(`
        INSERT INTO users (id, name, username, password_hash, role, avatar_color, active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          username = EXCLUDED.username,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role
      `, [student.id, student.name, student.username, studentPassword, 'student', student.color, 1]);
      console.log(`✅ Student creado (username: ${student.username}, password: student123)`);
    }

    // Asignar estudiantes al profesor
    console.log('\n🔗 Asignando estudiantes al profesor...');
    for (const student of students) {
      await pool.query(`
        INSERT INTO teacher_students (id, teacher_id, student_id, assigned_by, active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (teacher_id, student_id) DO NOTHING
      `, [`ts-${student.id}`, 'teacher-001', student.id, 'admin-001', 1]);
    }
    console.log('✅ Estudiantes asignados');

    // Crear clase de ejemplo
    console.log('\n📚 Creando clase de ejemplo...');
    await pool.query(`
      INSERT INTO classes (id, title, description, teacher_id, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description
    `, [
      'class-001',
      'English Level A1 - Unit 1',
      'Introduction to basic greetings and vocabulary',
      'teacher-001'
    ]);
    console.log('✅ Clase creada');

    // Crear tópico de ejemplo
    console.log('\n📖 Creando tópico de ejemplo...');
    await pool.query(`
      INSERT INTO topics (id, class_id, title, description, topic_number, active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (class_id, topic_number) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description
    `, [
      'topic-001',
      'class-001',
      'Greetings',
      'Basic greetings and introductions',
      1,
      1
    ]);
    console.log('✅ Tópico creado');

    // Crear slides de ejemplo
    console.log('\n📄 Creando slides de ejemplo...');
    const slides = [
      { id: 'slide-001', number: 1, title: 'Welcome', topic: 'topic-001' },
      { id: 'slide-002', number: 2, title: 'Vocabulary', topic: 'topic-001' },
      { id: 'slide-003', number: 3, title: 'Practice', topic: 'topic-001' }
    ];

    for (const slide of slides) {
      await pool.query(`
        INSERT INTO slides (id, class_id, slide_number, title, topic_id, canvas_data, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (class_id, slide_number) DO UPDATE SET
          title = EXCLUDED.title,
          topic_id = EXCLUDED.topic_id
      `, [slide.id, 'class-001', slide.number, slide.title, slide.topic, '{"version":"5.3.0","objects":[]}']);
      console.log(`✅ Slide ${slide.number} creado`);
    }

    await pool.end();

    console.log('\n✅ ========================================');
    console.log('   ¡SEED COMPLETADO!');
    console.log('========================================\n');

    console.log('📝 Credenciales de acceso:\n');
    console.log('   👑 Admin:');
    console.log('      Username: admin');
    console.log('      Password: admin123\n');
    console.log('   👨‍🏫 Teacher:');
    console.log('      Username: teacher');
    console.log('      Password: teacher123\n');
    console.log('   👨‍🎓 Students:');
    console.log('      Usernames: ana, carlos, maria, juan, laura');
    console.log('      Password: student123 (todos)\n');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

seedDatabase();
