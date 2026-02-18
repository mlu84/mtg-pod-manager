export function resolveApiErrorMessage(err: unknown, fallback: string): string {
  const status = (err as { status?: number } | null)?.status;
  if (status === 401) {
    return 'Session expired or unauthorized. Please log in again.';
  }

  const apiMessage = (err as { error?: { message?: string } } | null)?.error?.message;
  return apiMessage || fallback;
}

