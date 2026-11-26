import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { TranslateModule } from '@ngx-translate/core';

import { VerticalDraggableListComponent } from '../../../../../shared/components/vertical-draggable-list/vertical-draggable-list.component';
import { PaymentConfigurationCheckoutFlow } from '../../../shared/models/payment-configuration';
import { CHECKOUT_FLOW_META } from '../../utils/payment-configuration-checkout-flow-meta.util';
import { PaymentConfigurationFlowSetting } from '../../utils/payment-configuration-checkout.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntTagComponent, IgntToggleComponent, TranslateModule, VerticalDraggableListComponent],
  selector: 'app-payment-configuration-checkout-flows',
  styleUrl: './payment-configuration-checkout-flows.component.scss',
  templateUrl: './payment-configuration-checkout-flows.component.html',
})
export class PaymentConfigurationCheckoutFlowsComponent {
  readonly flows = input.required<PaymentConfigurationFlowSetting[]>();
  readonly disabled = input<boolean>(false);

  readonly flowsChange = output<PaymentConfigurationFlowSetting[]>();

  protected readonly meta = CHECKOUT_FLOW_META;
  protected readonly defaultFlow = computed(() => this.flows().find(setting => setting.enabled)?.flow);
  protected readonly enabledCount = computed(() => this.flows().filter(setting => setting.enabled).length);

  protected onFlowToggle(flow: PaymentConfigurationCheckoutFlow): void {
    this.flowsChange.emit(this.flows().map(setting => (setting.flow === flow ? { ...setting, enabled: !setting.enabled } : setting)));
  }

  protected onReorder(flows: PaymentConfigurationFlowSetting[]): void {
    this.flowsChange.emit(flows);
  }
}
