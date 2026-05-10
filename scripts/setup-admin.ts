// Script to create admin user programmatically
import { createAdminUser } from '../lib/auth';

async function setupAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@printersrus.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

  console.log('Creating admin user...');
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);

  try {
    const admin = await createAdminUser({
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      password: adminPassword,
    });

    console.log('✅ Admin user created successfully!');
    console.log(`User ID: ${admin.id}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
    console.log(`Email Verified: ${admin.email_verified_at ? 'Yes' : 'No'}`);
    console.log('\nYou can now login at: http://localhost:3000/admin/login');
  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.message?.includes('UNIQUE constraint') || error.message?.includes('duplicate')) {
      console.log('Admin user already exists. You can login with the existing credentials.');
    }
    process.exit(1);
  }
}

setupAdmin();