export function getPrismaErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === 'string' ? maybeCode : null;
}

