import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, viewChild } from '@angular/core';

import { IgntButtonComponent } from '@ignite/common';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';

import { FztPagedGridDirective } from '../../directives/paged-grid.directive';
import type {
  FztPartyStartTimeTapIntent,
  FztPartyStartTimeVm,
  FztPartyTileGridVm,
  FztPartyTileVm,
} from '../../models/party-ticket-column-vm.model';
import type { ResolvedFztTicketSelectorTranslations } from '../../models/ticket-selector-translations.model';
import { sliceIntoPages } from '../../utils/paged-grid.util';
import { FztPageDotsComponent } from '../page-dots/page-dots.component';
import { FztPartyTileComponent } from '../party-tile/party-tile.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [FztPagedGridDirective],
  imports: [FztPageDotsComponent, FztPartyTileComponent, IgntButtonComponent, IgntSkeletonBaseComponent],
  selector: 'fzt-party-tile-grid',
  styleUrl: './party-tile-grid.component.scss',
  templateUrl: './party-tile-grid.component.html',
})
export class FztPartyTileGridComponent {
  static readonly skeletonTileCount = 6;

  protected readonly paging = inject(FztPagedGridDirective);

  private readonly pagedViewport = viewChild<ElementRef<HTMLElement>>('pagedViewport');
  private readonly slidesWrapper = viewChild<ElementRef<HTMLElement>>('slidesWrapper');

  readonly translations = input.required<ResolvedFztTicketSelectorTranslations>();
  readonly vm = input.required<FztPartyTileGridVm>();
  readonly isMobile = input(false);
  readonly isTablet = input(false);
  readonly selectMembersRequested = output();
  readonly startTimeTapped = output<FztPartyStartTimeTapIntent>();

  protected readonly skeletonTiles: readonly number[] = Array.from(
    { length: FztPartyTileGridComponent.skeletonTileCount },
    (_unused: unknown, index: number) => index,
  );
  protected readonly isCompact = computed<boolean>(() => this.isMobile() || this.isTablet());
  protected readonly slides = computed<readonly (readonly FztPartyTileVm[])[]>(() => sliceIntoPages(this.vm().tiles, this.paging.pages()));
  protected readonly intentsByKey = computed<ReadonlyMap<string, FztPartyStartTimeTapIntent>>(() => {
    const byKey = new Map<string, FztPartyStartTimeTapIntent>();

    for (const tile of this.vm().tiles) {
      for (const startTime of tile.startTimes.filter((candidate: FztPartyStartTimeVm) => !candidate.isDisabled)) {
        byKey.set(startTime.key, { fit: startTime.fit, leafKey: tile.key, leafName: tile.name });
      }
    }

    return byKey;
  });

  constructor() {
    this.paging.connect({
      childKeys: computed<readonly string[]>(() => this.vm().tiles.map((tile: FztPartyTileVm) => tile.key)),
      content: this.vm,
      isCompact: this.isCompact,
      navigationKey: computed<string>(() => this.vm().navigationKey),
      slidesWrapper: this.slidesWrapper,
      viewport: this.pagedViewport,
    });
  }

  protected onStartTimeSelected(startTime: FztPartyStartTimeVm): void {
    const intent = this.intentsByKey().get(startTime.key);

    if (intent !== undefined) {
      this.startTimeTapped.emit(intent);
    }
  }
}
