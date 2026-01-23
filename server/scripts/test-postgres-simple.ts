/**
 * 🧪 SCRIPT DE DIAGNÓSTICO Y TEST DE CONEXIÓN MEJORADO
 * 
 * Ejecutar: npx ts-node scripts/test-postgres-simple.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testConnectionSimple() {
  console.log('\n🔍 DIAGNÓSTICO DE CONEXIÓN A SUPABASE\n');

  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL no está en .env');
    process.exit(1);
  }

  // Parsear URL para diagnóstico
  try {
    const url = new URL(DATABASE_URL.replace('postgresql://', 'http://'));
    console.log('📍 Host:', url.hostname);
    console.log('📍 Puerto:', url.port || '5432');
    console.log('📍 Base de datos:', url.pathname.substring(1));
    console.log('📍 Usuario:', url.username);
    console.log('📍 Contraseña:', url.password ? '***' + url.password.substring(url.password.length - 3) : 'NO DEFINIDA');
    console.log('');
  } catch (e) {
    console.error('❌ URL mal formateada');
  }

  // Intentar conexión con timeout más largo y mejor configuración
  console.log('🔗 Conectando (timeout: 60 segundos)...\n');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 60000, // 60 segundos
    query_timeout: 10000,
    max: 1
  });

  try {
    const result = await pool.query('SELECT NOW() as time, version() as version');
    console.log('✅ ¡CONEXIÓN EXITOSA!');
    console.log('✅ Tiempo del servidor:', result.rows[0].time);
    console.log('✅ Versión:', result.rows[0].version.substring(0, 50) + '...');
    console.log('');
    console.log('🎉 Supabase está funcionando correctamente!');
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    console.error('❌ Código:', error.code);
    console.error('');
    
    if (error.code === 'ETIMEDOUT') {
      console.error('🔥 PROBLEMA: Timeout de conexión\n');
      console.error('Posibles causas:');
      console.error('1. Firewall bloqueando el puerto 5432');
      console.error('2. Antivirus bloqueando conexión');
      console.error('3. Supabase está configurado para pooler mode\n');
      console.error('💡 SOLUCIÓN: Usar el pooler de Supabase');
      console.error('   Ve a Supabase Dashboard > Settings > Database');
      console.error('   Copia la "Connection string" en modo "Transaction" o "Session"');
      console.error('   El puerto debe ser 6543 (pooler) en vez de 5432 (directo)\n');
    } else if (error.code === '28P01') {
      console.error('🔥 PROBLEMA: Contraseña incorrecta');
      console.error('   Verifica la contraseña en .env');
    }

    await pool.end();
    process.exit(1);
  }
}

testConnectionSimple();
