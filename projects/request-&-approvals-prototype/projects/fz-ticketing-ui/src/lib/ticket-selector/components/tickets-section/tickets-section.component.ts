import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, type TemplateRef } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';

import type { FztPartyColumnVm, FztPartyStartTimeTapIntent } from '../../models/party-ticket-column-vm.model';
import type { ResolvedFztTicketSelectorTranslations } from '../../models/ticket-selector-translations.model';
import type { FztTicketsSectionVm, FztTileGridVm, FztTileTapPayload } from '../../models/ticket-selector-vm.model';
import { FztBreadcrumbsComponent } from '../breadcrumbs/breadcrumbs.component';
import { FztCategoryChipsComponent } from '../category-chips/category-chips.component';
import { FztExplodeLevelsComponent } from '../explode-levels/explode-levels.component';
import { FztPartyTileGridComponent } from '../party-tile-grid/party-tile-grid.component';
import { FztTileGridComponent } from '../tile-grid/tile-grid.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FztBreadcrumbsComponent,
    FztCategoryChipsComponent,
    FztExplodeLevelsComponent,
    FztPartyTileGridComponent,
    FztTileGridComponent,
    IgntIconComponent,
    NgTemplateOutlet,
  ],
  selector: 'fzt-tickets-section',
  styleUrl: './tickets-section.component.scss',
  templateUrl: './tickets-section.component.html',
})
export class FztTicketsSectionComponent {
  static readonly skeletonGrid: FztTileGridVm = {
    breadcrumbs: [],
    firstTileTourAnchorId: '',
    levels: [],
    navigationKey: '',
    sections: [],
    showTaxesIncluded: false,
    skeleton: true,
    testId: null,
  };
  static readonly skeletonParty: FztPartyColumnVm = {
    categoryChips: [],
    grid: { navigationKey: '', state: 'skeleton', tiles: [] },
    showTaxesIncluded: false,
  };

  readonly translations = input.required<ResolvedFztTicketSelectorTranslations>();
  readonly vm = input.required<FztTicketsSectionVm>();
  readonly dateSelectorTemplate = input<TemplateRef<unknown> | null>(null);
  readonly isMobile = input(false);
  readonly isTablet = input(false);
  readonly placeholderTemplate = input<TemplateRef<unknown> | null>(null);
  readonly seatingTemplate = input<TemplateRef<unknown> | null>(null);
  readonly breadcrumbNavigated = output<number>();
  readonly levelSelected = output<readonly string[]>();
  readonly partyCategorySelected = output<string>();
  readonly partySelectMembersRequested = output();
  readonly partyStartTimeTapped = output<FztPartyStartTimeTapIntent>();
  readonly tileAdd = output<number>();
  readonly tileTapped = output<FztTileTapPayload>();

  protected readonly columnGrid = computed<FztTileGridVm | null>(() =>
    this.vm().frame === 'loading' && this.vm().kind === 'tickets' ? FztTicketsSectionComponent.skeletonGrid : this.vm().grid,
  );
  protected readonly columnParty = computed<FztPartyColumnVm | null>(() =>
    this.vm().frame === 'loading' && this.vm().kind === 'party-members' ? FztTicketsSectionComponent.skeletonParty : this.vm().party,
  );
  protected readonly showDateSelectorSlot = computed<boolean>(
    () => this.vm().frame !== 'placeholder' && this.vm().showDateSelectorSlot && !this.isMobile() && !this.isTablet(),
  );
}
