import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let tx: {
    usersOnGroups: {
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    deck: {
      findMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    gamePlacement: {
      updateMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    game: {
      deleteMany: ReturnType<typeof vi.fn>;
    };
    groupEvent: {
      create: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    groupApplication: {
      findMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    group: {
      delete: ReturnType<typeof vi.fn>;
    };
    user: {
      delete: ReturnType<typeof vi.fn>;
    };
  };
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    groupApplication: {
      findMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let service: UsersService;

  beforeEach(() => {
    tx = {
      usersOnGroups: {
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      deck: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      gamePlacement: {
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      game: {
        deleteMany: vi.fn(),
      },
      groupEvent: {
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      groupApplication: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      group: {
        delete: vi.fn(),
      },
      user: {
        delete: vi.fn(),
      },
    };

    prisma = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      groupApplication: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (txClient: typeof tx) => Promise<unknown>) => cb(tx)),
    };
    service = new UsersService(prisma as any);
  });

  it('maps avatar image data to avatarUrl in profile responses', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      inAppName: 'Tester',
      emailVerified: null,
      createdAt: new Date('2026-02-17T10:00:00.000Z'),
      avatarImage: Buffer.from('avatar-bytes'),
      avatarImageMime: 'image/png',
    });

    const profile = await service.getProfile('user-1');

    expect(profile?.avatarUrl).toBe('data:image/png;base64,YXZhdGFyLWJ5dGVz');
  });

  it('rejects avatar upload without file', async () => {
    await expect(service.updateAvatar('user-1', undefined as any)).rejects.toThrow(
      'No image provided',
    );
  });

  it('rejects unsupported avatar mime types', async () => {
    await expect(
      service.updateAvatar('user-1', {
        mimetype: 'image/gif',
      } as Express.Multer.File),
    ).rejects.toThrow('Unsupported image type');
  });

  it('stores avatar image and returns avatarUrl', async () => {
    prisma.user.update.mockResolvedValue({
      avatarImage: Buffer.from('ok'),
      avatarImageMime: 'image/webp',
    });

    const result = await service.updateAvatar('user-1', {
      buffer: Buffer.from('ok'),
      mimetype: 'image/webp',
    } as Express.Multer.File);

    expect(prisma.user.update).toHaveBeenCalled();
    expect(result).toEqual({ avatarUrl: 'data:image/webp;base64,b2s=' });
  });

  it('blocks deletion of sysadmin accounts', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'sys-1',
      inAppName: 'System',
      systemRole: 'SYSADMIN',
    });

    await expect(service.deleteOwnAccount('sys-1')).rejects.toThrow(
      'Sysadmin accounts cannot be deleted',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reassigns admin to oldest member and logs account deletion for surviving groups', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      inAppName: 'DeletedUser',
      systemRole: 'USER',
    });

    tx.usersOnGroups.findMany
      .mockResolvedValueOnce([{ groupId: 'group-1', role: 'ADMIN' }])
      .mockResolvedValueOnce([
        {
          userId: 'user-2',
          role: 'MEMBER',
          assignedAt: new Date('2020-01-01T00:00:00.000Z'),
        },
        {
          userId: 'user-3',
          role: 'MEMBER',
          assignedAt: new Date('2021-01-01T00:00:00.000Z'),
        },
      ]);
    tx.deck.findMany.mockResolvedValue([]);

    const result = await service.deleteOwnAccount('user-1');

    expect(tx.usersOnGroups.update).toHaveBeenCalledWith({
      where: {
        userId_groupId: {
          userId: 'user-2',
          groupId: 'group-1',
        },
      },
      data: {
        role: 'ADMIN',
      },
    });
    expect(tx.usersOnGroups.delete).toHaveBeenCalledWith({
      where: {
        userId_groupId: {
          userId: 'user-1',
          groupId: 'group-1',
        },
      },
    });
    expect(tx.groupEvent.create).toHaveBeenCalledWith({
      data: {
        groupId: 'group-1',
        type: 'USER_ACCOUNT_DELETED',
        message: 'DeletedUser deleted their account',
      },
    });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(result).toEqual({ message: 'Account deleted successfully' });
  });

  it('deletes empty groups without logging surviving-group events', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      inAppName: 'SoloUser',
      systemRole: 'USER',
    });

    tx.usersOnGroups.findMany
      .mockResolvedValueOnce([{ groupId: 'group-empty', role: 'ADMIN' }])
      .mockResolvedValueOnce([]);
    tx.deck.findMany.mockResolvedValue([]);

    await service.deleteOwnAccount('user-1');

    expect(tx.group.delete).toHaveBeenCalledWith({ where: { id: 'group-empty' } });
    expect(tx.groupEvent.create).not.toHaveBeenCalled();
  });
});
