const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    'Missing DATABASE_URL. Cannot verify Prisma schema sync against target database.',
  );
  process.exit(1);
}

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const prismaArgs = [
  'prisma',
  'migrate',
  'diff',
  '--from-url',
  databaseUrl,
  '--to-schema-datamodel',
  'prisma/schema.prisma',
  '--exit-code',
];

const result = spawnSync(npxCommand, prismaArgs, {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
});

if (typeof result.status !== 'number') {
  console.error('Prisma schema sync check failed to execute.');
  process.exit(1);
}

if (result.status === 0) {
  console.log('Prisma schema sync check: OK (no drift detected).');
  process.exit(0);
}

if (result.status === 2) {
  console.error(
    'Prisma schema drift detected. Stop deployment and create/apply the missing migration(s).',
  );
  process.exit(2);
}

process.exit(result.status);
