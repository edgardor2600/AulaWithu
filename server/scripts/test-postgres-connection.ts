/**
 * 🧪 SCRIPT DE TEST DE CONEXIÓN A POSTGRESQL/SUPABASE
 * 
 * Este script verifica que:
 * 1. La variable DATABASE_URL esté configurada
 * 2. La conexión a Supabase funcione
 * 3. Podemos ejecutar queries básicas
 * 
 * Ejecutar: npx ts-node scripts/test-postgres-connection.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testConnection() {
  console.log('\n🔍 ========================================');
  console.log('   TEST DE CONEXIÓN A POSTGRESQL');
  console.log('========================================\n');

  // Verificar que DATABASE_URL exista
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL no está configurado en .env');
    console.error('');
    console.error('👉 Solución:');
    console.error('   1. Abre el archivo server/.env');
    console.error('   2. Verifica que exista la línea DATABASE_URL=postgresql://...');
    console.error('   3. Asegúrate de que la contraseña sea correcta');
    console.error('');
    process.exit(1);
  }

  // Mostrar info de conexión (ocultar contraseña)
  const urlParts = DATABASE_URL.split('@');
  const safeUrl = urlParts.length > 1 
    ? `postgresql://postgres:***@${urlParts[1]}` 
    : 'URL inválida';
  
  console.log('📍 URL de conexión:', safeUrl);
  console.log('');

  // Crear pool de conexiones
  console.log('🔗 Intentando conectar a Supabase...');
  const pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Necesario para Supabase
    }
  });

  try {
    // Test 1: Conexión básica
    console.log('📡 Test 1: Conexión básica...');
    const client = await pool.connect();
    console.log('   ✅ Conexión establecida');
    client.release();

    // Test 2: Query de tiempo del servidor
    console.log('📡 Test 2: Query de tiempo del servidor...');
    const timeResult = await pool.query('SELECT NOW() as server_time, version() as pg_version');
    console.log('   ✅ Server Time:', timeResult.rows[0].server_time);
    console.log('   ✅ PostgreSQL Version:', timeResult.rows[0].pg_version.split(' ')[0] + ' ' + timeResult.rows[0].pg_version.split(' ')[1]);

    // Test 3: Crear tabla de prueba
    console.log('📡 Test 3: Creando tabla de prueba...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _test_connection (
        id SERIAL PRIMARY KEY,
        message VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Tabla _test_connection creada');

    // Test 4: Insertar dato
    console.log('📡 Test 4: Insertando dato de prueba...');
    const insertResult = await pool.query(
      `INSERT INTO _test_connection (message) VALUES ($1) RETURNING id, message, created_at`,
      ['¡Conexión exitosa desde AppAula!']
    );
    console.log('   ✅ Dato insertado con ID:', insertResult.rows[0].id);

    // Test 5: Leer dato
    console.log('📡 Test 5: Leyendo dato...');
    const selectResult = await pool.query(
      `SELECT * FROM _test_connection WHERE id = $1`,
      [insertResult.rows[0].id]
    );
    console.log('   ✅ Dato leído:', selectResult.rows[0].message);

    // Test 6: Limpiar tabla de prueba
    console.log('📡 Test 6: Limpiando tabla de prueba...');
    await pool.query('DROP TABLE _test_connection');
    console.log('   ✅ Tabla eliminada');

    // Cerrar conexión
    await pool.end();

    console.log('\n✅ ========================================');
    console.log('   ¡TODOS LOS TESTS PASARON!');
    console.log('   La conexión a Supabase funciona perfectamente');
    console.log('========================================\n');

    console.log('📝 Próximos pasos:');
    console.log('   1. Ejecutar migraciones: npm run migrate:postgres');
    console.log('   2. Crear datos iniciales: npm run seed:postgres');
    console.log('   3. Iniciar servidor: npm run dev');
    console.log('');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ ========================================');
    console.error('   ERROR DE CONEXIÓN');
    console.error('========================================\n');
    
    if (error.code === 'ENOTFOUND') {
      console.error('❌ No se pudo encontrar el servidor');
      console.error('👉 Verifica que el URL sea correcto');
      console.error('👉 Verifica tu conexión a internet');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Conexión rechazada');
      console.error('👉 Verifica que el puerto sea correcto (5432)');
    } else if (error.message.includes('password authentication failed')) {
      console.error('❌ Contraseña incorrecta');
      console.error('👉 Verifica la contraseña en .env');
      console.error('👉 La contraseña actual intenta: perromuerto05');
    } else {
      console.error('❌ Error:', error.message);
      console.error('');
      console.error('📄 Detalles completos del error:');
      console.error(error);
    }

    await pool.end();
    process.exit(1);
  }
}

// Ejecutar test
testConnection();
