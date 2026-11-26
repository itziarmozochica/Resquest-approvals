import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { PaymentConfigurationCatalogMethod } from '../../../shared/models/payment-configuration';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IgntCheckboxComponent, IgntFieldErrorComponent, IgntInputFieldComponent, TranslateModule],
  selector: 'app-method-checklist',
  standalone: true,
  styleUrl: './method-checklist.component.scss',
  templateUrl: './method-checklist.component.html',
})
export class MethodChecklistComponent {
  readonly methods = input.required<PaymentConfigurationCatalogMethod[]>();
  readonly scope = input.required<string>();
  readonly disabled = input<boolean>(false);
  readonly selectedMethodCodes = input<readonly string[]>([]);
  readonly showError = input<boolean>(false);

  readonly selectionChange = output<string[]>();

  protected readonly searchTerm = signal<string>('');

  protected readonly i18nPrefix = computed<string>(() => `paymentConfig.editor.${this.scope()}.methods`);
  protected readonly testIdPrefix = computed<string>(() => `${this.scope()}-methods`);

  protected readonly filteredMethods = computed<PaymentConfigurationCatalogMethod[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const methods = this.methods();

    if (term === '') {
      return methods;
    }

    return methods.filter(({ code, name }) => code.toLowerCase().includes(term) || name.toLowerCase().includes(term));
  });

  protected readonly methodRows = computed<number>(() => Math.max(3, Math.ceil(this.filteredMethods().length / 3)));

  constructor() {
    effect(() => {
      this.methods();
      untracked(() => this.searchTerm.set(''));
    });
  }

  protected isSelected(code: string): boolean {
    return this.selectedMethodCodes().includes(code);
  }

  protected onToggle(code: string, checked: boolean): void {
    const next = checked ? [...this.selectedMethodCodes(), code] : this.selectedMethodCodes().filter(selected => selected !== code);

    this.selectionChange.emit(next);
  }
}
