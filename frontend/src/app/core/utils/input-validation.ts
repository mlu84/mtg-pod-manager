export const IMAGE_UPLOAD_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const IMAGE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
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

