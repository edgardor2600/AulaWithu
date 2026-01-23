/**
 * 🚀 SCRIPT DE MIGRACIÓN A POSTGRESQL
 * 
 * Este script ejecuta todas las migraciones en orden en Supabase
 * 
 * Ejecución: npx ts-node scripts/migrate-to-postgres.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigrations() {
  console.log('\n🚀 ========================================');
  console.log('   MIGRACIÓN A POSTGRESQL');
  console.log('========================================\n');

  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL no configurado');
    process.exit(1);
  }

  // Conexión a PostgreSQL
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Verificar conexión
    console.log('🔗 Conectando a Supabase...');
    await pool.query('SELECT NOW()');
    console.log('✅ Conexión establecida\n');

    // Leer archivos de migración
    const migrationsDir = path.join(__dirname, '../../database/migrations-postgres');
    
    if (!fs.existsSync(migrationsDir)) {
      console.error(`❌ No existe el directorio: ${migrationsDir}`);
      process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.error('❌ No se encontraron archivos de migración');
      process.exit(1);
    }

    console.log(`📁 Encontradas ${files.length} migraciones:\n`);
    files.forEach(f => console.log(`   - ${f}`));
    console.log('');

    // Ejecutar cada migración
    for (const file of files) {
      console.log(`📄 Ejecutando: ${file}`);
      
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      try {
        await pool.query(sql);
        console.log(`   ✅ ${file} completado`);
      } catch (error: any) {
        // Si es un error de "ya existe", ignorar
        if (error.code === '42P07' || error.message.includes('already exists')) {
          console.log(`   ⚠️  ${file} - objetos ya existen (saltando)`);
        } else {
          console.error(`   ❌ Error en ${file}:`, error.message);
          throw error;
        }
      }
    }

    // Verificar tablas creadas
    console.log('\n📊 Verificando tablas creadas...\n');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`✅ Tablas creadas (${tablesResult.rows.length}):`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    await pool.end();

    console.log('\n✅ ========================================');
    console.log('   ¡MIGRACIONES COMPLETADAS!');
    console.log('========================================\n');

    console.log('📝 Próximos pasos:');
    console.log('   1. Crear usuarios iniciales: npx ts-node scripts/seed-postgres.ts');
    console.log('   2. Modificar database.ts para usar PostgreSQL');
    console.log('   3. Actualizar repositorios a async/await');
    console.log('   4. Probar el servidor: npm run dev\n');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ ========================================');
    console.error('   ERROR EN MIGRACIÓN');
    console.error('========================================\n');
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
