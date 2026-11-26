import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IgntSwitchComponent } from '@ignite/common';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { TranslateModule } from '@ngx-translate/core';

import { PaymentConfigurationCatalogMethod } from '../../../shared/models/payment-configuration';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntFieldErrorComponent, IgntSwitchComponent, TranslateModule],
  selector: 'app-method-switch-list',
  styleUrl: './method-switch-list.component.scss',
  templateUrl: './method-switch-list.component.html',
})
export class MethodSwitchListComponent {
  readonly methods = input.required<PaymentConfigurationCatalogMethod[]>();
  readonly scope = input.required<string>();
  readonly disabled = input<boolean>(false);
  readonly selectedMethodCodes = input<readonly string[]>([]);
  readonly showError = input<boolean>(false);

  readonly selectionChange = output<string[]>();

  protected readonly i18nPrefix = computed<string>(() => `paymentConfig.editor.${this.scope()}.methods`);
  protected readonly testIdPrefix = computed<string>(() => `${this.scope()}-methods`);

  protected isSelected(code: string): boolean {
    return this.selectedMethodCodes().includes(code);
  }

  protected onToggle(code: string, checked: boolean): void {
    const next = checked ? [...this.selectedMethodCodes(), code] : this.selectedMethodCodes().filter(selected => selected !== code);

    this.selectionChange.emit(next);
  }
}
