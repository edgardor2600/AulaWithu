/**
 * 🔄 SCRIPT DE CONVERSIÓN MASIVA: REPOSITORIOS SQLite → PostgreSQL
 * 
 * Este script convierte automáticamente todos los repositorios
 * para usar sintaxis PostgreSQL
 * 
 * Cambios que aplica:
 * 1. ? → $1, $2, $3 (placeholders)
 * 2. Agrega async/await a métodos
 * 3. result.changes → result.rowCount
 * 4. Actualiza tipos de retorno a Promise<T>
 * 
 * Ejecución: npx ts-node scripts/convert-repositories.ts
 */

import fs from 'fs';
import path from 'path';

interface ConversionStats {
  filesProcessed: number;
  placeholdersReplaced: number;
  methodsConverted: number;
  changesReplaced: number;
}

function convertPlaceholders(content: string): { content: string; count: number } {
  let count = 0;
  let index = 0;
  
  // Replace ? with $1, $2, $3, etc.
  const result = content.replace(/`([^`]+)`/g, (match) => {
    // Reset counter for each SQL string
    let paramNumber = 0;
    
    return match.replace(/\?/g, () => {
      paramNumber++;
      count++;
      return `$${paramNumber}`;
    });
  });
  
  return { content: result, count };
}

function convertToAsync(content: string): { content: string; count: number } {
  let count = 0;
  
  // Pattern: static methodName(...): Type {
  // Convert to: static async methodName(...): Promise<Type> {
  let result = content.replace(
    /static\s+(\w+)\s*\(([^)]*)\):\s*(\w+(?:<[^>]+>)?(?:\s*\|\s*\w+(?:<[^>]+>)?)*)\s*{/g,
    (match, methodName, params, returnType) => {
      // Skip if already async
      if (match.includes('async')) return match;
      
      // Skip helper methods that don't use database
      if (methodName.startsWith('generate') || methodName.startsWith('validate')) {
        return match;
      }
      
      count++;
      
      // Wrap return type in Promise if not already
      if (!returnType.includes('Promise')) {
        returnType = `Promise<${returnType}>`;
      }
      
      return `static async ${methodName}(${params}): ${returnType} {`;
    }
  );
  
  return { content: result, count };
}

function addAwaitToDbCalls(content: string): string {
  // Add await to runQuery, getOne, getAll calls
  return content
    .replace(/(\s+)(runQuery|getOne|getAll)\(/g, '$1await $2(')
    .replace(/(=\s*)(runQuery|getOne|getAll)\(/g, '$1await $2(')
    .replace(/(return\s+)(getOne|getAll)\(/g, '$1await $2(');
}

function convertChangesToRowCount(content: string): { content: string; count: number } {
  const matches = content.match(/\.changes/g);
  const count = matches ? matches.length : 0;
  
  const result = content.replace(/\.changes/g, '.rowCount');
  
  return { content: result, count };
}

function convertRepository(filePath: string): ConversionStats {
  console.log(`\n📄 Procesando: ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const stats: ConversionStats = {
    filesProcessed: 0,
    placeholdersReplaced: 0,
    methodsConverted: 0,
    changesReplaced: 0
  };
  
  // 1. Convert placeholders
  const placeholdersResult = convertPlaceholders(content);
  content = placeholdersResult.content;
  stats.placeholdersReplaced = placeholdersResult.count;
  console.log(`   ✅ ${stats.placeholdersReplaced} placeholders convertidos (? → $n)`);
  
  // 2. Convert methods to async
  const asyncResult = convertToAsync(content);
  content = asyncResult.content;
  stats.methodsConverted = asyncResult.count;
  console.log(`   ✅ ${stats.methodsConverted} métodos convertidos a async`);
  
  // 3. Add await to database calls
  content = addAwaitToDbCalls(content);
  console.log(`   ✅ await agregado a llamadas de BD`);
  
  // 4. Convert .changes to .rowCount
  const changesResult = convertChangesToRowCount(content);
  content = changesResult.content;
  stats.changesReplaced = changesResult.count;
  console.log(`   ✅ ${stats.changesReplaced} .changes → .rowCount`);
  
  // Save converted file
  fs.writeFileSync(filePath, content);
  stats.filesProcessed = 1;
  
  return stats;
}

async function main() {
  console.log('\n🔄 ========================================');
  console.log('   CONVERSIÓN MASIVA DE REPOSITORIOS');
  console.log('========================================\n');
  
  const repositoriesDir = path.join(__dirname, '../src/db/repositories');
  
  if (!fs.existsSync(repositoriesDir)) {
    console.error(`❌ No existe: ${repositoriesDir}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(repositoriesDir)
    .filter(f => f.endsWith('-repository.ts'))
    .map(f => path.join(repositoriesDir, f));
  
  console.log(`📁 Encontrados ${files.length} repositorios\n`);
  
  const totalStats: ConversionStats = {
    filesProcessed: 0,
    placeholdersReplaced: 0,
    methodsConverted: 0,
    changesReplaced: 0
  };
  
  for (const file of files) {
    const stats = convertRepository(file);
    totalStats.filesProcessed += stats.filesProcessed;
    totalStats.placeholdersReplaced += stats.placeholdersReplaced;
    totalStats.methodsConverted += stats.methodsConverted;
    totalStats.changesReplaced += stats.changesReplaced;
  }
  
  console.log('\n✅ ========================================');
  console.log('   ¡CONVERSIÓN COMPLETADA!');
  console.log('========================================\n');
  
  console.log(`📊 Estadísticas totales:`);
  console.log(`   - Archivos procesados: ${totalStats.filesProcessed}`);
  console.log(`   - Placeholders convertidos: ${totalStats.placeholdersReplaced}`);
  console.log(`   - Métodos convertidos a async: ${totalStats.methodsConverted}`);
  console.log(`   - .changes → .rowCount: ${totalStats.changesReplaced}\n`);
  
  console.log(`📝 Próximos pasos:`);
  console.log(`   1. Revisar cambios: git diff`);
  console.log(`   2. Compilar TypeScript: npm run build`);
  console.log(`   3. Iniciar servidor: npm run dev\n`);
}

main();
