const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findFirst({
    where: { email: 'michaelstrauss.berlin@googlemail.com' },
  });

  if (user) {
    console.log('User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  inAppName:', user.inAppName);
    console.log('  emailVerified:', user.emailVerified);
    console.log('  Password hash exists:', !!user.password);
  } else {
    console.log('User NOT found in database');
  }

  const allUsers = await prisma.user.findMany({
    select: { email: true, inAppName: true }
  });
  console.log('\nAll users in database:', allUsers);

  await prisma.$disconnect();
}

checkUser();
