import { PrismaClient, SystemRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Sysadmin credentials
  const sysadminEmail = 'sysadmin@mtg-pod.local';
  const sysadminPassword = 'SysAdmin2024!';
  const sysadminName = 'SysAdmin';

  // Check if sysadmin already exists
  const existingSysadmin = await prisma.user.findUnique({
    where: { email: sysadminEmail },
  });

  if (existingSysadmin) {
    console.log('Sysadmin user already exists');
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(sysadminPassword, 10);

  // Create sysadmin user
  const sysadmin = await prisma.user.create({
    data: {
      email: sysadminEmail,
      password: hashedPassword,
      inAppName: sysadminName,
      systemRole: SystemRole.SYSADMIN,
      emailVerified: new Date(), // Pre-verified
    },
  });

  console.log('Sysadmin user created:');
  console.log(`  Email: ${sysadminEmail}`);
  console.log(`  Password: ${sysadminPassword}`);
  console.log(`  ID: ${sysadmin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
