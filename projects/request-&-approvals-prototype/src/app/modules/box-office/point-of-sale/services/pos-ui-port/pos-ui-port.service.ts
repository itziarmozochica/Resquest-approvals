import { Injectable } from '@angular/core';

import { filter, map, merge, Observable, Subject, take } from 'rxjs';

import {
  type PosUiRequest,
  type PosUiRequestContextMap,
  type PosUiRequestKind,
  type PosUiRequestResultMap,
  type PosUiResponse,
} from '../../models/pos-ui-request.model';

/**
 * Request/response channel between the business layer and the UI, mirroring the
 * `CHECKOUT_PAYMENT_PORT` / `CHECKOUT_PAYMENT_DRIVER` precedent. Deliberately dependency-free (no
 * `NgbModal`, no `TranslateService`, no component reference), so there is no DI cycle and no
 * `forwardRef` construction hazard (NG0200).
 *
 * Every request has **two** terminal states, which is what keeps the requesting pipeline from
 * stalling: a value via {@link respond}, or an empty completion via {@link respondComplete}.
 * Parity-locked: a request that completes without emitting must complete the requesting chain
 * silently while its `finalize` still runs.
 */
@Injectable()
export class PosUiPortService {
  readonly #requests$ = new Subject<PosUiRequest>();
  readonly #responses$ = new Subject<PosUiResponse>();
  /** Ids of requests the UI settled without a result (see {@link respondComplete}). */
  readonly #abandons$ = new Subject<number>();
  /** Ids of requests the business layer dropped before the UI settled them (see {@link requestCancelled}). */
  readonly #cancellations$ = new Subject<number>();
  #lastRequestId = 0;

  /**
   * Asks the UI to run `kind` and emits its single result, or completes empty when the UI abandoned
   * the step ({@link respondComplete}).
   *
   * Cold on purpose: the correlation id is allocated on subscribe and both settlement subscriptions
   * are established *before* the request is published, so a synchronous settlement cannot be missed.
   * Unsubscribing before the UI settles it cancels the request ({@link requestCancelled}).
   */
  request<Kind extends PosUiRequestKind>(kind: Kind, context: PosUiRequestContextMap[Kind]): Observable<PosUiRequestResultMap[Kind]> {
    return new Observable<PosUiRequestResultMap[Kind]>(subscriber => {
      const id = ++this.#lastRequestId;
      let isSettled = false;

      // `null` = abandoned. Whichever arrives first wins (`take(1)`), so a late `respond` after a
      // `respondComplete` — or the reverse — is a no-op instead of a second settlement.
      const settled$: Observable<{ result: PosUiRequestResultMap[Kind] } | null> = merge(
        this.#responses$.pipe(
          filter((response): response is PosUiResponse<Kind> => response.id === id),
          map((response: PosUiResponse<Kind>) => ({ result: response.result })),
        ),
        this.#abandons$.pipe(
          filter((abandonedId: number) => abandonedId === id),
          map((): null => null),
        ),
      );

      const subscription = settled$.pipe(take(1)).subscribe({
        complete: () => subscriber.complete(),
        error: (error: unknown) => subscriber.error(error),
        next: (settlement: { result: PosUiRequestResultMap[Kind] } | null) => {
          isSettled = true;
          if (settlement !== null) {
            subscriber.next(settlement.result);
          }
        },
      });

      this.#requests$.next({ context, id, kind } as PosUiRequest);

      return () => {
        subscription.unsubscribe();
        if (!isSettled) {
          this.#cancellations$.next(id);
        }
      };
    });
  }

  /**
   * Emits once when the business layer drops `request` before the UI settled it (the purchase pipeline
   * aborting on a real-time basket expiry, GIT-1564), so the UI closes the step it still shows. Completes
   * without emitting once the request is settled.
   */
  requestCancelled(request: PosUiRequest): Observable<void> {
    return merge(
      this.#cancellations$.pipe(
        filter((cancelledId: number) => cancelledId === request.id),
        map((): boolean => true),
      ),
      this.#responses$.pipe(
        filter((response: PosUiResponse) => response.id === request.id),
        map((): boolean => false),
      ),
      this.#abandons$.pipe(
        filter((abandonedId: number) => abandonedId === request.id),
        map((): boolean => false),
      ),
    ).pipe(
      take(1),
      filter((isCancelled: boolean) => isCancelled),
      map((): void => undefined),
    );
  }

  /** Every pending UI step, in emission order. The component keeps exactly one subscription here. */
  get requests$(): Observable<PosUiRequest> {
    return this.#requests$.asObservable();
  }

  /**
   * Resolves a request. The whole request is echoed back rather than a bare result so the
   * correlation id can never be mismatched at the call site — the strategy-facing surface stays
   * `request(kind, ctx): Observable<Result>`.
   */
  respond<Kind extends PosUiRequestKind>(request: PosUiRequest<Kind>, result: PosUiRequestResultMap[Kind]): void {
    this.#responses$.next({ id: request.id, kind: request.kind, result } as PosUiResponse);
  }

  /**
   * Settles a request **without** a result: {@link request}'s observable completes without emitting,
   * so the requesting pipeline completes silently and its `finalize` still runs. This is the abandon
   * path every handler needs when its modal can close without producing a value.
   */
  respondComplete<Kind extends PosUiRequestKind>(request: PosUiRequest<Kind>): void {
    this.#abandons$.next(request.id);
  }
}
