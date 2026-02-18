import { GroupDetail } from '../../models/group.model';

export function hasActiveSeasonData(group: GroupDetail | null): boolean {
  return !!group?.activeSeasonName || !!group?.activeSeasonStartedAt || !!group?.activeSeasonEndsAt;
}

export function hasNextSeasonData(group: GroupDetail | null): boolean {
  return (
    !!group?.nextSeasonName ||
    !!group?.nextSeasonStartsAt ||
    !!group?.nextSeasonEndsAt ||
    !!group?.nextSeasonIsSuccessive ||
    !!group?.nextSeasonInterval ||
    (group?.nextSeasonIntermissionDays ?? 0) > 0
  );
}

export function toUtcDateInputValue(date: Date): string {
  const utc = new Date(date);
  utc.setUTCHours(0, 0, 0, 0);
  return utc.toISOString().slice(0, 10);
}

export function addDaysToDateInput(isoDate: string, days: number): string {
  const base = new Date(isoDate);
  if (Number.isNaN(base.getTime())) {
    return isoDate;
  }
  base.setUTCHours(0, 0, 0, 0);
  const safeDays = Math.max(0, Number(days) || 0);
  const shifted = new Date(base.getTime() + safeDays * 24 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function getNextSeasonStartMinDate(args: {
  editSeasonEndsAt: string;
  editSeasonPauseDays: number;
  seasonPauseUntil: string | null | undefined;
  now?: Date;
}): string {
  const today = toUtcDateInputValue(args.now ?? new Date());
  const activeSeasonEndWithPause = args.editSeasonEndsAt
    ? addDaysToDateInput(args.editSeasonEndsAt, args.editSeasonPauseDays)
    : '';
  const pauseUntil = args.seasonPauseUntil ? args.seasonPauseUntil.slice(0, 10) : '';
  return [today, activeSeasonEndWithPause, pauseUntil]
    .filter((value) => !!value)
    .sort()
    .at(-1) || '';
}

