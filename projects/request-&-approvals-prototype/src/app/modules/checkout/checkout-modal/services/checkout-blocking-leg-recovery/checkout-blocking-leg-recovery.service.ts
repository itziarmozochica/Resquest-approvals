import { inject, Injectable } from '@angular/core';

import { ChargeInProgressError } from '@fz-original/app/payments/models/charge-in-progress-error.model';
import type { PaymentSplit, PaymentsStatus, SplitChargeStatus } from '@fz-original/app/payments/models/payments.model';
import { getInProgressSplits, getLatestSplit } from '@fz-original/app/payments/services/payments.adapter';
import { PaymentsService } from '@fz-original/app/payments/services/payments.service';
import { ErrorLoggerService } from '@fz-original/app/shared/services/error-logger/error-logger.service';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, concatMap, map, switchMap, tap, toArray } from 'rxjs/operators';

import type { SettleSplitOfOneParams } from '../../models/checkout-payment-driver.model';
import { PaymentAlreadyTakenError } from '../../models/checkout-payment-failure-reason.model';
import { toCents } from '../../utils/checkout-split.util';

export type BlockingLegRecoveryOutcome = { kind: 'triggered' } | { kind: 'settledByBlockingLeg'; childTransactionId: string };

interface ClearedLeg {
  split: PaymentSplit;
  status: SplitChargeStatus | undefined;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutBlockingLegRecoveryService {
  readonly #paymentsService = inject(PaymentsService);
  readonly #errorLogger = inject(ErrorLoggerService);

  readonly #capturedLegs = new Map<string, PaymentSplit>();
  #heldSessionPaidAmount: number | null = null;
  #parentTransactionId: string | null = null;

  heldSessionPaidAmount(): number | null {
    return this.#heldSessionPaidAmount;
  }

  recoverHeldSession(params: SettleSplitOfOneParams, trigger: () => Observable<void>): Observable<BlockingLegRecoveryOutcome> {
    this.#bindSession(params.parentTransactionId);
    return this.#recover(params, trigger);
  }

  reset(): void {
    this.#capturedLegs.clear();
    this.#heldSessionPaidAmount = null;
    this.#parentTransactionId = null;
  }

  triggerOrRecover(params: SettleSplitOfOneParams, trigger: () => Observable<void>): Observable<BlockingLegRecoveryOutcome> {
    this.#bindSession(params.parentTransactionId);
    if (this.#capturedLegs.size > 0) {
      return this.#recover(params, trigger);
    }
    return trigger().pipe(
      map((): BlockingLegRecoveryOutcome => ({ kind: 'triggered' })),
      catchError((error: unknown) => (error instanceof ChargeInProgressError ? this.#recover(params, trigger) : throwError(() => error))),
    );
  }

  #bindSession(parentTransactionId: string): void {
    if (this.#parentTransactionId !== parentTransactionId) {
      this.reset();
      this.#parentTransactionId = parentTransactionId;
    }
  }

  #cancelInProgressLegs(
    params: SettleSplitOfOneParams,
    status: PaymentsStatus,
  ): Observable<{ legs: ClearedLeg[]; sessionPaidAmount: number }> {
    const { cartId, partnerId } = params;
    const inProgress = getInProgressSplits(status);
    if (inProgress.length === 0) {
      const latestSplit = getLatestSplit(status);
      const legs: ClearedLeg[] = latestSplit === null ? [] : [{ split: latestSplit, status: latestSplit.status }];
      return of({ legs, sessionPaidAmount: this.#sessionPaidAmount(status) });
    }
    let sessionPaidAmount = this.#sessionPaidAmount(status);
    return from(inProgress).pipe(
      concatMap(split =>
        this.#paymentsService.cancelPayment({ cartId, childTransactionId: split.id, partnerId, skipRetry: true }).pipe(
          map((response): ClearedLeg => ({ split, status: response.status })),
          tap(leg => {
            if (leg.status === 'success') {
              if (!this.#capturedLegs.has(leg.split.id)) {
                sessionPaidAmount += leg.split.amount;
              }
              this.#capturedLegs.set(leg.split.id, leg.split);
              this.#heldSessionPaidAmount = sessionPaidAmount;
            }
          }),
        ),
      ),
      toArray(),
      map(legs => ({ legs, sessionPaidAmount })),
    );
  }

  #sessionPaidAmount(status: PaymentsStatus): number {
    const uncounted = [...this.#capturedLegs.values()].filter(
      captured => !status.splits.some(split => split.id === captured.id && split.status === 'success'),
    );
    return uncounted.reduce((total, split) => total + split.amount, status.splitPaidAmount);
  }

  #isSameLeg(params: SettleSplitOfOneParams, split: PaymentSplit): boolean {
    const sameAmount = toCents(split.amount) === toCents(params.targetAmount);
    const sameMethod = params.method === undefined || split.paymentMethod === null || split.paymentMethod === params.method;
    return sameAmount && sameMethod;
  }

  #recover(params: SettleSplitOfOneParams, trigger: () => Observable<void>): Observable<BlockingLegRecoveryOutcome> {
    const { cartId, parentTransactionId, partnerId } = params;
    return this.#paymentsService.getPaymentsStatus({ cartId, parentTransactionId, partnerId }).pipe(
      switchMap(status => this.#cancelInProgressLegs(params, status)),
      catchError((error: unknown) => {
        this.#errorLogger.print(error);
        return throwError(() => new ChargeInProgressError());
      }),
      switchMap(({ legs, sessionPaidAmount }) =>
        this.#resolveClearedLegs(params, trigger, this.#withCapturedLegs(legs), sessionPaidAmount),
      ),
    );
  }

  #resolveClearedLegs(
    params: SettleSplitOfOneParams,
    trigger: () => Observable<void>,
    legs: ClearedLeg[],
    sessionPaidAmount: number,
  ): Observable<BlockingLegRecoveryOutcome> {
    if (legs.some(leg => leg.status === 'in_progress')) {
      return throwError(() => new ChargeInProgressError());
    }
    const captured = legs.filter(leg => leg.status === 'success');
    if (captured.length === 0) {
      return trigger().pipe(map((): BlockingLegRecoveryOutcome => ({ kind: 'triggered' })));
    }
    const [capturedLeg] = captured;
    if (captured.length === 1 && this.#isSameLeg(params, capturedLeg.split)) {
      this.#capturedLegs.clear();
      this.#heldSessionPaidAmount = null;
      return of({ childTransactionId: capturedLeg.split.id, kind: 'settledByBlockingLeg' });
    }
    return throwError(() => new PaymentAlreadyTakenError(sessionPaidAmount));
  }

  #withCapturedLegs(legs: ClearedLeg[]): ClearedLeg[] {
    const remembered = [...this.#capturedLegs.values()]
      .filter(split => !legs.some(leg => leg.split.id === split.id))
      .map((split): ClearedLeg => ({ split, status: 'success' }));
    return [...remembered, ...legs.map(leg => (this.#capturedLegs.has(leg.split.id) ? { ...leg, status: 'success' as const } : leg))];
  }
}
