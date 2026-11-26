import { A11yModule } from '@angular/cdk/a11y';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';

import { PageDotIndicatorComponent } from '../../../../../shared/components/page-dot-indicator/page-dot-indicator.component';
import { OssTileComponent, OssTileVariant } from '../../../one-stop-shop/components/oss-tile/oss-tile.component';
import { OssTileCategory, OssTileType } from '../../../one-stop-shop/models';
import { OssCustomTabType, OssCustomTabTypes } from '../../../shared/models/onsite-setup';
import {
  CustomTabTile,
  CustomTabTileTargetElementType,
  CustomTabTileType,
  CustomTabTileTypeET,
} from '../../services/onsite-setup-custom-tabs/onsite-setup-custom-tabs.model';

interface GridTileDisplayData {
  category: OssTileCategory;
  customColor: string | null;
  id: number;
  name: string;
  originalTileIndex: number;
  tileId: string;
  type: OssTileType;
}

const TILE_MIN_WIDTH_PX = 208;
const GRID_GAP_PX = 12;
const DEFAULT_ROWS = 4;
const MIN_DRAG_DISTANCE = 30;
const WHEEL_BLOCK_DURATION = 50;
const WHEEL_THRESHOLD = 20;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(pointercancel)': 'onPointerUp()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp()',
    '(wheel)': 'onWheel($event)',
  },
  imports: [OssTileComponent, A11yModule, TranslateModule, PageDotIndicatorComponent, FontAwesomeModule],
  selector: 'app-custom-tabs-tiles-grid',
  standalone: true,
  styleUrls: ['./custom-tabs-tiles-grid.component.scss'],
  templateUrl: './custom-tabs-tiles-grid.component.html',
})
export class CustomTabsTilesGridComponent implements AfterViewInit, OnDestroy {
  #dragStartPosition = 0;
  #dragStartY = 0;
  #elementRef = inject(ElementRef<HTMLElement>);
  #isDragging = false;
  #pageSize = signal(DEFAULT_ROWS * 4);
  #positionPx = signal(0);
  #rafId = 0;
  #resizeObserver?: ResizeObserver;
  #translateService = inject(TranslateService);
  #wheelBlocked = false;
  #wheelTimeout?: ReturnType<typeof setTimeout>;

  tiles = input.required<CustomTabTile[]>();
  displayTiles = computed<GridTileDisplayData[]>(() => {
    let idCounter = 0;
    const allTiles = this.tiles();
    return allTiles.flatMap((tile, tileIndex) => {
      const baseProps = {
        category: OssTileCategory.PRODUCT,
        customColor: tile.customColor,
        originalTileIndex: tileIndex,
        tileId: tile.id,
      };
      const children = tile.previsualizationData?.parentHierarchyElementChildren;

      if (children?.length) {
        return children.map(child => ({
          ...baseProps,
          id: idCounter++,
          name: child.name,
          type: this.#mapChildTileType(child.tileType),
        }));
      }

      return [
        {
          ...baseProps,
          id: idCounter++,
          name: tile.customName ?? tile.name,
          type: this.#mapTileType(tile),
        },
      ];
    });
  });
  allPages = computed(() => {
    const tiles = this.displayTiles();
    const pageSize = this.#pageSize();

    if (tiles.length === 0 || pageSize <= 0) {
      return tiles.length > 0 ? [tiles] : [[]];
    }

    const pages: GridTileDisplayData[][] = [];
    for (let i = 0; i < tiles.length; i += pageSize) {
      pages.push(tiles.slice(i, i + pageSize));
    }
    return pages;
  });
  currentPageIndex = signal(0);
  emptyTabAction = output<void>();
  tabType = input.required<OssCustomTabTypes>();
  emptyTileMessage = computed(() =>
    this.tabType() === OssCustomTabType.parent_hierarchy_element
      ? this.#translateService.instant('boxOffice.customTabs.actions.addNewCategoryButton')
      : this.#translateService.instant('boxOffice.customTabs.actions.addTabItemsButton'),
  );
  isAnimating = signal(false);
  locale = toSignal(
    this.#translateService.onLangChange.pipe(
      map(event => event.lang),
      startWith(this.#translateService.currentLang),
    ),
    { requireSync: true },
  );
  readonly OssCustomTabType = OssCustomTabType;
  readonly OssTileVariant = OssTileVariant;
  slideTransform = computed(() => `translateY(${this.#positionPx()}px)`);
  tileClick = output<{ tileId: string; type: OssTileType }>();
  tileDelete = output<{ tileIndex: number }>();
  tileEditAppearance = output<{ tileIndex: number }>();
  totalPages = computed(() => this.allPages().length);
  variant = input<OssTileVariant>(OssTileVariant.LARGE);

  ngAfterViewInit(): void {
    this.#setupResizeObserver();
    requestAnimationFrame(() => this.#recalculatePageSize());
  }

  ngOnDestroy(): void {
    this.#resizeObserver?.disconnect();
    this.#cancelPendingAnimations();
  }

  onPageSelected(pageIndex: number): void {
    this.#cancelPendingAnimations();
    if (pageIndex !== this.currentPageIndex()) {
      this.#animateOffsetToPage(pageIndex);
    }
  }

  onPointerDown(e: PointerEvent): void {
    if (!this.#isEventInContainer(e) || this.isAnimating()) return;

    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    this.#cancelPendingAnimations();

    this.#isDragging = true;
    this.#dragStartY = e.clientY;
    this.#dragStartPosition = this.#positionPx();
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.#isDragging || this.isAnimating()) return;

    e.preventDefault();
    this.#positionPx.set(this.#dragStartPosition + (e.clientY - this.#dragStartY));
  }

  onPointerUp(): void {
    if (!this.#isDragging) return;

    this.#isDragging = false;
    this.#releaseWithSnap();
  }

  onDeleteTileClick(event: MouseEvent, tileIndex: number): void {
    event.stopPropagation();
    this.tileDelete.emit({ tileIndex });
  }

  onEditAppearanceClick(event: MouseEvent, tileIndex: number): void {
    event.stopPropagation();
    this.tileEditAppearance.emit({ tileIndex });
  }

  onTileClick(event: { id: number; type: OssTileType }): void {
    const displayTile = this.displayTiles()[event.id];
    if (displayTile) {
      this.tileClick.emit({ tileId: displayTile.tileId, type: event.type });
    }
  }

  onWheel(event: WheelEvent): void {
    if (!this.#isEventInContainer(event) || this.#isDragging || this.#wheelBlocked) return;

    event.preventDefault();

    if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;

    clearTimeout(this.#wheelTimeout);

    const currentPage = this.currentPageIndex();
    const targetPage = this.#clampPage(currentPage + (event.deltaY > 0 ? 1 : -1));

    if (targetPage !== currentPage) {
      this.#wheelBlocked = true;
      this.#cancelPendingAnimations();
      this.#animateOffsetToPage(targetPage);
      setTimeout(() => (this.#wheelBlocked = false), WHEEL_BLOCK_DURATION);
    }
  }

  #animateOffsetToPage(targetIndex: number): void {
    const containerHeight = Math.max(1, this.#getContainerHeight());
    const targetOffset = -targetIndex * containerHeight;
    const startOffset = this.#positionPx();
    const distance = Math.abs(targetOffset - startOffset);
    const duration = Math.max(150, Math.min(300, 200 + (distance / containerHeight) * 50));
    const startTime = performance.now();

    this.isAnimating.set(true);

    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const tick = (now: number): void => {
      const progress = Math.min(1, (now - startTime) / duration);
      this.#positionPx.set(startOffset + (targetOffset - startOffset) * easeOutCubic(progress));

      if (progress < 1) {
        this.#rafId = requestAnimationFrame(tick);
      } else {
        this.#positionPx.set(targetOffset);
        this.currentPageIndex.set(targetIndex);
        this.isAnimating.set(false);
      }
    };

    this.#rafId = requestAnimationFrame(tick);
  }

  #calculatePageSize(): number {
    const container = this.#getContainer();
    const gridElement = this.#elementRef.nativeElement.querySelector('.custom-tabs-tiles-grid__grid');
    const firstTile = container?.querySelector('app-oss-tile');

    if (!container || !gridElement || !firstTile) {
      return DEFAULT_ROWS * 2;
    }

    const containerHeight = container.getBoundingClientRect().height;
    const containerWidth = gridElement.getBoundingClientRect().width;
    const tileHeight = firstTile.getBoundingClientRect().height;

    if (tileHeight <= 0 || containerHeight <= 0 || containerWidth <= 0) {
      return DEFAULT_ROWS * 2;
    }

    const columns = Math.max(1, Math.floor((containerWidth + GRID_GAP_PX) / (TILE_MIN_WIDTH_PX + GRID_GAP_PX)));
    const rows = Math.max(1, Math.floor((containerHeight + GRID_GAP_PX) / (tileHeight + GRID_GAP_PX)));

    return columns * rows;
  }

  #cancelPendingAnimations(): void {
    if (this.#rafId) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = 0;
      this.isAnimating.set(false);
    }
    if (this.#wheelTimeout) {
      clearTimeout(this.#wheelTimeout);
      this.#wheelTimeout = undefined;
    }
  }

  #clampPage(page: number): number {
    return Math.max(0, Math.min(this.totalPages() - 1, page));
  }

  #getContainer(): Element | null {
    return this.#elementRef.nativeElement.querySelector('.custom-tabs-tiles-grid__container');
  }

  #getContainerHeight(): number {
    return Math.floor(this.#getContainer()?.getBoundingClientRect().height ?? 500);
  }

  #isEventInContainer(event: Event): boolean {
    return this.#getContainer()?.contains(event.target as Node) ?? false;
  }

  #mapChildTileType(tileType: CustomTabTileTypeET): OssTileType {
    return tileType === CustomTabTileType.LEAF ? OssTileType.LEAF : OssTileType.PARENT;
  }

  #mapTileType(tile: CustomTabTile): OssTileType {
    const { targetElementType, previsualizationData } = tile;

    if (targetElementType === CustomTabTileTargetElementType.PRODUCT) {
      return previsualizationData?.tileType === CustomTabTileType.PARENT ? OssTileType.PARENT : OssTileType.LEAF;
    }

    if (targetElementType === CustomTabTileTargetElementType.SESSION_TYPE) {
      return OssTileType.LEAF;
    }

    return OssTileType.PARENT;
  }

  #recalculatePageSize(): void {
    const newPageSize = this.#calculatePageSize();

    if (newPageSize !== this.#pageSize() && newPageSize > 0) {
      this.#pageSize.set(newPageSize);

      const maxValidPage = Math.max(0, Math.ceil(this.displayTiles().length / newPageSize) - 1);
      if (this.currentPageIndex() > maxValidPage) {
        this.currentPageIndex.set(maxValidPage);
      }

      if (!this.#isDragging && !this.isAnimating()) {
        this.#positionPx.set(-this.currentPageIndex() * this.#getContainerHeight());
      }
    }
  }

  #releaseWithSnap(): void {
    const dragDistance = this.#positionPx() - this.#dragStartPosition;
    const currentPage = this.currentPageIndex();

    let targetPage = currentPage;
    if (Math.abs(dragDistance) > MIN_DRAG_DISTANCE) {
      targetPage = this.#clampPage(currentPage + (dragDistance < 0 ? 1 : -1));
    }

    this.#animateOffsetToPage(targetPage);
  }

  #setupResizeObserver(): void {
    const container = this.#getContainer();
    if (!container) return;

    this.#resizeObserver = new ResizeObserver(() => this.#recalculatePageSize());
    this.#resizeObserver.observe(container);
  }
}
