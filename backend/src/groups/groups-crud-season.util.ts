import { BadRequestException } from '@nestjs/common';
import { UpdateGroupDto } from './dto/update-group.dto';
import { DAY_MS, isSameUtcDay, toUtcDay } from './groups-season.util';

const MAX_SEASON_DURATION_MS = 365 * DAY_MS;

export function areNextSeasonFieldsTouched(updateGroupDto: UpdateGroupDto): boolean {
  return (
    updateGroupDto.nextSeasonName !== undefined ||
    updateGroupDto.nextSeasonStartsAt !== undefined ||
    updateGroupDto.nextSeasonEndsAt !== undefined ||
    updateGroupDto.nextSeasonIsSuccessive !== undefined ||
    updateGroupDto.nextSeasonInterval !== undefined ||
    updateGroupDto.nextSeasonIntermissionDays !== undefined
  );
}

export function normalizeSeasonName(name?: string | null): string | null {
  const trimmed = name?.trim();
  return trimmed ? trimmed : null;
}

export function parseUtcDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('Invalid date provided');
  }
  return toUtcDay(parsed);
}

export function validateSeasonWindow(start: Date, end: Date, label: string): void {
  if (end.getTime() <= start.getTime()) {
    throw new BadRequestException(`${label} end must be after start`);
  }
  if (end.getTime() - start.getTime() > MAX_SEASON_DURATION_MS) {
    throw new BadRequestException(`${label} length cannot exceed 1 year`);
  }
}

export function isSameNullableUtcDate(a: Date | null, b: Date | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return isSameUtcDay(a, b);
}

export function toUtcDateLabel(date: Date): string {
  return toUtcDay(date).toISOString().slice(0, 10);
}

