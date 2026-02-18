import { Prisma } from '@prisma/client';

export async function deleteGroupWithRelations(
  tx: Prisma.TransactionClient,
  groupId: string,
): Promise<void> {
  await tx.gamePlacement.deleteMany({
    where: {
      game: {
        groupId,
      },
    },
  });

  await tx.game.deleteMany({
    where: { groupId },
  });

  await tx.deck.deleteMany({
    where: { groupId },
  });

  await tx.groupEvent.deleteMany({
    where: { groupId },
  });

  await tx.groupApplication.deleteMany({
    where: { groupId },
  });

  await tx.usersOnGroups.deleteMany({
    where: { groupId },
  });

  await tx.group.delete({
    where: { id: groupId },
  });
}

