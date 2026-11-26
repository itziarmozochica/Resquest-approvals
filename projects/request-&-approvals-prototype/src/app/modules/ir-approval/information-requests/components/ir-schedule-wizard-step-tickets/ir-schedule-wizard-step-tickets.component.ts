import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { parseSelectedProductIds, withSelectedProductIds } from '../../models/event-schedule-composer-v1.helpers';
import { NamedDateRangeV1, ProductRow } from '../../models/event-schedule-composer-v1.model';

/**
 * Tickets step of the band wizard: selects which of the globally-defined products (Products section)
 * apply to this band. The selection is stored on the band as `bandTicketTypesAnswer` JSON
 * (`{ selectedProductIds: string[], v:4 }`); product definition + pricing live in the global catalog.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-ir-schedule-wizard-step-tickets',
  standalone: true,
  styleUrls: ['./ir-schedule-wizard-step-tickets.component.scss'],
  templateUrl: './ir-schedule-wizard-step-tickets.component.html',
})
export class IrScheduleWizardStepTicketsComponent {
  readonly band = input.required<NamedDateRangeV1>();
  readonly allProducts = input<ProductRow[]>([]);
  readonly validationAttempted = input<boolean>(false);
  readonly bandChange = output<NamedDateRangeV1>();

  readonly options = computed(() => {
    const selected = new Set(this.#selectedIds());
    return this.allProducts()
      .filter(product => product.name.trim())
      .map(product => ({ id: product.id, name: product.name, selected: selected.has(product.id) }));
  });

  readonly hasProducts = computed<boolean>(() => this.options().length > 0);
  readonly selectionMissing = computed<boolean>(() => this.validationAttempted() && this.options().every(option => !option.selected));

  toggle(id: string, checked: boolean): void {
    const current = new Set(this.#selectedIds());
    if (checked) {
      current.add(id);
    } else {
      current.delete(id);
    }
    const next = this.allProducts()
      .map(product => product.id)
      .filter(productId => current.has(productId));
    this.bandChange.emit({ ...this.band(), bandTicketTypesAnswer: withSelectedProductIds(next) });
  }

  #selectedIds(): string[] {
    return parseSelectedProductIds(this.band().bandTicketTypesAnswer, this.allProducts());
  }
}
