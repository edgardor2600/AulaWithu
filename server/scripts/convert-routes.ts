/**
 * 🔄 SCRIPT DE CONVERSIÓN: ROUTES
 * 
 * Convierte routes para usar servicios async
 */

import fs from 'fs';
import path from 'path';

function convertRoute(content: string): string {
  // Add async to route handlers
  let result = content.replace(
    /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:.*?,\s*)?\s*\(([^)]*)\)\s*=>\s*{/g,
    (match, method, route, params) => {
      if (match.includes('async')) return match;
      return match.replace(`(${params}) =>`, `async (${params}) =>`);
    }
  );
  
  // Add await to service calls
  result = result.replace(/(\s+)(\w+Service)\./g, '$1await $2.');
  result = result.replace(/(=\s*)(\w+Service)\./g, '$1await $2.');
  result = result.replace(/(const\s+\w+\s*=\s*)(\w+Service)\./g, '$1await $2.');
  
  return result;
}

function processFile(filePath: string): void {
  console.log(`📄 ${path.basename(filePath)}`);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = convertRoute(content);
  fs.writeFileSync(filePath, content);
  console.log(`   ✅ Convertido`);
}

const apiDir = path.join(__dirname, '../src/api');
const files = fs.readdirSync(apiDir)
  .filter(f => f.endsWith('.routes.ts') || f.endsWith('.ts'))
  .map(f => path.join(apiDir, f));

console.log(`\n🔄 Convirtiendo ${files.length} archivos de rutas...\n`);
files.forEach(processFile);
console.log(`\n✅ Rutas convertidas\n`);
