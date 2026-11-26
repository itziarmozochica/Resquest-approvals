import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { CheckoutStore } from '../../store/checkout.store';
import { resolveCheckoutFailureMessageKey } from '../../utils/checkout-payment-failure.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TranslateModule],
  selector: 'app-checkout-failed-step',
  standalone: true,
  styleUrl: './checkout-failed-step.component.scss',
  templateUrl: './checkout-failed-step.component.html',
})
export class CheckoutFailedStepComponent {
  readonly #store = inject(CheckoutStore);

  protected readonly messageKey: Signal<string> = computed(() =>
    resolveCheckoutFailureMessageKey(this.#store.context().paymentFailureReason),
  );
}
