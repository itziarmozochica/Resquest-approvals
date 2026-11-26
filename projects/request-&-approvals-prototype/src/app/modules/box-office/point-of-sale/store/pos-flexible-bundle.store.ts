import { inject, untracked } from '@angular/core';

import type { FlexibleBundleSessions } from '@fz-original/app/shared/models/plan/flexible-bundle-sessions.model';
import { ErrorLoggerService } from '@fz-original/app/shared/services/error-logger/error-logger.service';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, filter, pipe, switchMap, tap } from 'rxjs';

import {
  initialState,
  type PosFlexibleBundleSessionsRequest,
  type PosFlexibleBundleSettledHandler,
  type PosFlexibleBundleStoreState,
} from '../models/store/pos-flexible-bundle-store.model';
import { TicketingCoreService } from '../services/ticketing-core/ticketing-core.service';

export const PosFlexibleBundleStore = signalStore(
  withState<PosFlexibleBundleStoreState>(initialState),
  withMethods((store, core = inject(TicketingCoreService), errorLogger = inject(ErrorLoggerService)) => {
    let generation = 0;
    let lastRequest: PosFlexibleBundleSessionsRequest | null = null;
    let onSettled: PosFlexibleBundleSettledHandler | null = null;

    function isStale(startedAt: number): boolean {
      return startedAt !== generation;
    }

    function isAlreadyRequested({ channelId, planId }: PosFlexibleBundleSessionsRequest): boolean {
      return lastRequest?.planId === planId && lastRequest.channelId === channelId && untracked(store.error) === null;
    }

    return {
      clear(): void {
        generation += 1;
        lastRequest = null;
        patchState(store, initialState);
      },
      fetchFlexibleBundleSessions: rxMethod<PosFlexibleBundleSessionsRequest>(
        pipe(
          filter((request: PosFlexibleBundleSessionsRequest) => !isAlreadyRequested(request)),
          switchMap((request: PosFlexibleBundleSessionsRequest) => {
            const startedAt = generation;
            lastRequest = request;
            patchState(store, { error: null, flexibleBundleSessions: null, isLoading: true });

            return core.getFlexibleBundleSessions(request.partnerId, request.planId, { channelId: request.channelId }).pipe(
              tap((flexibleBundleSessions: FlexibleBundleSessions) => {
                if (!isStale(startedAt)) {
                  patchState(store, { flexibleBundleSessions, isLoading: false });
                  onSettled?.();
                }
              }),
              catchError((error: unknown) => {
                if (!isStale(startedAt)) {
                  errorLogger.print(error);
                  patchState(store, { error, isLoading: false });
                  onSettled?.();
                }

                return EMPTY;
              }),
            );
          }),
        ),
      ),
      registerOnSettled(handler: PosFlexibleBundleSettledHandler): void {
        onSettled = handler;
      },
    };
  }),
);
