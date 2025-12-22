/**
 * Temporary script to generate password hashes for seed data
 * Run with: ts-node scripts/generate-password-hashes.ts
 */

import { hashPassword } from '../src/utils/password';

async function generateHashes() {
  console.log('🔐 Generating password hashes for seed data...\n');
  
  // All test users will use the same password: "password123"
  const testPassword = 'password123';
  
  try {
    const hash = await hashPassword(testPassword);
    
    console.log('Password:', testPassword);
    console.log('Hash:', hash);
    console.log('\n✅ Hash generated successfully!');
    console.log('\nUse this hash for ALL test users in the seed file.');
    
  } catch (error) {
    console.error('❌ Error generating hash:', error);
    process.exit(1);
  }
}

generateHashes();
