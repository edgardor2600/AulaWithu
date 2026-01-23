/**
 * 🔧 SCRIPT DE FIX: Corrige errores de await incorrectos
 */

import fs from 'fs';
import path from 'path';

function fixAwaitIssues(content: string): string {
  // Remove await from lugares incorrectos
  
  // 1. await antes de this.
  content = content.replace(/await\s+this\./g, 'this.');
  
  // 2. await Repository.method que retorna void o no-async
  content = content.replace(/await\s+(\w+Repository\.(?:generateId|validate|generate)\w*)/g, '$1');
  
  // 3. Doble await
  content = content.replace(/await\s+await\s+/g, 'await ');
  
  // 4. await en return de métodos helper privados
  content = content.replace(/private static await /g, 'private static ');
  
  // 5. await en template literals problem
  content = content.replace(/`([^`]*?)await\s+([^`]*?)`/g, '`$1$2`');
  
  return content;
}

function fixFile(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  content = fixAwaitIssues(content);
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${path.basename(filePath)}`);
  }
}

// Fix repositories
const reposDir = path.join(__dirname, '../src/db/repositories');
fs.readdirSync(reposDir)
  .filter(f => f.endsWith('.ts'))
  .forEach(f => fixFile(path.join(reposDir, f)));

// Fix services
const servicesDir = path.join(__dirname, '../src/services');
fs.readdirSync(servicesDir)
  .filter(f => f.endsWith('.ts'))
  .forEach(f => fixFile(path.join(servicesDir, f)));

// Fix routes
const apiDir = path.join(__dirname, '../src/api');
fs.readdirSync(apiDir)
  .filter(f => f.endsWith('.ts'))
  .forEach(f => fixFile(path.join(apiDir, f)));

console.log('\n✅ Errores corregidos\n');
