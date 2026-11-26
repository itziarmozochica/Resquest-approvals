import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';

import { IgntButtonComponent, type IgntButtonIcon } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { CheckoutStore } from '../../store/checkout.store';
import { resolveSessionCancelFailureMessageKey } from '../../utils/checkout-payment-failure.util';

/**
 * Retryable error state of the whole-session cancellation (B2BO-7939), mirroring the
 * payment-failed step UX: the failure reason is surfaced under the title, and the user stays
 * inside the modal (no close, no back — see the step config) with the retry of the cancellation
 * as the only way forward, so a failed cancel is never bypassed.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntIconComponent, TranslateModule],
  selector: 'app-cancel-failed-step',
  standalone: true,
  styleUrl: './cancel-failed-step.component.scss',
  templateUrl: './cancel-failed-step.component.html',
})
export class CancelFailedStepComponent {
  protected readonly store = inject(CheckoutStore);

  protected readonly retryIcon: IgntButtonIcon = { name: 'redo', variant: 'solid' };

  protected readonly messageKey: Signal<string> = computed(() =>
    resolveSessionCancelFailureMessageKey(this.store.context().cancelFailureReason),
  );

  protected retry(): void {
    this.store.retryCancellation();
  }
}
