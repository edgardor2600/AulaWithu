/**
 * 🔧 AUTO-DIAGNÓSTICO: Prueba múltiples configuraciones de conexión
 * 
 * Este script intentará conectarse usando diferentes formatos
 * hasta encontrar el que funcione.
 */

import { Pool } from 'pg';

const PROJECT_ID = 'vyfkuuatwsoulgrirgey';
const PASSWORD = 'perromuerto05';

const configurations = [
  {
    name: 'Conexión Directa (puerto 5432)',
    url: `postgresql://postgres:${PASSWORD}@db.${PROJECT_ID}.supabase.co:5432/postgres`,
    ssl: true
  },
  {
    name: 'Pooler Transaction Mode (puerto 6543)',
    url: `postgresql://postgres.${PROJECT_ID}:${PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    ssl: true
  },
  {
    name: 'Pooler Session Mode (puerto 5432)',
    url: `postgresql://postgres.${PROJECT_ID}:${PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    ssl: true
  },
  {
    name: 'Pooler sin sufijo de proyecto',
    url: `postgresql://postgres:${PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    ssl: true
  }
];

async function testConfiguration(config: typeof configurations[0]) {
  console.log(`\n🧪 Probando: ${config.name}`);
  console.log(`   URL: ${config.url.replace(PASSWORD, '***')}`);
  
  const pool = new Pool({
    connectionString: config.url,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    max: 1
  });

  try {
    const result = await pool.query('SELECT NOW() as time, current_database() as db');
    await pool.end();
    
    console.log(`   ✅ ¡ÉXITO!`);
    console.log(`   ✅ Database: ${result.rows[0].db}`);
    console.log(`   ✅ Tiempo: ${result.rows[0].time}`);
    return true;
  } catch (error: any) {
    await pool.end();
    console.log(`   ❌ Error: ${error.message} (${error.code || 'UNKNOWN'})`);
    return false;
  }
}

async function findWorkingConfiguration() {
  console.log('\n🔍 AUTO-DIAGNÓSTICO DE CONEXIÓN A SUPABASE\n');
  console.log('='.repeat(60));
  
  for (const config of configurations) {
    const success = await testConfiguration(config);
    if (success) {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 ¡CONFIGURACIÓN ENCONTRADA!');
      console.log('='.repeat(60));
      console.log('\n📝 Copia esta línea a tu archivo .env:\n');
      console.log(`DATABASE_URL=${config.url}`);
      console.log('');
      process.exit(0);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('❌ NINGUNA CONFIGURACIÓN FUNCIONÓ');
  console.log('='.repeat(60));
  console.log('\n💡 Posibles soluciones:\n');
  console.log('1. Verifica que la contraseña sea correcta');
  console.log('2. Ve a Supabase Dashboard > Settings > Database');
  console.log('3. Copia la "Connection string" exacta desde ahí');
  console.log('4. Verifica que tu firewall/antivirus no bloquee PostgreSQL');
  console.log('5. Intenta desde otra red (datos móviles, etc.)');
  console.log('');
  process.exit(1);
}

findWorkingConfiguration();
