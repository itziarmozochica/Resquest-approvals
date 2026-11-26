import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, type Signal } from '@angular/core';

import { IgntDatePickerInputComponent } from '@ignite/legacy/components/ignt-date-picker-input/ignt-date-picker-input.component';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';

import { FztCategoryChipsComponent } from '../../../ticket-selector/components/category-chips/category-chips.component';
import type { FztCategoryChipVm } from '../../../ticket-selector/models/party-ticket-column-vm.model';
import { FztDateSelectorTranslationsDirective } from '../../directives/date-selector-translations.directive';
import type { ResolvedFztDateSelectorTranslations } from '../../models/date-selector-translations.model';
import type {
  FztPartyHandheldDateChipVm,
  FztPartyHandheldDateSectionVm,
  FztPartyHandheldSellingForVm,
} from '../../models/party-handheld-date-vm.model';
import { FztTimePillsRowComponent } from '../time-pills-row/time-pills-row.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [FztDateSelectorTranslationsDirective],
  imports: [FztCategoryChipsComponent, FztTimePillsRowComponent, IgntDatePickerInputComponent, IgntSkeletonBaseComponent],
  selector: 'fzt-party-handheld-date-section',
  styleUrl: './party-handheld-date-section.component.scss',
  templateUrl: './party-handheld-date-section.component.html',
})
export class FztPartyHandheldDateSectionComponent {
  static readonly skeletonTilesCount: readonly number[] = [1, 2, 3];
  readonly #isPickerRequested = signal<boolean>(false);
  protected readonly skeletonTiles = FztPartyHandheldDateSectionComponent.skeletonTilesCount;
  protected readonly translations: Signal<ResolvedFztDateSelectorTranslations> = inject(FztDateSelectorTranslationsDirective).translations;
  readonly vm = input.required<FztPartyHandheldDateSectionVm>();
  readonly dateSelected = output<string>();
  readonly fromDateChanged = output<string | null>();
  readonly hourSelected = output<string | null>();

  // While the picker is requested, Select a date reads as the selected chip, so the day chip the
  // host still holds selected can be tapped to put the picker away (the chips row ignores a tap on
  // its selected chip).
  protected readonly chips: Signal<readonly FztCategoryChipVm[]> = computed(() =>
    this.vm().chips.map(
      (chip: FztPartyHandheldDateChipVm): FztCategoryChipVm => ({
        category: this.#chipLabel(chip, this.translations()),
        isDisabled: !chip.isEnabled,
        isSelected: this.#isPickerRequested() ? chip.key === 'selectADate' : chip.isSelected,
        key: chip.key,
      }),
    ),
  );

  protected readonly sellingForLabel: Signal<string> = computed(() => this.#sellingForLabel(this.vm().sellingFor, this.translations()));

  /** The picker shows once asked for, and stays while the picked day is neither today nor tomorrow. */
  protected readonly showPicker: Signal<boolean> = computed(
    () =>
      this.#isPickerRequested() ||
      this.vm().chips.some((chip: FztPartyHandheldDateChipVm) => chip.key === 'selectADate' && chip.isSelected),
  );

  // `fzt-category-chips` reports the chip's copy, not its key, so the chip is found by its label.
  protected onChipSelected(label: string): void {
    const key = this.chips().find((candidate: FztCategoryChipVm) => candidate.category === label)?.key;
    const chip = this.vm().chips.find((candidate: FztPartyHandheldDateChipVm) => candidate.key === key);

    if (chip === undefined) {
      return;
    }

    if (chip.key === 'selectADate') {
      this.#isPickerRequested.set(true);

      return;
    }

    this.#isPickerRequested.set(false);

    if (chip.dateIso === null || chip.isSelected) {
      return;
    }

    if (chip.isBeforeWindow) {
      this.fromDateChanged.emit(chip.dateIso);

      return;
    }

    this.dateSelected.emit(chip.dateIso);
  }

  #chipLabel(chip: FztPartyHandheldDateChipVm, translations: ResolvedFztDateSelectorTranslations): string {
    switch (chip.key) {
      case 'today':
        return translations.today;
      case 'tomorrow':
        return translations.tomorrow;
      default:
        return translations.selectADate;
    }
  }

  #sellingForLabel(sellingFor: FztPartyHandheldSellingForVm, translations: ResolvedFztDateSelectorTranslations): string {
    switch (sellingFor.kind) {
      case 'today':
        return translations.today;
      case 'tomorrow':
        return translations.tomorrow;
      default:
        return sellingFor.dateLabel;
    }
  }
}
