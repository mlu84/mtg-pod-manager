import { BadRequestException } from '@nestjs/common';
import { SeasonInterval } from '@prisma/client';
import { UpdateGroupDto } from './dto/update-group.dto';
import { addDaysUtc, toUtcDay } from './groups-season.util';
import {
  areNextSeasonFieldsTouched,
  isSameNullableUtcDate,
  normalizeSeasonName,
  parseUtcDate,
  validateSeasonWindow,
} from './groups-crud-season.util';

export type GroupsCrudSeasonState = {
  activeSeasonName: string | null;
  activeSeasonEndsAt: Date | null;
  activeSeasonStartedAt: Date | null;
  nextSeasonName: string | null;
  nextSeasonStartsAt: Date | null;
  nextSeasonEndsAt: Date | null;
  nextSeasonIsSuccessive: boolean;
  nextSeasonInterval: SeasonInterval | null;
  nextSeasonIntermissionDays: number;
  seasonPauseDays: number;
  seasonPauseUntil: Date | null;
};

export type ResolvedSeasonUpdateState = {
  effectiveSeasonStart: Date | null;
  effectiveSeasonEnd: Date | null;
  nextFieldsTouched: boolean;
  effectiveNextSeasonName: string | null;
  effectiveNextSeasonStart: Date | null;
  effectiveNextSeasonEnd: Date | null;
  effectiveNextSeasonSuccessive: boolean;
  effectiveNextSeasonInterval: SeasonInterval | null;
  effectiveNextSeasonIntermission: number;
};

export function resolveSeasonUpdateState(
  currentGroup: GroupsCrudSeasonState,
  updateGroupDto: UpdateGroupDto,
  now: Date = new Date(),
): ResolvedSeasonUpdateState {
  const requestedSeasonStart = parseUtcDate(updateGroupDto.activeSeasonStartedAt);
  const requestedSeasonEnd = parseUtcDate(updateGroupDto.activeSeasonEndsAt);

  if (
    currentGroup.activeSeasonStartedAt &&
    requestedSeasonStart &&
    !isSameNullableUtcDate(currentGroup.activeSeasonStartedAt, requestedSeasonStart)
  ) {
    throw new BadRequestException('Active season start cannot be modified');
  }

  let effectiveSeasonStart = requestedSeasonStart ?? currentGroup.activeSeasonStartedAt ?? null;
  const effectiveSeasonEnd = requestedSeasonEnd ?? currentGroup.activeSeasonEndsAt ?? null;

  if (requestedSeasonEnd && !effectiveSeasonStart) {
    effectiveSeasonStart = toUtcDay(now);
  }

  if (effectiveSeasonStart && effectiveSeasonEnd) {
    validateSeasonWindow(effectiveSeasonStart, effectiveSeasonEnd, 'Season');
  }

  const nextFieldsTouched = areNextSeasonFieldsTouched(updateGroupDto);
  const effectiveNextSeasonName =
    updateGroupDto.nextSeasonName !== undefined
      ? normalizeSeasonName(updateGroupDto.nextSeasonName)
      : currentGroup.nextSeasonName;
  const effectiveNextSeasonStart =
    updateGroupDto.nextSeasonStartsAt !== undefined
      ? parseUtcDate(updateGroupDto.nextSeasonStartsAt)
      : currentGroup.nextSeasonStartsAt;
  const effectiveNextSeasonEnd =
    updateGroupDto.nextSeasonEndsAt !== undefined
      ? parseUtcDate(updateGroupDto.nextSeasonEndsAt)
      : currentGroup.nextSeasonEndsAt;
  const effectiveNextSeasonSuccessive =
    updateGroupDto.nextSeasonIsSuccessive ?? currentGroup.nextSeasonIsSuccessive;
  const effectiveNextSeasonInterval =
    updateGroupDto.nextSeasonInterval ?? currentGroup.nextSeasonInterval;
  const effectiveNextSeasonIntermission =
    updateGroupDto.nextSeasonIntermissionDays ?? currentGroup.nextSeasonIntermissionDays;
  const effectiveSeasonPauseDays =
    updateGroupDto.seasonPauseDays ?? currentGroup.seasonPauseDays ?? 0;

  if (nextFieldsTouched) {
    const hasMeaningfulNextData =
      !!effectiveNextSeasonName ||
      !!effectiveNextSeasonStart ||
      !!effectiveNextSeasonEnd ||
      effectiveNextSeasonSuccessive;

    if (hasMeaningfulNextData && !effectiveNextSeasonStart) {
      throw new BadRequestException('Next season start date is required');
    }

    if (effectiveNextSeasonStart && effectiveNextSeasonEnd) {
      validateSeasonWindow(
        effectiveNextSeasonStart,
        effectiveNextSeasonEnd,
        'Next season',
      );
    }

    if (effectiveNextSeasonStart && effectiveSeasonEnd) {
      const minFromActiveSeason = addDaysUtc(
        effectiveSeasonEnd,
        effectiveSeasonPauseDays,
      );
      if (effectiveNextSeasonStart.getTime() < minFromActiveSeason.getTime()) {
        throw new BadRequestException(
          'Next season start must be on or after active season end plus pause days',
        );
      }
    }

    const todayUtc = toUtcDay(now);
    if (effectiveNextSeasonStart && effectiveNextSeasonStart.getTime() < todayUtc.getTime()) {
      throw new BadRequestException('Next season start cannot be in the past');
    }

    const pauseUntilUtc = currentGroup.seasonPauseUntil
      ? toUtcDay(currentGroup.seasonPauseUntil)
      : null;
    if (
      effectiveNextSeasonStart &&
      pauseUntilUtc &&
      effectiveNextSeasonStart.getTime() < pauseUntilUtc.getTime()
    ) {
      throw new BadRequestException(
        'Next season start must be on or after the active season pause end',
      );
    }

    if (effectiveNextSeasonSuccessive && !effectiveNextSeasonInterval) {
      throw new BadRequestException(
        'Interval is required when successive schedule is enabled',
      );
    }
  }

  return {
    effectiveSeasonStart,
    effectiveSeasonEnd,
    nextFieldsTouched,
    effectiveNextSeasonName,
    effectiveNextSeasonStart,
    effectiveNextSeasonEnd,
    effectiveNextSeasonSuccessive,
    effectiveNextSeasonInterval,
    effectiveNextSeasonIntermission,
  };
}

