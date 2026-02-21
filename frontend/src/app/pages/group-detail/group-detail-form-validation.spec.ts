import { describe, expect, it } from 'vitest';
import {
  validateDeckFormInput,
  validateDeckOwnerAssignmentInput,
  validateGamePlacementsInput,
  validateGroupEditInput,
  validateGroupImageSelection,
  validateInviteEmailInput,
  validateInviteSearchQuery,
  sanitizeDeckSearchTerm,
  validateSeasonDayInputs,
} from './group-detail-form-validation';

describe('group-detail-form-validation', () => {
  it('validates and normalizes deck form input', () => {
    const result = validateDeckFormInput({
      name: '  Deck A  ',
      colors: ' Mono-Blue ',
      type: ' Control ',
      archidektUrl: '  https://archidekt.com/decks/1 ',
      allowedColors: ['Mono-Blue'],
      allowedTypes: ['Control'],
    });

    expect(result.error).toBeUndefined();
    expect(result.value).toEqual({
      name: 'Deck A',
      colors: 'Mono-Blue',
      type: 'Control',
      archidektUrl: 'https://archidekt.com/decks/1',
    });
  });

  it('rejects invalid game placements and accepts valid placements', () => {
    const invalid = validateGamePlacementsInput([
      { deckId: 'd1', rank: 1, playerName: 'x'.repeat(51) },
      { deckId: 'd2', rank: 2, playerName: '' },
    ]);
    expect(invalid.error).toBe('Player names must be at most 50 characters');

    const valid = validateGamePlacementsInput([
      { deckId: 'd1', rank: '1', playerName: ' Alice ' },
      { deckId: 'd2', rank: 2, playerName: '' },
    ]);
    expect(valid.error).toBeUndefined();
    expect(valid.value).toEqual([
      { deckId: 'd1', rank: 1, playerName: 'Alice' },
      { deckId: 'd2', rank: 2, playerName: undefined },
    ]);

    const invalidChars = validateGamePlacementsInput([
      { deckId: 'd1', rank: 1, playerName: 'bad@name' },
      { deckId: 'd2', rank: 2, playerName: '' },
    ]);
    expect(invalidChars.error).toBe('Player names contain unsupported characters');
  });

  it('validates invite inputs', () => {
    expect(validateInviteSearchQuery('   ').error).toBe('Please enter a user name');
    expect(validateInviteSearchQuery("  Anna   O'Neill  ").value).toBe("Anna O'Neill");
    expect(validateInviteSearchQuery('bad@input').error).toContain('Search may contain');
    expect(validateInviteEmailInput(' test@example.com ').value).toBe('test@example.com');
  });

  it('validates group edit and deck owner assignment', () => {
    const groupValidation = validateGroupEditInput(' Group ', ' Description ');
    expect(groupValidation.error).toBeUndefined();
    expect(groupValidation.value).toEqual({
      name: 'Group',
      description: 'Description',
    });

    const ownerValidation = validateDeckOwnerAssignmentInput({
      ownerId: ' user-2 ',
      currentOwnerId: 'user-1',
      knownOwnerIds: new Set(['user-1', 'user-2']),
    });
    expect(ownerValidation.error).toBeUndefined();
    expect(ownerValidation.value).toEqual({
      ownerId: 'user-2',
      noChange: false,
    });

    expect(sanitizeDeckSearchTerm('  hello   world  ')).toBe('hello world');
  });

  it('validates season day ranges and group image file', () => {
    expect(validateSeasonDayInputs(0, 365)).toBeNull();
    expect(validateSeasonDayInputs(366, 0)).toBe('Pause days must be between 0 and 365');

    const invalidFile = new File(['x'], 'avatar.gif', { type: 'image/gif' });
    expect(validateGroupImageSelection(invalidFile).error).toBe(
      'Unsupported image type. Allowed: JPEG, PNG, WebP.',
    );
  });
});

