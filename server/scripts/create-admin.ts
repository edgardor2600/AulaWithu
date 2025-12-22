/**
 * Script to create initial admin user
 * Run with: ts-node scripts/create-admin.ts
 */

import { UsersRepository } from '../src/db/repositories/users-repository';
import { hashPassword } from '../src/utils/password';

async function createAdminUser() {
  console.log('🔐 Creating initial admin user...\n');
  
  try {
    // Check if admin already exists
    const existingAdmin = UsersRepository.getByUsername('admin');
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log('Username:', existingAdmin.username);
      console.log('Role:', existingAdmin.role);
      return;
    }
    
    // Create admin user
    const password = 'admin123'; // Default password - MUST be changed
    const password_hash = await hashPassword(password);
    
    const admin = UsersRepository.createWithAuth({
      name: 'Administrador',
      username: 'admin',
      password_hash,
      role: 'admin' as any, // Type assertion needed until we update repository types
      avatar_color: '#1e293b',
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('\nCredentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log('\nUser Details:');
    console.log('  ID:', admin.id);
    console.log('  Name:', admin.name);
    console.log('  Role:', admin.role);
    console.log('  Active:', admin.active === 1 ? 'Yes' : 'No');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
