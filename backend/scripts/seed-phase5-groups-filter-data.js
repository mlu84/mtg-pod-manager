require('dotenv').config();
const { PrismaClient, SystemRole } = require('@prisma/client');

const prisma = new PrismaClient();
const PREFIX = 'P5 FILTER TEST';

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function ensureOwnerUser() {
  const existingUser = await prisma.user.findFirst({
    where: { systemRole: SystemRole.USER },
    orderBy: { createdAt: 'asc' },
  });

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
    data: {
      email: 'phase5-filter-owner@mtg-pod.local',
      password: '$2b$10$9QmVr2xR8T2q.UQnl9v9nOzv0e54TNiI1W2P3iVv2V8sSjaOlqQfK', // placeholder hash
      inAppName: 'Phase5FilterOwner',
      emailVerified: new Date(),
      systemRole: SystemRole.USER,
    },
  });
}

async function createGroupWithAdminMembership(ownerUserId, data) {
  const group = await prisma.group.create({
    data: {
      name: data.name,
      format: data.format,
      description: data.description,
      createdAt: data.createdAt,
      activeSeasonName: data.activeSeasonName ?? null,
      activeSeasonStartedAt: data.activeSeasonStartedAt ?? null,
      activeSeasonEndsAt: data.activeSeasonEndsAt ?? null,
      nextSeasonName: data.nextSeasonName ?? null,
      nextSeasonStartsAt: data.nextSeasonStartsAt ?? null,
      nextSeasonEndsAt: data.nextSeasonEndsAt ?? null,
      members: {
        create: {
          userId: ownerUserId,
          role: 'ADMIN',
          assignedAt: data.assignedAt,
        },
      },
    },
  });

  if (data.createDeckNow) {
    await prisma.deck.create({
      data: {
        name: `${data.name} Deck`,
        colors: 'WU',
        type: 'Control',
        ownerId: ownerUserId,
        groupId: group.id,
      },
    });
  }

  return group;
}

async function main() {
  const owner = await ensureOwnerUser();

  const existing = await prisma.group.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true },
  });

  if (existing.length > 0) {
    const groupIds = existing.map((g) => g.id);
    const seasonIds = (
      await prisma.groupSeason.findMany({
        where: { groupId: { in: groupIds } },
        select: { id: true },
      })
    ).map((season) => season.id);
    const gameIds = (
      await prisma.game.findMany({
        where: { groupId: { in: groupIds } },
        select: { id: true },
      })
    ).map((game) => game.id);

    await prisma.$transaction(async (tx) => {
      await tx.group.updateMany({
        where: { id: { in: groupIds } },
        data: { lastSeasonId: null },
      });

      if (seasonIds.length > 0) {
        await tx.groupSeasonDismissal.deleteMany({
          where: { seasonId: { in: seasonIds } },
        });
        await tx.groupSeasonDeck.deleteMany({
          where: { seasonId: { in: seasonIds } },
        });
      }

      if (gameIds.length > 0) {
        await tx.gamePlacement.deleteMany({
          where: { gameId: { in: gameIds } },
        });
      }

      await tx.game.deleteMany({
        where: { groupId: { in: groupIds } },
      });
      await tx.deck.deleteMany({
        where: { groupId: { in: groupIds } },
      });
      await tx.usersOnGroups.deleteMany({
        where: { groupId: { in: groupIds } },
      });
      await tx.groupSeason.deleteMany({
        where: { groupId: { in: groupIds } },
      });
      await tx.groupEvent.deleteMany({
        where: { groupId: { in: groupIds } },
      });
      await tx.groupApplication.deleteMany({
        where: { groupId: { in: groupIds } },
      });
      await tx.groupInvite.deleteMany({
        where: { groupId: { in: groupIds } },
      });
      await tx.group.deleteMany({
        where: { id: { in: groupIds } },
      });
    });
  }

  const formats = ['Commander', 'Modern', 'Pioneer', 'Legacy', 'Draft', 'Standard'];
  let createdInactive = 0;
  let createdActive = 0;
  let createdInactiveWithSeasonWarning = 0;

  for (let i = 1; i <= 8; i++) {
    await createGroupWithAdminMembership(owner.id, {
      name: `${PREFIX} INACTIVE ${String(i).padStart(2, '0')}`,
      format: formats[i % formats.length],
      description: 'Inactive baseline test group',
      createdAt: daysAgo(240 + i),
      assignedAt: daysAgo(239 + i),
    });
    createdInactive += 1;
  }

  for (let i = 1; i <= 2; i++) {
    await createGroupWithAdminMembership(owner.id, {
      name: `${PREFIX} INACTIVE ACTIVE-SEASON ${String(i).padStart(2, '0')}`,
      format: formats[(i + 2) % formats.length],
      description: 'Inactive group with active season warning',
      createdAt: daysAgo(260 + i),
      assignedAt: daysAgo(259 + i),
      activeSeasonName: `Season Warning ${i}`,
      activeSeasonStartedAt: daysAgo(30 + i),
      activeSeasonEndsAt: daysFromNow(25 + i),
    });
    createdInactive += 1;
    createdInactiveWithSeasonWarning += 1;
  }

  for (let i = 1; i <= 2; i++) {
    await createGroupWithAdminMembership(owner.id, {
      name: `${PREFIX} INACTIVE PLANNED-SEASON ${String(i).padStart(2, '0')}`,
      format: formats[(i + 3) % formats.length],
      description: 'Inactive group with planned season warning',
      createdAt: daysAgo(255 + i),
      assignedAt: daysAgo(254 + i),
      nextSeasonName: `Planned Season ${i}`,
      nextSeasonStartsAt: daysFromNow(10 + i),
      nextSeasonEndsAt: daysFromNow(40 + i),
    });
    createdInactive += 1;
    createdInactiveWithSeasonWarning += 1;
  }

  for (let i = 1; i <= 4; i++) {
    await createGroupWithAdminMembership(owner.id, {
      name: `${PREFIX} ACTIVE NEW ${String(i).padStart(2, '0')}`,
      format: formats[(i + 1) % formats.length],
      description: 'Active group via recent create/member activity',
      createdAt: daysAgo(5 + i),
      assignedAt: daysAgo(4 + i),
    });
    createdActive += 1;
  }

  for (let i = 1; i <= 4; i++) {
    await createGroupWithAdminMembership(owner.id, {
      name: `${PREFIX} ACTIVE MEMBER ${String(i).padStart(2, '0')}`,
      format: formats[(i + 4) % formats.length],
      description: 'Active group via recent membership timestamp',
      createdAt: daysAgo(220 + i),
      assignedAt: daysAgo(1 + i),
    });
    createdActive += 1;
  }

  for (let i = 1; i <= 4; i++) {
    await createGroupWithAdminMembership(owner.id, {
      name: `${PREFIX} ACTIVE DECK ${String(i).padStart(2, '0')}`,
      format: formats[(i + 5) % formats.length],
      description: 'Active group via recent deck update',
      createdAt: daysAgo(230 + i),
      assignedAt: daysAgo(229 + i),
      createDeckNow: true,
    });
    createdActive += 1;
  }

  console.log('Phase 5 filter test groups created.');
  console.log(`Prefix: ${PREFIX}`);
  console.log(`Active groups: ${createdActive}`);
  console.log(`Inactive groups: ${createdInactive}`);
  console.log(`Inactive groups with season warning: ${createdInactiveWithSeasonWarning}`);
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
