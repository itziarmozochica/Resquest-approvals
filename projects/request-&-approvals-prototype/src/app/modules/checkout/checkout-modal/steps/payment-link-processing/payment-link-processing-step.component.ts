import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { CheckoutStore } from '../../store/checkout.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TranslateModule],
  selector: 'app-payment-link-processing-step',
  styleUrl: './payment-link-processing-step.component.scss',
  templateUrl: './payment-link-processing-step.component.html',
})
export class PaymentLinkProcessingStepComponent {
  readonly #store = inject(CheckoutStore);

  constructor() {
    this.#store.startPaymentLinkRequest();
  }
}
