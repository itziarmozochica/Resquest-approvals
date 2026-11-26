import { ChangeDetectionStrategy, Component, inject, input, output, type TemplateRef } from '@angular/core';

import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';

import { FztTicketSelectorTranslationsDirective } from '../../directives/ticket-selector-translations.directive';
import type { FztPartyStartTimeTapIntent } from '../../models/party-ticket-column-vm.model';
import type {
  FztBreadcrumbNavigationIntent,
  FztTabVm,
  FztTicketSelectorVm,
  FztTicketsSectionVm,
  FztTileAddIntent,
  FztTileTapIntent,
  FztTileTapPayload,
} from '../../models/ticket-selector-vm.model';
import { FztTicketsSectionComponent } from '../tickets-section/tickets-section.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [FztTicketSelectorTranslationsDirective],
  imports: [FztTicketsSectionComponent, IgntTabsComponent, IgntTabsItemComponent],
  selector: 'fzt-ticket-selector',
  styleUrl: './ticket-selector.component.scss',
  templateUrl: './ticket-selector.component.html',
})
export class FztTicketSelectorComponent {
  protected readonly translations = inject(FztTicketSelectorTranslationsDirective).translations;

  readonly vm = input.required<FztTicketSelectorVm>();
  readonly dateSelectorTemplate = input<TemplateRef<unknown> | null>(null);
  readonly isMobile = input(false);
  readonly isTablet = input(false);
  readonly placeholderTemplate = input<TemplateRef<unknown> | null>(null);
  readonly seatingTemplate = input<TemplateRef<unknown> | null>(null);
  readonly breadcrumbNavigated = output<FztBreadcrumbNavigationIntent>();
  readonly levelSelected = output<readonly string[]>();
  readonly partyCategorySelected = output<string>();
  readonly partySelectMembersRequested = output();
  readonly partyStartTimeTapped = output<FztPartyStartTimeTapIntent>();
  readonly tabSelected = output<number>();
  readonly tileAdd = output<FztTileAddIntent>();
  readonly tileTapped = output<FztTileTapIntent>();

  protected labelFor(tab: FztTabVm): string {
    return tab.labelKey === undefined ? (tab.label ?? '') : this.translations()[tab.labelKey];
  }

  protected onBreadcrumbNavigated(tab: FztTabVm, depth: number): void {
    this.breadcrumbNavigated.emit({ depth, tabKey: tab.key });
  }

  protected onTileAdd(tab: FztTabVm, sessionId: number): void {
    this.tileAdd.emit({ sessionId, tabKey: tab.key });
  }

  protected onTileTapped(tab: FztTabVm, payload: FztTileTapPayload): void {
    this.tileTapped.emit({ ...payload, tabKey: tab.key });
  }

  protected sectionFor(tab: FztTabVm): FztTicketsSectionVm {
    return this.vm().sections[tab.key] ?? { frame: 'loading', grid: null, kind: tab.kind, party: null, showDateSelectorSlot: false };
  }
}
