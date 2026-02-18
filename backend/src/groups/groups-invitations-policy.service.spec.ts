import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GroupsInvitationsPolicyService } from './groups-invitations-policy.service';

describe('GroupsInvitationsPolicyService', () => {
  let prisma: {
    usersOnGroups: { findUnique: ReturnType<typeof vi.fn> };
    groupApplication: { findUnique: ReturnType<typeof vi.fn> };
    user: { findFirst: ReturnType<typeof vi.fn> };
    groupInvite: { findFirst: ReturnType<typeof vi.fn> };
  };
  let service: GroupsInvitationsPolicyService;

  beforeEach(() => {
    prisma = {
      usersOnGroups: { findUnique: vi.fn() },
      groupApplication: { findUnique: vi.fn() },
      user: { findFirst: vi.fn() },
      groupInvite: { findFirst: vi.fn() },
    };
    service = new GroupsInvitationsPolicyService(prisma as any);
  });

  it('normalizes email addresses', () => {
    expect(service.normalizeEmail('  USER@Example.COM  ')).toBe('user@example.com');
  });

  it('blocks invite receiver mismatches', () => {
    expect(() =>
      service.ensureInviteReceiver(
        { invitedUserId: 'u-1', invitedEmail: 'a@example.com' },
        'u-2',
        'a@example.com',
      ),
    ).toThrow('This invite is not assigned to your account');

    expect(() =>
      service.ensureInviteReceiver(
        { invitedUserId: null, invitedEmail: 'a@example.com' },
        'u-2',
        'b@example.com',
      ),
    ).toThrow('This invite is not assigned to your account');
  });

  it('rejects invitable check when user is already a member', async () => {
    prisma.usersOnGroups.findUnique.mockResolvedValue({ userId: 'u-1', groupId: 'g-1' });

    await expect(service.ensureInvitable('g-1', 'u-1', 'user@example.com')).rejects.toThrow(
      'This user is already a member of this group',
    );
  });

  it('passes invitable check when no conflicts exist', async () => {
    prisma.usersOnGroups.findUnique.mockResolvedValue(null);
    prisma.groupApplication.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.groupInvite.findFirst.mockResolvedValue(null);

    await expect(service.ensureInvitable('g-1', 'u-1', 'user@example.com')).resolves.toBeUndefined();
  });
});

