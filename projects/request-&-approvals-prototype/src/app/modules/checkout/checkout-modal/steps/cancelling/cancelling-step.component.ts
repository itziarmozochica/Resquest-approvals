import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { combineLatest, timer } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';

import type { CheckoutSessionCancelResult } from '../../models/checkout-payment-port.model';
import { CheckoutStore } from '../../store/checkout.store';

/**
 * Locked in-flight state of the whole-session cancellation (B2BO-7939): the step requests the
 * cancel-and-refund through the payment port on entry and keeps the user inside the modal (the
 * step config exposes no actions and disables closing) until the outcome routes to the
 * cancel-confirmation or the retryable cancel-failed step.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TranslateModule],
  selector: 'app-cancelling-step',
  standalone: true,
  styleUrl: './cancelling-step.component.scss',
  templateUrl: './cancelling-step.component.html',
})
export class CancellingStepComponent {
  /**
   * Upper bound on the wait for the session-cancel outcome, above the driver's own bound on the
   * /cancel call (`SESSION_CANCEL_MAX_WAIT_MS`, 30s, in the split-legs service) so the driver's
   * report always wins when it is alive. The step disables closing, so a lost request — nothing
   * listening on the driver side — must degrade to the retryable cancel-failed step instead of an
   * irrecoverable spinner.
   */
  static readonly maxCancellingWaitMs = 45_000;
  static readonly minCancellingDurationMs = 1500;
  protected readonly store = inject(CheckoutStore);
  readonly #destroyRef = inject(DestroyRef);

  constructor() {
    if (this.store.hasRealPayment()) {
      this.#processSessionCancel();
    } else {
      this.#simulateSessionCancel();
    }
  }

  #processSessionCancel(): void {
    const sessionCancelResult$ = this.store.sessionCancelResult$();
    combineLatest([
      sessionCancelResult$.pipe(
        filter(result => result.kind === 'succeeded'),
        take(1),
      ),
      timer(CancellingStepComponent.minCancellingDurationMs),
    ])
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.store.markCancellationSucceeded());
    sessionCancelResult$
      .pipe(
        filter((result): result is Extract<CheckoutSessionCancelResult, { kind: 'failed' }> => result.kind === 'failed'),
        take(1),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(result => this.store.markCancellationFailed(result.reason));
    timer(CancellingStepComponent.maxCancellingWaitMs)
      .pipe(takeUntil(sessionCancelResult$), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.store.markCancellationFailed('TIMEOUT'));
    this.store.requestSessionCancel();
  }

  /** Undriven contexts (standalone/Storybook/tests) have no backend session: resolve after the animation. */
  #simulateSessionCancel(): void {
    timer(CancellingStepComponent.minCancellingDurationMs)
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.store.markCancellationSucceeded());
  }
}
