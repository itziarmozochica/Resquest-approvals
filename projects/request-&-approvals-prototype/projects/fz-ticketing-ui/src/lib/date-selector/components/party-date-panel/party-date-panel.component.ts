import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { IgntButtonComponent } from '@ignite/common';
import { IgntDatePickerInputComponent } from '@ignite/legacy/components/ignt-date-picker-input/ignt-date-picker-input.component';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';

import { FztDateSelectorTranslationsDirective } from '../../directives/date-selector-translations.directive';
import type { FztPartyDatePanelVm, FztPartyMemberCounterVm, FztPartyMemberQuantityChange } from '../../models/party-date-panel-vm.model';
import { FztDatePillsRowComponent } from '../date-pills-row/date-pills-row.component';
import { FztPartyMemberCounterComponent } from '../party-member-counter/party-member-counter.component';
import { FztTimePillsRowComponent } from '../time-pills-row/time-pills-row.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [FztDateSelectorTranslationsDirective],
  imports: [
    FztDatePillsRowComponent,
    FztPartyMemberCounterComponent,
    FztTimePillsRowComponent,
    IgntButtonComponent,
    IgntDatePickerInputComponent,
    IgntSkeletonBaseComponent,
  ],
  selector: 'fzt-party-date-panel',
  styleUrl: './party-date-panel.component.scss',
  templateUrl: './party-date-panel.component.html',
})
export class FztPartyDatePanelComponent {
  static readonly skeletonTilesCount: readonly number[] = [1, 2, 3];
  protected readonly skeletonTiles = FztPartyDatePanelComponent.skeletonTilesCount;
  protected readonly translations = inject(FztDateSelectorTranslationsDirective).translations;
  readonly vm = input.required<FztPartyDatePanelVm>();
  /** The clear control belongs to the till layout; the handheld surfaces it above the ticket grid instead. */
  readonly showClearMembers = input(false);
  readonly clearRequested = output();
  readonly dateSelected = output<string>();
  readonly fromDateChanged = output<string | null>();
  readonly hourSelected = output<string | null>();
  readonly loadMoreClicked = output();
  readonly memberQuantityChanged = output<FztPartyMemberQuantityChange>();

  protected readonly hasPartySelection = computed<boolean>(() =>
    this.vm().members.some((member: FztPartyMemberCounterVm) => member.quantity > 0),
  );
  protected readonly showClearButton = computed<boolean>(() => this.showClearMembers() && this.vm().members.length > 0);
}
