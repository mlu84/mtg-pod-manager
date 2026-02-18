export const CUID_REGEX = /^c[a-z0-9]{24}$/;

export function isCuid(value: unknown): value is string {
  return typeof value === 'string' && CUID_REGEX.test(value);
}
