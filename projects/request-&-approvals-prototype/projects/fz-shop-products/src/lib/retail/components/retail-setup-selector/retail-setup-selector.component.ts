import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import {
  IgntButtonDropdownComponent,
  type IgntButtonDropdownOption,
} from '@ignite/legacy/components/ignt-button-dropdown/ignt-button-dropdown.component';

import type { AvailableRetailSetup, RetailSetupId } from '../../models/retail-setup/retail-setup.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-testid]': '"retail-setup-selector"',
  },
  imports: [IgntButtonDropdownComponent],
  selector: 'fz-retail-setup-selector',
  standalone: true,
  styleUrl: './retail-setup-selector.component.scss',
  templateUrl: './retail-setup-selector.component.html',
})
export class RetailSetupSelectorComponent {
  readonly availableRetailSetups = input.required<AvailableRetailSetup[]>();
  readonly retailSetupId = input.required<RetailSetupId>();

  readonly selectedRetailSetupId = output<RetailSetupId>();

  protected readonly options = computed<IgntButtonDropdownOption<RetailSetupId>[]>(() =>
    this.availableRetailSetups().map(setup => ({
      label: setup.name,
      selected: setup.id === this.retailSetupId(),
      value: setup.id,
    })),
  );

  protected readonly selectedRetailSetupName = computed(
    () => this.availableRetailSetups().find(setup => setup.id === this.retailSetupId())?.name ?? '',
  );

  protected onOptionClick(retailSetupId: RetailSetupId): void {
    if (retailSetupId !== this.retailSetupId()) {
      this.selectedRetailSetupId.emit(retailSetupId);
    }
  }
}
