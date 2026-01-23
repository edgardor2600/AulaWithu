/**
 * 🔄 SCRIPT DE CONVERSIÓN: SERVICIOS
 * 
 * Convierte servicios para usar repositorios async
 * 
 * Ejecutar: npx ts-node scripts/convert-services.ts
 */

import fs from 'fs';
import path from 'path';

function convertToAsync(content: string): string {
  // Convert static methods to async
  let result = content.replace(
    /static\s+(\w+)\s*\(([^)]*)\):\s*(\w+(?:<[^>]+>)?(?:\s*\|\s*\w+(?:<[^>]+>)?)*)\s*{/g,
    (match, methodName, params, returnType) => {
      if (match.includes('async')) return match;
      
      // Skip helper methods
      if (methodName.startsWith('validate') || methodName.startsWith('generate')) {
        return match;
      }
      
      if (!returnType.includes('Promise')) {
        returnType = `Promise<${returnType}>`;
      }
      
      return `static async ${methodName}(${params}): ${returnType} {`;
    }
  );
  
  // Add await to repository calls
  result = result.replace(/(\s+)(\w+Repository)\./g, '$1await $2.');
  result = result.replace(/(=\s*)(\w+Repository)\./g, '$1await $2.');
  result = result.replace(/(return\s+)(\w+Repository)\./g, '$1await $2.');
  
  return result;
}

function convertService(filePath: string): void {
  console.log(`📄 ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf-8');
  content = convertToAsync(content);
  fs.writeFileSync(filePath, content);
  
  console.log(`   ✅ Convertido`);
}

const servicesDir = path.join(__dirname, '../src/services');
const files = fs.readdirSync(servicesDir)
  .filter(f => f.endsWith('.service.ts'))
  .map(f => path.join(servicesDir, f));

console.log(`\n🔄 Convirtiendo ${files.length} servicios...\n`);

files.forEach(convertService);

console.log(`\n✅ Todos los servicios convertidos\n`);
