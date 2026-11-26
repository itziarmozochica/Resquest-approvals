import { EMPTY, fromEvent, Observable, timer } from 'rxjs';
import { distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';

export const driveSyncPollMaxIdlePolls = 24;

export function pollWhileVisible(active$: Observable<boolean>, document: Document, intervalMs: number): Observable<void> {
  return active$.pipe(
    distinctUntilChanged(),
    switchMap(isActive => (isActive ? ticksWhileVisible(document, intervalMs, intervalMs) : EMPTY)),
  );
}

export function ticksWhileVisible(document: Document, firstTickDelayMs: number, intervalMs: number): Observable<void> {
  return pageVisible$(document).pipe(
    switchMap((isVisible, index) => (isVisible ? timer(index === 0 ? firstTickDelayMs : 0, intervalMs) : EMPTY)),
    map((): void => undefined),
  );
}

function pageVisible$(document: Document): Observable<boolean> {
  function isPageVisible(): boolean {
    return document.visibilityState !== 'hidden';
  }
  return fromEvent(document, 'visibilitychange').pipe(map(isPageVisible), startWith(isPageVisible()), distinctUntilChanged());
}
