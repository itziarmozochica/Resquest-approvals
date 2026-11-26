import { ChangeDetectionStrategy, Component, computed, inject, input, output, viewChild, type AfterViewChecked } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { IgntDatePickerInputComponent } from '@ignite/legacy/components/ignt-date-picker-input/ignt-date-picker-input.component';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';

import { FztDateSelectorTranslationsDirective } from '../../directives/date-selector-translations.directive';
import type { FztDateSelectorVm, FztSectionToggle } from '../../models/date-selector-vm.model';
import { FztDatePillsRowComponent } from '../date-pills-row/date-pills-row.component';
import { FztTimeslotDayPartsComponent } from '../timeslot-day-parts/timeslot-day-parts.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [FztDateSelectorTranslationsDirective],
  imports: [
    FztDatePillsRowComponent,
    FztTimeslotDayPartsComponent,
    IgntDatePickerInputComponent,
    IgntIconComponent,
    IgntSkeletonBaseComponent,
  ],
  selector: 'fzt-date-selector',
  standalone: true,
  styleUrl: './date-selector.component.scss',
  templateUrl: './date-selector.component.html',
})
export class FztDateSelectorComponent implements AfterViewChecked {
  static readonly skeletonTabWidths: readonly number[] = [68, 77, 65, 50];
  static readonly skeletonTilesCount: readonly number[] = [1, 2, 3];
  protected readonly fromDatePicker = viewChild(IgntDatePickerInputComponent);
  #lastCalendarOpenState: boolean | null | undefined = undefined;
  protected readonly skeletonTabWidths = FztDateSelectorComponent.skeletonTabWidths;
  protected readonly skeletonTiles = FztDateSelectorComponent.skeletonTilesCount;
  protected readonly translations = inject(FztDateSelectorTranslationsDirective).translations;
  readonly vm = input.required<FztDateSelectorVm>();
  readonly isMobile = input(false);
  readonly isTablet = input(false);
  readonly calendarOpenChanged = output<boolean | null>();
  readonly dateSelected = output<string>();
  readonly fromDateChanged = output<string | null>();
  readonly loadMoreClicked = output();
  readonly sectionToggled = output<FztSectionToggle>();
  readonly timeslotConfirmed = output<string>();
  readonly timeslotSelected = output<string>();

  protected readonly isCompactViewport = computed<boolean>(() => this.isMobile() || this.isTablet());
  protected readonly skeletonTileHeight = computed<number>(() => (this.isCompactViewport() ? 62 : 56));
  protected readonly useWhiteSkeleton = computed<boolean>(() => !this.isMobile() && !this.isTablet());

  // The picker mutates `isOpen` without emitting, so the open state is polled per view check
  // (`null` = picker destroyed) and reported as a deduped intent — see AGENTS.md, from-date picker.
  ngAfterViewChecked(): void {
    const isCalendarOpen = this.fromDatePicker()?.isOpen ?? null;

    if (isCalendarOpen === this.#lastCalendarOpenState) {
      return;
    }

    this.#lastCalendarOpenState = isCalendarOpen;
    this.calendarOpenChanged.emit(isCalendarOpen);
  }
}
