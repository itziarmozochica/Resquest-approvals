import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';

import type { ResolvedFztDateSelectorTranslations } from '../../models/date-selector-translations.model';
import type { FztDateSelectorVm, FztDayPartVm, FztSectionToggle, FztTimeslotVm } from '../../models/date-selector-vm.model';
import type { FztTimeRangeSection } from '../../models/time-range-section.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntSkeletonBaseComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    NgTemplateOutlet,
  ],
  selector: 'fzt-timeslot-day-parts',
  standalone: true,
  styleUrl: './timeslot-day-parts.component.scss',
  templateUrl: './timeslot-day-parts.component.html',
})
export class FztTimeslotDayPartsComponent {
  // Stored by section, not index: an expired section drops out of `dayParts` and would shift every index after it.
  readonly #manualTabSection = signal<FztTimeRangeSection | null>(null);
  readonly #manualTabSelectionKey = signal<string | null>(null);
  readonly #openedSections = signal<ReadonlySet<FztTimeRangeSection>>(new Set<FztTimeRangeSection>());
  readonly translations = input.required<ResolvedFztDateSelectorTranslations>();
  readonly vm = input.required<FztDateSelectorVm>();
  readonly isMobile = input(false);
  readonly isTablet = input(false);
  readonly sectionToggled = output<FztSectionToggle>();
  readonly timeslotConfirmed = output<string>();
  readonly timeslotSelected = output<string>();

  protected readonly skeletonTileHeight = computed<number>(() => (this.isMobile() || this.isTablet() ? 62 : 56));
  protected readonly useWhiteSkeleton = computed<boolean>(() => !this.isMobile() && !this.isTablet());
  readonly #sectionWithSelectionIndex = computed<number | null>(() => {
    const index = this.vm().dayParts.findIndex(part => part.containsSelection);

    return index >= 0 ? index : null;
  });
  // A manual tab pick is stamped with the selection it was made against, so a new selection drops it (legacy re-synced the tab on every selection change).
  protected readonly selectedTabIndex = computed<number>(() => {
    const manualSection = this.#manualTabSection();
    const manualIndex = manualSection === null ? -1 : this.vm().dayParts.findIndex(part => part.section === manualSection);

    if (manualIndex < 0 || this.#manualTabSelectionKey() !== this.vm().selectedDatetimeKey) {
      return this.#sectionWithSelectionIndex() ?? 0;
    }

    return manualIndex;
  });

  protected chevronIcon(part: FztDayPartVm): IconProp {
    return ['fas', this.isSectionOpen(part) ? 'chevron-up' : 'chevron-down'];
  }

  protected hoursCaptionSuffix(part: FztDayPartVm): string {
    const key = part.hoursCaption;

    return key === null ? '' : ` - ${this.translations()[key]}`;
  }

  protected isSectionOpen(part: FztDayPartVm): boolean {
    return part.containsSelection || this.#openedSections().has(part.section);
  }

  protected onSectionToggle(part: FztDayPartVm): void {
    if (part.containsSelection) {
      return;
    }

    const openedSections = new Set(this.#openedSections());
    const open = !openedSections.has(part.section);

    if (open) {
      openedSections.add(part.section);
    } else {
      openedSections.delete(part.section);
    }

    this.#openedSections.set(openedSections);
    this.sectionToggled.emit({ open, section: part.section });
  }

  protected onTabIndexChange(index: number): void {
    this.#manualTabSection.set(this.vm().dayParts[index]?.section ?? null);
    this.#manualTabSelectionKey.set(this.vm().selectedDatetimeKey);
  }

  protected onTimeslotClick(timeslot: FztTimeslotVm): void {
    if (timeslot.isDisabled) {
      return;
    }

    if (timeslot.datetimeKey !== this.vm().selectedDatetimeKey) {
      this.timeslotSelected.emit(timeslot.datetimeKey);

      return;
    }

    if (this.isMobile() || this.isTablet()) {
      this.timeslotConfirmed.emit(timeslot.datetimeKey);
    }
  }

  protected sectionLabel(part: FztDayPartVm): string {
    return this.translations()[part.section];
  }
}
