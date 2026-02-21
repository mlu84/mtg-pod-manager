export const IMAGE_UPLOAD_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const IMAGE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N}\s._'-]+$/u;
const SEARCH_TEXT_PATTERN = /^[\p{L}\p{N}\s._'-]+$/u;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/u;

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export function sanitizeSingleLineInput(value: string | null | undefined, maxLength: number): string {
  const raw = value ?? '';
  const withoutControlChars = raw.replace(/[\u0000-\u001F\u007F]/gu, '');
  return withoutControlChars.slice(0, Math.max(0, maxLength));
}

export function sanitizeSearchInput(value: string | null | undefined, maxLength = 100): string {
  return normalizeText(sanitizeSingleLineInput(value, maxLength)).replace(/\s+/g, ' ');
}

export function validateRequiredText(
  value: string,
  label: string,
  options?: {
    minLength?: number;
    maxLength?: number;
  },
): string | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return `${label} is required`;
  }
  if (options?.minLength && normalized.length < options.minLength) {
    return `${label} must be at least ${options.minLength} characters`;
  }
  if (options?.maxLength && normalized.length > options.maxLength) {
    return `${label} must be at most ${options.maxLength} characters`;
  }
  return null;
}

export function validateOptionalText(
  value: string,
  label: string,
  options?: {
    maxLength?: number;
  },
): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (options?.maxLength && normalized.length > options.maxLength) {
    return `${label} must be at most ${options.maxLength} characters`;
  }
  return null;
}

export function validateEmail(value: string): string | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return 'Please enter an email address';
  }
  if (normalized.length > 191) {
    return 'Email address is too long';
  }
  if (!EMAIL_PATTERN.test(normalized)) {
    return 'Please enter a valid email address';
  }
  return null;
}

export function validateDisplayName(
  value: string,
  options?: { minLength?: number; maxLength?: number },
): string | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return 'Display name is required';
  }
  const minLength = options?.minLength ?? 2;
  const maxLength = options?.maxLength ?? 50;
  if (normalized.length < minLength) {
    return `Display name must be at least ${minLength} characters`;
  }
  if (normalized.length > maxLength) {
    return `Display name must be at most ${maxLength} characters`;
  }
  if (!DISPLAY_NAME_PATTERN.test(normalized)) {
    return 'Display name contains unsupported characters';
  }
  return null;
}

export function validatePassword(value: string): string | null {
  const length = value.length;
  if (length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (length > 50) {
    return 'Password must be at most 50 characters';
  }
  if (/[\u0000-\u001F\u007F]/u.test(value)) {
    return 'Password contains unsupported control characters';
  }
  return null;
}

export function validateOptionalPlayerName(value: string): string | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }
  if (normalized.length > 50) {
    return 'Player names must be at most 50 characters';
  }
  if (CONTROL_CHAR_PATTERN.test(normalized)) {
    return 'Player names contain unsupported control characters';
  }
  if (!DISPLAY_NAME_PATTERN.test(normalized)) {
    return 'Player names contain unsupported characters';
  }
  return null;
}

export function validateSearchText(value: string, label = 'Search term'): string | null {
  const normalized = normalizeText(value).replace(/\s+/g, ' ');
  if (!normalized) {
    return `${label} is required`;
  }
  if (normalized.length > 100) {
    return `${label} must be at most 100 characters`;
  }
  if (!SEARCH_TEXT_PATTERN.test(normalized)) {
    return `${label} contains unsupported characters`;
  }
  return null;
}

export function validateInviteCode(value: string): string | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return 'Please enter an invite code';
  }
  if (normalized.length > 191) {
    return 'Invite code is too long';
  }
  if (/\s/.test(normalized)) {
    return 'Invite code must not contain spaces';
  }
  return null;
}

export function validateImageUploadFile(
  file: File | null | undefined,
  options?: {
    maxBytes?: number;
    allowedTypes?: readonly string[];
  },
): string | null {
  if (!file) {
    return 'Please select an image first.';
  }

  const allowedTypes = options?.allowedTypes ?? IMAGE_UPLOAD_ALLOWED_TYPES;
  if (!allowedTypes.includes(file.type)) {
    return 'Unsupported image type. Allowed: JPEG, PNG, WebP.';
  }

  const maxBytes = options?.maxBytes ?? IMAGE_UPLOAD_MAX_BYTES;
  if (file.size > maxBytes) {
    return 'Image is too large. Maximum size is 2 MB.';
  }

  return null;
}

export function validateIntegerRange(
  value: number,
  label: string,
  min: number,
  max: number,
): string | null {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return `${label} must be a whole number`;
  }
  if (value < min || value > max) {
    return `${label} must be between ${min} and ${max}`;
  }
  return null;
}

