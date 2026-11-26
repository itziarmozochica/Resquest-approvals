import type { SessionsForDateWindow } from '../models/sessions-for-date-window.model';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WINDOW_MARGIN_MS = HOUR_MS;
const LATER_DAY_WINDOW_START_MS = 10 * HOUR_MS;
const DATE_LENGTH = 10;
const WALL_CLOCK_LENGTH = 19;

export function buildSessionsForDateWindow(fromDate: string, timeZone: string, nowMs: number): SessionsForDateWindow | null {
  const nowWallClockMs = toVenueWallClockMs(nowMs, timeZone);
  const dayStartMs = Date.parse(`${fromDate.slice(0, DATE_LENGTH)}T00:00:00Z`);

  if (nowWallClockMs === null || Number.isNaN(dayStartMs) || nowWallClockMs >= dayStartMs + DAY_MS) {
    return null;
  }

  if (nowWallClockMs < dayStartMs) {
    const laterDayStartMs = dayStartMs + LATER_DAY_WINDOW_START_MS;

    return { endDatetime: toWallClock(laterDayStartMs + WINDOW_MARGIN_MS), startDatetime: toWallClock(laterDayStartMs) };
  }

  const nowMinuteMs = nowWallClockMs - (nowWallClockMs % MINUTE_MS);

  return {
    endDatetime: toWallClock(Math.min(dayStartMs + DAY_MS, nowMinuteMs + WINDOW_MARGIN_MS)),
    startDatetime: toWallClock(Math.max(dayStartMs, nowMinuteMs - WINDOW_MARGIN_MS)),
  };
}

function toWallClock(wallClockMs: number): string {
  return new Date(wallClockMs).toISOString().slice(0, WALL_CLOCK_LENGTH);
}

function toVenueWallClockMs(nowMs: number, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
      month: '2-digit',
      second: '2-digit',
      timeZone,
      year: 'numeric',
    }).formatToParts(new Date(nowMs));

    return Date.UTC(
      partValue(parts, 'year'),
      partValue(parts, 'month') - 1,
      partValue(parts, 'day'),
      partValue(parts, 'hour'),
      partValue(parts, 'minute'),
      partValue(parts, 'second'),
    );
  } catch {
    return null;
  }
}

function partValue(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find(part => part.type === type)?.value);
}

export function buildSessionStartWindow(fromDate: string, timeZone: string, sessionStartsAtMs: number): SessionsForDateWindow | null {
  const startWallClockMs = toVenueWallClockMs(sessionStartsAtMs, timeZone);
  const dayStartMs = Date.parse(`${fromDate.slice(0, DATE_LENGTH)}T00:00:00Z`);

  if (startWallClockMs === null || Number.isNaN(dayStartMs) || startWallClockMs < dayStartMs || startWallClockMs >= dayStartMs + DAY_MS) {
    return null;
  }

  const startMinuteMs = startWallClockMs - (startWallClockMs % MINUTE_MS);

  return { endDatetime: toWallClock(startMinuteMs + MINUTE_MS), startDatetime: toWallClock(startMinuteMs) };
}
