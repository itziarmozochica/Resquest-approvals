import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, viewChild } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { IgntTourAnchorDirective } from '@ignite/legacy/components/ignt-ui-tour/ignt-tour-anchor.directive';

import { FztPagedGridDirective } from '../../directives/paged-grid.directive';
import type { ResolvedFztTicketSelectorTranslations } from '../../models/ticket-selector-translations.model';
import type { FztPagedTileGridChild, FztTileGridVm, FztTileTapPayload, FztTileVm } from '../../models/ticket-selector-vm.model';
import { sliceIntoPages } from '../../utils/paged-grid.util';
import { FztPageDotsComponent } from '../page-dots/page-dots.component';
import { FztTileGridSkeletonComponent } from '../tile-grid-skeleton/tile-grid-skeleton.component';
import { FztTileComponent } from '../tile/tile.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [FztPagedGridDirective],
  imports: [FztPageDotsComponent, FztTileComponent, FztTileGridSkeletonComponent, IgntIconComponent, IgntTourAnchorDirective],
  selector: 'fzt-tile-grid',
  styleUrl: './tile-grid.component.scss',
  templateUrl: './tile-grid.component.html',
})
export class FztTileGridComponent {
  protected readonly paging = inject(FztPagedGridDirective);

  private readonly pagedViewport = viewChild<ElementRef<HTMLElement>>('pagedViewport');
  private readonly slidesWrapper = viewChild<ElementRef<HTMLElement>>('slidesWrapper');

  readonly translations = input.required<ResolvedFztTicketSelectorTranslations>();
  readonly vm = input.required<FztTileGridVm>();
  readonly isMobile = input(false);
  readonly isTablet = input(false);
  readonly tileAdd = output<number>();
  readonly tileTapped = output<FztTileTapPayload>();

  protected readonly isCompact = computed<boolean>(() => this.isMobile() || this.isTablet());
  protected readonly children = computed<readonly FztPagedTileGridChild[]>(() => {
    const children: FztPagedTileGridChild[] = [];

    for (const section of this.vm().sections) {
      if (section.kind === 'hidden') {
        children.push({ key: `section:${section.kind}`, kind: 'hidden', tiles: section.tiles });
      } else {
        for (const tile of section.tiles) {
          children.push({ key: tile.key, kind: 'tile', tile });
        }
      }
    }

    return children;
  });
  protected readonly slides = computed<readonly (readonly FztPagedTileGridChild[])[]>(() =>
    sliceIntoPages(this.children(), this.paging.pages()),
  );
  protected readonly tilesByKey = computed<ReadonlyMap<string, FztTileVm>>(() => {
    const byKey = new Map<string, FztTileVm>();

    for (const section of this.vm().sections) {
      for (const tile of section.tiles) {
        byKey.set(tile.key, tile);
      }
    }

    return byKey;
  });
  protected readonly firstTileKey = computed<string | null>(() => {
    const gridded = this.vm().sections.filter(section => section.kind !== 'hidden');

    return gridded.length === 0 ? null : (gridded[0].tiles[0]?.key ?? null);
  });

  constructor() {
    this.paging.connect({
      childKeys: computed<readonly string[]>(() => this.children().map((child: FztPagedTileGridChild) => child.key)),
      childTapped: (key: string) => {
        this.#activateTile(key);
      },
      content: this.vm,
      isCompact: this.isCompact,
      navigationKey: computed<string>(() => this.vm().navigationKey),
      slidesWrapper: this.slidesWrapper,
      viewport: this.pagedViewport,
    });
  }

  protected onTileAdd(tile: FztTileVm): void {
    if (!this.isCompact()) {
      return;
    }

    this.#activateTile(tile.key);
  }

  protected tourAnchorFor(tile: FztTileVm): string {
    return tile.key === this.firstTileKey() ? this.vm().firstTileTourAnchorId : '';
  }

  #activateTile(key: string): void {
    const tile = this.tilesByKey().get(key);

    if (tile === undefined) {
      return;
    }

    if (tile.kind === 'parent') {
      this.tileTapped.emit({ category: tile.category, tileKey: tile.key, tileKind: 'parent' });

      return;
    }

    if (tile.isOutOfStock || tile.isUnavailable) {
      return;
    }

    this.tileTapped.emit({ category: tile.category, tileKey: tile.key, tileKind: 'leaf' });

    if (tile.sessionId !== null) {
      this.tileAdd.emit(tile.sessionId);
    }
  }
}
