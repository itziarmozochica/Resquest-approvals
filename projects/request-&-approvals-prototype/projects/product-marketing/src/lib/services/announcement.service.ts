import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { STORAGE_SERVICE } from '@fz/storage';
import { concat, defer, EMPTY, of, type Observable } from 'rxjs';
import { catchError, concatMap, distinctUntilChanged, finalize, switchMap, take, tap } from 'rxjs/operators';

import type { AnnouncementContext, AnnouncementDescriptor, AnnouncementKey, AnnouncementRegistration } from '../models/announcement.model';
import { ANNOUNCEMENTS_API } from '../ports/announcements-api.port';
import { ANNOUNCEMENTS_CONTEXT } from '../ports/announcements-context.port';
import { ANNOUNCEMENTS_DIALOG } from '../ports/announcements-dialog.port';
import { ANNOUNCEMENT_REGISTRATIONS } from '../tokens/announcement-registrations.token';
import { announcementDismissedEvent, announcementImpressionEvent } from '../tracking/announcement.events';

/**
 * Anti-flash cache of seen announcement keys, reconciled against the server. Also
 * carries the optimistic write on dismissal, so a failed "mark seen" never re-shows.
 */
const SEEN_CACHE_KEY_PREFIX = 'product-marketing.seen-announcements';

/**
 * Scoped per admin to match the server's `(announcement_key, user_id)` store, which holds the
 * global user id and is not partner-scoped: a dismissal suppresses the announcement for that
 * admin under every partner they manage.
 */
const seenCacheKey = (userId: number): string => `${SEEN_CACHE_KEY_PREFIX}.${userId}`;

/**
 * Orchestrates one-time partner-admin announcements.
 *
 * Once per eligible partner admin it loads that admin's eligible announcements,
 * then — for each targeted-and-unseen key with a registered component that the
 * local cache has not already recorded — opens the component in a dialog and, on
 * dismissal, records the view server-side and caches it. Fails closed: any
 * endpoint error results in no announcement being shown, and an empty registry
 * means no work at all.
 *
 * Registered via {@link provideOneTimeAnnouncements}; {@link start} is invoked
 * once by an environment initializer at host bootstrap.
 */
@Injectable()
export class AnnouncementService {
  readonly #context = inject(ANNOUNCEMENTS_CONTEXT);
  readonly #api = inject(ANNOUNCEMENTS_API);
  readonly #dialog = inject(ANNOUNCEMENTS_DIALOG);
  readonly #storage = inject(STORAGE_SERVICE);
  readonly #tracking = inject(FzTrackingService, { optional: true });
  readonly #registrations = inject(ANNOUNCEMENT_REGISTRATIONS, { optional: true }) ?? [];
  readonly #destroyRef = inject(DestroyRef);

  #started = false;

  /**
   * Begins listening for partner-admin context. Idempotent so repeated
   * environment-initializer wiring (or a re-entrant host) cannot double-fire.
   *
   * No-ops on an empty registry: nothing could be shown, so don't spend the GET.
   */
  start(): void {
    if (this.#started || this.#registrations.length === 0) {
      return;
    }
    this.#started = true;

    this.#context.context$
      .pipe(
        // Not `take(1)`: a logout keeps the app instance alive, so the next admin to log
        // in must be evaluated too. `null` is switched on rather than filtered out, so
        // losing the session cancels an in-flight show instead of orphaning its dialog.
        // Keyed on the partner too: `getEligibleAnnouncements()` takes no arguments, so
        // eligibility is decided server-side for the session's current partner and an
        // in-session org switch has to re-ask.
        distinctUntilChanged((previous, current) => previous?.userId === current?.userId && previous?.partnerId === current?.partnerId),
        switchMap(context => (context === null ? EMPTY : this.#loadAndShow(context))),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #loadAndShow(context: AnnouncementContext): Observable<unknown> {
    return this.#api.getEligibleAnnouncements().pipe(
      switchMap(descriptors => this.#showSequentially(this.#selectShowable(descriptors, context), context)),
      // Fail-closed: any failure loading, showing, or recording an announcement
      // results in no announcement rather than blocking the app or repeating.
      catchError((error: unknown) => {
        console.error('[product-marketing] failed to load or show announcements', error);
        return EMPTY;
      }),
    );
  }

  /**
   * Discards anything that is not an array of keys: `StoragePort.get` hands back the raw
   * string for a non-JSON entry, which would otherwise be spread character by character.
   */
  #readSeenCache(context: AnnouncementContext): readonly AnnouncementKey[] {
    const cached = this.#storage.get<unknown>(seenCacheKey(context.userId));
    return Array.isArray(cached) ? cached.filter((key): key is AnnouncementKey => typeof key === 'string') : [];
  }

  /** Optimistically caches + records the view; a failed write is tolerated (cache already guards re-show). */
  #recordSeen(key: AnnouncementKey, context: AnnouncementContext): Observable<unknown> {
    this.#writeSeenCache(key, context);
    this.#tracking?.track(announcementDismissedEvent({ key }));

    return this.#api.markSeen(key).pipe(
      catchError((error: unknown) => {
        console.error(`[product-marketing] failed to record "seen" for "${key}" (partner ${context.partnerId})`, error);
        return of(undefined);
      }),
    );
  }

  /** Registered-and-unseen announcements, in server order, deduplicated by key. */
  #selectShowable(descriptors: readonly AnnouncementDescriptor[], context: AnnouncementContext): AnnouncementRegistration[] {
    const cachedSeen = this.#readSeenCache(context);
    const seenKeys = new Set<AnnouncementKey>(cachedSeen);
    const showable: AnnouncementRegistration[] = [];
    for (const { key } of descriptors) {
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const registration = this.#registrations.find(candidate => candidate.key === key);
        if (registration !== undefined) {
          showable.push(registration);
        }
      }
    }
    return showable;
  }

  #show(registration: AnnouncementRegistration, context: AnnouncementContext): Observable<unknown> {
    const handle = this.#dialog.open(registration.component);
    this.#tracking?.track(announcementImpressionEvent({ key: registration.key }));
    let dismissed = false;

    return handle.closed$.pipe(
      take(1),
      tap(() => {
        dismissed = true;
      }),
      concatMap(() => this.#recordSeen(registration.key, context)),
      // Torn down before dismissal (session lost, or another admin logged in): close the
      // dialog rather than leave it on screen for the next session to stack on top of.
      finalize(() => {
        if (!dismissed) {
          handle.close();
        }
      }),
    );
  }

  /** Shows announcements one at a time so dialogs never stack. */
  #showSequentially(registrations: readonly AnnouncementRegistration[], context: AnnouncementContext): Observable<unknown> {
    if (registrations.length === 0) {
      return EMPTY;
    }
    return concat(
      ...registrations.map(registration =>
        defer(() => this.#show(registration, context)).pipe(
          // Per announcement, so one failing dialog does not starve the rest of the batch.
          catchError((error: unknown) => {
            console.error(`[product-marketing] failed to show "${registration.key}"`, error);
            return EMPTY;
          }),
        ),
      ),
    );
  }

  #writeSeenCache(key: AnnouncementKey, context: AnnouncementContext): void {
    const cachedSeen = this.#readSeenCache(context);
    if (!cachedSeen.includes(key)) {
      this.#storage.set(seenCacheKey(context.userId), [...cachedSeen, key]);
    }
  }
}
