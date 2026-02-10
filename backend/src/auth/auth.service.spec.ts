import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { Prisma, SystemRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

vi.mock('crypto', () => ({
  randomBytes: vi.fn(),
}));

describe('AuthService', () => {
  const bcryptHash = vi.mocked(bcrypt.hash) as any;
  const bcryptCompare = vi.mocked(bcrypt.compare) as any;
  const cryptoRandomBytes = vi.mocked(crypto.randomBytes) as any;

  let usersService: {
    createUser: ReturnType<typeof vi.fn>;
    findByVerificationToken: ReturnType<typeof vi.fn>;
    verifyEmail: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };
  let mailService: { sendVerificationEmail: ReturnType<typeof vi.fn> };
  let jwtService: { sign: ReturnType<typeof vi.fn> };
  let configService: { get: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();

    usersService = {
      createUser: vi.fn(),
      findByVerificationToken: vi.fn(),
      verifyEmail: vi.fn(),
      findOne: vi.fn(),
    };
    mailService = { sendVerificationEmail: vi.fn() };
    jwtService = { sign: vi.fn() };
    configService = { get: vi.fn() };

    service = new AuthService(
      usersService as any,
      mailService as any,
      jwtService as any,
      configService as any,
    );
  });

  it('signUp hashes password, creates user, and sends verification email', async () => {
    bcryptHash.mockResolvedValue('hashed');
    cryptoRandomBytes.mockReturnValue(Buffer.from('token'));

    usersService.createUser.mockResolvedValue({
      email: 'a@b.c',
      inAppName: 'Alice',
    });

    const result = await service.signUp({
      email: 'a@b.c',
      inAppName: 'Alice',
      password: 'pw',
    });

    expect(usersService.createUser).toHaveBeenCalledWith({
      email: 'a@b.c',
      inAppName: 'Alice',
      password: 'hashed',
      emailVerificationToken: '746f6b656e',
    });
    expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
      'a@b.c',
      'Alice',
      '746f6b656e',
    );
    expect(result.message).toMatch(/Registration successful/);
  });

  it('signUp throws ConflictException on unique constraint error', async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '5.22.0',
      },
    );
    usersService.createUser.mockRejectedValue(error);

    await expect(
      service.signUp({
        email: 'a@b.c',
        inAppName: 'Alice',
        password: 'pw',
      }),
    ).rejects.toThrow('Email or inAppName already exists.');
  });

  it('verifyEmail throws on invalid token', async () => {
    usersService.findByVerificationToken.mockResolvedValue(null);

    await expect(service.verifyEmail('bad-token')).rejects.toThrow(
      'Invalid or expired verification token.',
    );
  });

  it('verifyEmail returns redirect URL for valid token', async () => {
    usersService.findByVerificationToken.mockResolvedValue({ id: 'user-1' });
    configService.get.mockReturnValue('http://localhost:4200');

    const url = await service.verifyEmail('token');

    expect(usersService.verifyEmail).toHaveBeenCalledWith('user-1');
    expect(url).toBe('http://localhost:4200/login?verified=true');
  });

  it('signIn throws on invalid credentials', async () => {
    usersService.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.c',
      inAppName: 'Alice',
      password: 'hash',
      systemRole: 'USER' as SystemRole,
      emailVerified: null,
    });
    bcryptCompare.mockResolvedValue(false);

    await expect(
      service.signIn({ email: 'a@b.c', password: 'bad' }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('signIn returns access token and emailVerified flag', async () => {
    usersService.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.c',
      inAppName: 'Alice',
      password: 'hash',
      systemRole: 'USER' as SystemRole,
      emailVerified: new Date('2026-02-01T00:00:00.000Z'),
    });
    bcryptCompare.mockResolvedValue(true);
    jwtService.sign.mockReturnValue('jwt-token');

    const result = await service.signIn({ email: 'a@b.c', password: 'pw' });

    expect(result).toEqual({
      access_token: 'jwt-token',
      emailVerified: true,
    });
  });
});
