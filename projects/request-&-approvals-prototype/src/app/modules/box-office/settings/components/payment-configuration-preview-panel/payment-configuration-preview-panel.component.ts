import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IGNT_DIALOG_DATA, IgntDialogContentComponent, IgntDialogHeaderComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { PaymentConfigurationCheckoutPreviewComponent } from '../payment-configuration-checkout-preview/payment-configuration-checkout-preview.component';
import { PaymentConfigurationDirectButtonsPreviewComponent } from '../payment-configuration-direct-buttons-preview/payment-configuration-direct-buttons-preview.component';
import { PaymentConfigurationMethodsPreviewComponent } from '../payment-configuration-methods-preview/payment-configuration-methods-preview.component';
import { PaymentConfigurationPreviewPanelData } from './payment-configuration-preview-panel.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntDialogContentComponent,
    IgntDialogHeaderComponent,
    PaymentConfigurationCheckoutPreviewComponent,
    PaymentConfigurationDirectButtonsPreviewComponent,
    PaymentConfigurationMethodsPreviewComponent,
    TranslateModule,
  ],
  selector: 'app-payment-configuration-preview-panel',
  templateUrl: './payment-configuration-preview-panel.component.html',
})
export class PaymentConfigurationPreviewPanelComponent {
  protected readonly data = inject<PaymentConfigurationPreviewPanelData>(IGNT_DIALOG_DATA);
}
