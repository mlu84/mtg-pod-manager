import { describe, expect, it } from 'vitest';
import { DecksService } from './decks.service';
import { DecksArchidektService } from './decks-archidekt.service';

const archidektService = new DecksArchidektService();
const service = new DecksService(
  {} as any,
  {} as any,
  archidektService,
  {} as any,
);

describe('DecksArchidektService.extractArchidektId', () => {
  it('returns the id when input is numeric', () => {
    expect(archidektService.extractArchidektId('12784239')).toBe('12784239');
  });

  it('extracts id from full URL', () => {
    expect(
      archidektService.extractArchidektId('https://archidekt.com/decks/12784239/'),
    ).toBe('12784239');
  });

  it('extracts id from URL without scheme', () => {
    expect(archidektService.extractArchidektId('archidekt.com/decks/555')).toBe(
      '555',
    );
  });

  it('returns null for empty or invalid input', () => {
    expect(archidektService.extractArchidektId('')).toBeNull();
    expect(archidektService.extractArchidektId('not-a-url')).toBeNull();
  });
});

describe('DecksService.ensureOwnerOrAdmin', () => {
  it('allows owner', () => {
    expect(() =>
      (service as any).ensureOwnerOrAdmin(
        'user-1',
        'user-1',
        { role: 'MEMBER' },
        'forbidden',
      ),
    ).not.toThrow();
  });

  it('allows admin', () => {
    expect(() =>
      (service as any).ensureOwnerOrAdmin(
        'user-1',
        'owner-2',
        { role: 'ADMIN' },
        'forbidden',
      ),
    ).not.toThrow();
  });

  it('throws for non-owner non-admin', () => {
    expect(() =>
      (service as any).ensureOwnerOrAdmin(
        'user-1',
        'owner-2',
        { role: 'MEMBER' },
        'forbidden',
      ),
    ).toThrow('forbidden');
  });
});
