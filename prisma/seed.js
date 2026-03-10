// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      fullName: 'Administrator',
      isAdmin: true,
      isActive: true
    }
  });

  console.log('Admin user created:', admin.email);

  // Create default About Us
  await prisma.aboutUs.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      title: 'About Our Company',
      mission: 'Our mission is to deliver excellence.',
      vision: 'To be the leading provider in our industry.'
    }
  });

  // Create default policies
  await prisma.policy.upsert({
    where: { type: 'privacy' },
    update: {},
    create: {
      type: 'privacy',
      title: 'Privacy Policy',
      content: 'Your privacy is important to us...',
      version: '1.0'
    }
  });

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });