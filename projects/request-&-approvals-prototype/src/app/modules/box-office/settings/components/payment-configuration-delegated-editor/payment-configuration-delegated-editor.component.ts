import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { PaymentConfigurationCatalogMethod } from '../../../shared/models/payment-configuration';
import { MethodChecklistComponent } from '../method-checklist/method-checklist.component';
import { MethodSwitchListComponent } from '../method-switch-list/method-switch-list.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.redesign]': 'redesign()' },
  imports: [MethodChecklistComponent, MethodSwitchListComponent, TranslateModule],
  selector: 'app-payment-configuration-delegated-editor',
  standalone: true,
  styleUrl: './payment-configuration-delegated-editor.component.scss',
  templateUrl: './payment-configuration-delegated-editor.component.html',
})
export class PaymentConfigurationDelegatedEditorComponent {
  readonly delegatedMethods = input.required<PaymentConfigurationCatalogMethod[]>();
  readonly redesign = input<boolean>(false);
  readonly requiredError = input<boolean>(false);
  readonly selectedMethodCodes = input<string[]>([]);

  readonly selectionChange = output<string[]>();
}
