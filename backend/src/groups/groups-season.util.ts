import { SeasonInterval } from '@prisma/client';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const TWO_WEEKS_MS = 14 * DAY_MS;

export function toUtcDay(date: Date): Date {
  const utc = new Date(date);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}

export function addDaysUtc(date: Date, days: number): Date {
  const base = toUtcDay(date);
  return new Date(base.getTime() + Math.max(0, days) * DAY_MS);
}

export function addInterval(date: Date, interval: SeasonInterval): Date {
  const base = toUtcDay(date);
  if (interval === 'WEEKLY') {
    return addDaysUtc(base, 7);
  }
  if (interval === 'BI_WEEKLY') {
    return addDaysUtc(base, 14);
  }

  const shifted = new Date(base);
  if (interval === 'MONTHLY') shifted.setUTCMonth(shifted.getUTCMonth() + 1);
  if (interval === 'QUARTERLY') shifted.setUTCMonth(shifted.getUTCMonth() + 3);
  if (interval === 'HALF_YEARLY') shifted.setUTCMonth(shifted.getUTCMonth() + 6);
  if (interval === 'YEARLY') shifted.setUTCFullYear(shifted.getUTCFullYear() + 1);
  shifted.setUTCHours(0, 0, 0, 0);
  return shifted;
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return toUtcDay(a).getTime() === toUtcDay(b).getTime();
}

export function getSeasonLabel(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return 'Season';
  return trimmed.toLowerCase().startsWith('season ')
    ? trimmed
    : `Season ${trimmed}`;
}

