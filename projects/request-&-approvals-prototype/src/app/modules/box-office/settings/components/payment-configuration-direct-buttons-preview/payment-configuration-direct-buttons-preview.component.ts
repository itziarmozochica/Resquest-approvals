import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IgntButtonComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { PaymentConfigurationDirectButtonsPreviewButton } from './payment-configuration-direct-buttons-preview.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, TranslateModule],
  selector: 'app-payment-configuration-direct-buttons-preview',
  styleUrl: './payment-configuration-direct-buttons-preview.component.scss',
  templateUrl: './payment-configuration-direct-buttons-preview.component.html',
})
export class PaymentConfigurationDirectButtonsPreviewComponent {
  readonly buttons = input.required<PaymentConfigurationDirectButtonsPreviewButton[]>();
  readonly showTitle = input<boolean>(true);
}
