import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { PaymentConfigurationMethodsPreviewItem } from './payment-configuration-methods-preview.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TranslateModule],
  selector: 'app-payment-configuration-methods-preview',
  styleUrl: './payment-configuration-methods-preview.component.scss',
  templateUrl: './payment-configuration-methods-preview.component.html',
})
export class PaymentConfigurationMethodsPreviewComponent {
  readonly methods = input.required<PaymentConfigurationMethodsPreviewItem[]>();
  readonly showTitle = input<boolean>(true);
}
