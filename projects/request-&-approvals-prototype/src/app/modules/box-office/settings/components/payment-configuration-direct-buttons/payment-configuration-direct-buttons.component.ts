import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IgntAlertComponent, IgntSwitchComponent } from '@ignite/common';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';

import {
  PaymentConfigurationDirectButtonSlot,
  PaymentConfigurationDirectButtonSlotChange,
  PaymentConfigurationDirectButtonSlotToggle,
} from './payment-configuration-direct-buttons.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IgntAlertComponent, IgntInputFieldComponent, IgntSwitchComponent, NgSelectModule, TranslateModule],
  selector: 'app-payment-configuration-direct-buttons',
  styleUrl: './payment-configuration-direct-buttons.component.scss',
  templateUrl: './payment-configuration-direct-buttons.component.html',
})
export class PaymentConfigurationDirectButtonsComponent {
  readonly allowSplitPayments = input.required<boolean>();
  readonly slots = input.required<PaymentConfigurationDirectButtonSlot[]>();
  readonly disabled = input<boolean>(false);

  readonly slotChange = output<PaymentConfigurationDirectButtonSlotChange>();
  readonly slotToggle = output<PaymentConfigurationDirectButtonSlotToggle>();
  readonly splitToggle = output<void>();

  protected readonly methodSlots = computed<PaymentConfigurationDirectButtonSlot[]>(() =>
    this.slots().filter(slot => slot.kind === 'method'),
  );
  protected readonly secondaryUnavailable = computed<boolean>(() => {
    const [primary, secondary] = this.methodSlots();
    return secondary?.unavailable === true && primary?.unavailable === false;
  });
  protected readonly seeMoreForced = computed<boolean>(
    () => !this.allowSplitPayments() && this.slots().some(slot => slot.kind === 'see_more'),
  );
  protected readonly splitAlertKey = computed<string>(() =>
    this.slots().some(slot => slot.kind === 'pay')
      ? 'paymentConfig.editor.directButtons.splitAlert.single'
      : 'paymentConfig.editor.directButtons.splitAlert.more',
  );
}
