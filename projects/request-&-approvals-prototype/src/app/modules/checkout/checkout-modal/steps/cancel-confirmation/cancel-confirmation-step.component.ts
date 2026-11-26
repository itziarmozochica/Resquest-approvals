import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { CheckoutStore } from '../../store/checkout.store';
import { formatCheckoutCollectedAmount, resolveCancelConfirmationMessageKey } from '../../utils/checkout-sold-out.util';

/**
 * Dedicated Cancel Confirmation step (B2BO-7939): the whole session was cancelled and refunded.
 * Purely presentational — the single Close action lives in the step config and closes the modal
 * with `completed: false`, so the cart and its reserved capacity are left untouched.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TranslateModule],
  selector: 'app-cancel-confirmation-step',
  standalone: true,
  styleUrl: './cancel-confirmation-step.component.scss',
  templateUrl: './cancel-confirmation-step.component.html',
})
export class CancelConfirmationStepComponent {
  readonly #store = inject(CheckoutStore);

  protected readonly messageKey: Signal<string> = computed(() => resolveCancelConfirmationMessageKey(this.#store.context()));

  protected readonly collectedAmount: Signal<string> = computed(() => formatCheckoutCollectedAmount(this.#store.context()));
}
