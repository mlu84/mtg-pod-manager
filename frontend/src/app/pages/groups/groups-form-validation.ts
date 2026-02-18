import {
  normalizeText,
  validateOptionalText,
  validateRequiredText,
} from '../../core/utils/input-validation';

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
  const formatError = validateRequiredText(format, 'Format', { maxLength: 50 });
  if (formatError) return { error: formatError };

  const descriptionError = validateOptionalText(description, 'Description', { maxLength: 500 });
  if (descriptionError) {
    return { error: descriptionError };
  }

  return { value: { name, format, description } };
}

export function validateGroupSearchInput(queryRaw: string): { value?: string; error?: string } {
  const query = normalizeText(queryRaw);
  if (!query) {
    return { error: 'Please enter a search term' };
  }

  const queryError = validateRequiredText(query, 'Search term', { maxLength: 100 });
  if (queryError) {
    if (queryError === 'Search term must be at most 100 characters') {
      return { error: queryError };
    }
    return { error: 'Please enter a search term' };
  }

  return { value: query };
}
