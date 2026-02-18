import { describe, expect, it, vi } from 'vitest';
import { deleteGroupWithRelations } from './group-delete.util';

describe('deleteGroupWithRelations', () => {
  it('deletes all dependent group relations in order', async () => {
    const tx = {
      gamePlacement: { deleteMany: vi.fn().mockResolvedValue(undefined) },
      game: { deleteMany: vi.fn().mockResolvedValue(undefined) },
      deck: { deleteMany: vi.fn().mockResolvedValue(undefined) },
      groupEvent: { deleteMany: vi.fn().mockResolvedValue(undefined) },
      groupApplication: { deleteMany: vi.fn().mockResolvedValue(undefined) },
      usersOnGroups: { deleteMany: vi.fn().mockResolvedValue(undefined) },
      group: { delete: vi.fn().mockResolvedValue(undefined) },
    };

    await deleteGroupWithRelations(tx as any, 'group-1');

    expect(tx.game.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
    expect(tx.deck.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
    expect(tx.groupEvent.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
    expect(tx.groupApplication.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
    expect(tx.usersOnGroups.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
    expect(tx.group.delete).toHaveBeenCalledWith({ where: { id: 'group-1' } });
  });
});

