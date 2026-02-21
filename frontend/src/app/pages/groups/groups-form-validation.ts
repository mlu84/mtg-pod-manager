import {
  normalizeText,
  validateSearchText,
  validateOptionalText,
  validateRequiredText,
} from '../../core/utils/input-validation';

const GROUP_NAME_PATTERN = /^[\p{L}\p{N}\s._'&()#+:-]+$/u;
const GROUP_FORMAT_PATTERN = /^[\p{L}\p{N}\s._'&()#+:\/-]+$/u;

export interface CreateGroupFormValue {
  name: string;
  format: string;
  description: string;
}

export function validateCreateGroupFormInput(
  nameRaw: string,
  formatRaw: string,
  descriptionRaw: string,
): { value?: CreateGroupFormValue; error?: string } {
  const name = normalizeText(nameRaw);
  const format = normalizeText(formatRaw);
  const description = normalizeText(descriptionRaw);

  if (!name || !format) {
    return { error: 'Name and format are required' };
  }
  const nameError = validateRequiredText(name, 'Name', { maxLength: 100 });
  if (nameError) return { error: nameError };
  if (!GROUP_NAME_PATTERN.test(name)) {
    return {
      error:
        'Name contains unsupported characters (allowed: letters, numbers, spaces, punctuation)',
    };
  }
  const formatError = validateRequiredText(format, 'Format', { maxLength: 50 });
  if (formatError) return { error: formatError };
  if (!GROUP_FORMAT_PATTERN.test(format)) {
    return {
      error:
        'Format contains unsupported characters (allowed: letters, numbers, spaces, punctuation)',
    };
  }

  const descriptionError = validateOptionalText(description, 'Description', { maxLength: 500 });
  if (descriptionError) {
    return { error: descriptionError };
  }

  return { value: { name, format, description } };
}

export function validateGroupSearchInput(queryRaw: string): { value?: string; error?: string } {
  const query = normalizeText(queryRaw).replace(/\s+/g, ' ');
  const queryError = validateSearchText(query, 'Search term');
  if (queryError) {
    if (
      queryError === 'Search term must be at most 100 characters' ||
      queryError === 'Search term contains unsupported characters'
    ) {
      return { error: queryError };
    }
    return { error: 'Please enter a search term' };
  }

  return { value: query };
}
