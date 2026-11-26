import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { PaymentConfigurationCheckoutFlow } from '../../../shared/models/payment-configuration';
import { CHECKOUT_FLOW_META } from '../../utils/payment-configuration-checkout-flow-meta.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TranslateModule],
  selector: 'app-payment-configuration-checkout-preview',
  styleUrl: './payment-configuration-checkout-preview.component.scss',
  templateUrl: './payment-configuration-checkout-preview.component.html',
})
export class PaymentConfigurationCheckoutPreviewComponent {
  readonly flows = input.required<PaymentConfigurationCheckoutFlow[]>();
  readonly showTitle = input<boolean>(true);

  protected readonly meta = CHECKOUT_FLOW_META;
  protected readonly selectedFlow = computed(() => this.flows()[0]);
}
