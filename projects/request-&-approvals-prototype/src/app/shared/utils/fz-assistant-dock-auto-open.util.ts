import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { StoragePort } from '@fz/storage';

export function getLocalCalendarDateKey(date: Date = new Date()): string {
  const year: number = date.getFullYear();
  const month: string = String(date.getMonth() + 1).padStart(2, '0');
  const day: string = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isFzAssistantDockDismissedForToday(storage: Pick<StoragePort, 'get'>, today: Date = new Date()): boolean {
  return storage.get<string>(StorageKey.fzAssistantDockDismissedForDay) === getLocalCalendarDateKey(today);
}

export function markFzAssistantDockDismissedForToday(storage: Pick<StoragePort, 'set'>, today: Date = new Date()): void {
  storage.set(StorageKey.fzAssistantDockDismissedForDay, getLocalCalendarDateKey(today));
}
