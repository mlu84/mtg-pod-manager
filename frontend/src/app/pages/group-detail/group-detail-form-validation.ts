import {
  normalizeText,
  sanitizeSearchInput,
  validateEmail,
  validateImageUploadFile,
  validateIntegerRange,
  validateOptionalText,
  validateOptionalPlayerName,
} from '../../core/utils/input-validation';

type DeckFormInput = {
  name: string;
  colors: string;
  type: string;
  archidektUrl: string;
  allowedColors: readonly string[];
  allowedTypes: readonly string[];
};

type GamePlacementInput = {
  deckId: string;
  rank: number | string;
  playerName?: string;
};

type DeckOwnerAssignmentInput = {
  ownerId: string;
  currentOwnerId: string;
  knownOwnerIds: ReadonlySet<string>;
};

type ValidatedResult<T> = {
  value?: T;
  error?: string;
};

const DECK_NAME_PATTERN = /^[\p{L}\p{N}\s._'&()#+:\/-]+$/u;
const GROUP_NAME_PATTERN = /^[\p{L}\p{N}\s._'&()#+:-]+$/u;
const DESCRIPTION_CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

export function validateDeckFormInput(input: DeckFormInput): ValidatedResult<{
  name: string;
  colors: string;
  type?: string;
  archidektUrl?: string;
}> {
  const name = normalizeText(input.name);
  const colors = normalizeText(input.colors);
  const type = normalizeText(input.type);
  const archidektUrl = normalizeText(input.archidektUrl);

  if (!name || !colors) {
    return { error: 'Name and color are required' };
  }
  if (name.length > 100) {
    return { error: 'Name must be at most 100 characters' };
  }
  if (!DECK_NAME_PATTERN.test(name)) {
    return {
      error:
        'Name contains unsupported characters (allowed: letters, numbers, spaces, punctuation)',
    };
  }
  if (!input.allowedColors.includes(colors)) {
    return { error: 'Please select a valid color combination' };
  }
  if (type && !input.allowedTypes.includes(type)) {
    return { error: 'Please select a valid deck type' };
  }
  if (archidektUrl.length > 255) {
    return { error: 'Archidekt URL is too long' };
  }
  if (archidektUrl && /\s/u.test(archidektUrl)) {
    return { error: 'Archidekt URL must not contain spaces' };
  }

  return {
    value: {
      name,
      colors,
      type: type || undefined,
      archidektUrl: archidektUrl || undefined,
    },
  };
}

export function validateGamePlacementsInput(
  placements: GamePlacementInput[],
): ValidatedResult<Array<{ deckId: string; rank: number; playerName?: string }>> {
  if (placements.length < 2) {
    return { error: 'At least 2 players are required' };
  }

  if (placements.some((placement) => !placement.deckId)) {
    return { error: 'Please select a deck for each player' };
  }

  const normalized = placements.map((placement) => ({
    deckId: placement.deckId,
    rank: Number(placement.rank),
    playerName: normalizeText(placement.playerName),
  }));

  if (
    normalized.some(
      (placement) =>
        !Number.isInteger(placement.rank) || placement.rank < 1 || placement.rank > 6,
    )
  ) {
    return { error: 'Please select valid ranks between 1 and 6' };
  }

  for (const placement of normalized) {
    const playerNameError = validateOptionalPlayerName(placement.playerName);
    if (playerNameError) {
      return { error: playerNameError };
    }
  }

  return {
    value: normalized.map((placement) => ({
      deckId: placement.deckId,
      rank: placement.rank,
      playerName: placement.playerName || undefined,
    })),
  };
}

export function validateInviteSearchQuery(query: string): ValidatedResult<string> {
  const normalized = normalizeText(query).replace(/\s+/g, ' ');
  if (!normalized) {
    return { error: 'Please enter a user name' };
  }
  if (normalized.length > 100) {
    return { error: 'Search term must be at most 100 characters' };
  }
  if (!/^[\p{L}\p{N}\s._'-]+$/u.test(normalized)) {
    return {
      error:
        'Search may contain letters, numbers, spaces, apostrophes, dots, underscores, and hyphens only',
    };
  }
  return { value: normalized };
}

export function validateInviteEmailInput(email: string): ValidatedResult<string> {
  const normalizedEmail = normalizeText(email).toLowerCase();
  const emailError = validateEmail(normalizedEmail);
  if (emailError) {
    return { error: emailError };
  }
  return { value: normalizedEmail };
}

export function validateGroupEditInput(
  name: string,
  description: string,
): ValidatedResult<{ name: string; description?: string }> {
  const normalizedName = normalizeText(name);
  const normalizedDescription = normalizeText(description);

  if (!normalizedName) {
    return { error: 'Name is required' };
  }
  if (normalizedName.length > 100) {
    return { error: 'Name must be at most 100 characters' };
  }
  if (!GROUP_NAME_PATTERN.test(normalizedName)) {
    return {
      error:
        'Name contains unsupported characters (allowed: letters, numbers, spaces, punctuation)',
    };
  }
  const descriptionError = validateOptionalText(normalizedDescription, 'Description', {
    maxLength: 500,
  });
  if (descriptionError) {
    return { error: descriptionError };
  }
  if (DESCRIPTION_CONTROL_CHAR_PATTERN.test(normalizedDescription)) {
    return { error: 'Description contains unsupported control characters' };
  }

  return {
    value: {
      name: normalizedName,
      description: normalizedDescription || undefined,
    },
  };
}

export function validateDeckOwnerAssignmentInput(
  input: DeckOwnerAssignmentInput,
): ValidatedResult<{ ownerId: string; noChange: boolean }> {
  const normalizedOwnerId = normalizeText(input.ownerId);
  if (!normalizedOwnerId || !input.knownOwnerIds.has(normalizedOwnerId)) {
    return { error: 'Please select a valid owner' };
  }

  return {
    value: {
      ownerId: normalizedOwnerId,
      noChange: normalizedOwnerId === input.currentOwnerId,
    },
  };
}

export function sanitizeDeckSearchTerm(value: string): string {
  return sanitizeSearchInput(value, 100);
}

export function validateSeasonDayInputs(
  seasonPauseDays: number,
  intermissionDays: number,
): string | null {
  const seasonPauseError = validateIntegerRange(
    Number(seasonPauseDays),
    'Pause days',
    0,
    365,
  );
  if (seasonPauseError) return seasonPauseError;

  const intermissionError = validateIntegerRange(
    Number(intermissionDays),
    'Intermission days',
    0,
    365,
  );
  if (intermissionError) return intermissionError;

  return null;
}

export function validateGroupImageSelection(file: File | null | undefined): ValidatedResult<File> {
  const fileError = validateImageUploadFile(file);
  if (fileError || !file) {
    return { error: fileError ?? 'Please select an image first.' };
  }
  return { value: file };
}

