import { NgClass, NgFor, NgIf } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  EventEmitter,
  inject,
  input,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  signal,
  Signal,
  SimpleChanges,
  WritableSignal,
} from '@angular/core';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { getDisplayableUnitsAvailable } from '@fz-original/app/modules/box-office/one-stop-shop/utils/oss-tile-availability.util';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { sessionTypeColorsAnswer } from '@fz-original/app/shared/tags/utils/session-type-colors.util';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';

import { PageDotIndicatorComponent } from '../../../../../shared/components/page-dot-indicator/page-dot-indicator.component';
import {
  BreadcrumbItem,
  HierarchyNavigationLeafNode,
  HierarchyNavigationLevel,
  HierarchyNavigationParentNode,
  HierarchyTileData,
  OssSessionAvailability,
  OssTileCategory,
  OssTileType,
  OssTileTypeValues,
} from '../../models';
import { posBreadcrumbsBreadcrumbTapped, type PosBreadcrumbType } from '../../tracking/events/pos-breadcrumbs-breadcrumb-tapped.event';
import { posProductTileTapped } from '../../tracking/events/pos-product-tile-tapped.event';
import { OssTileComponent, OssTileVariant } from '../oss-tile/oss-tile.component';

const tileMinWidthMobilePx = 144;
const tileMinWidthDesktopPx = 208;
const gridGapPx = 12;
const smBreakpointPx = 576;
const defaultRowsFallback = 4;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgFor, NgIf, IgntIconComponent, OssTileComponent, PageDotIndicatorComponent, IgntIconButtonComponent],
  selector: 'app-oss-hierarchy-tiles',
  standalone: true,
  styleUrls: ['./oss-hierarchy-tiles.component.scss'],
  templateUrl: './oss-hierarchy-tiles.component.html',
})
export class OssHierarchyTilesComponent implements AfterViewInit, OnChanges, OnDestroy {
  #breakpointStateService = inject(BreakpointStateService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #zone = inject(NgZone);
  readonly #optimizely = inject(OptimizelyService);
  // `null` until the Optimizely SDK is ready: asked again on the next render instead of freezing the stripe.
  #sessionTypeColorsAnswer: boolean | null = null;
  #dragStartPosition = 0;
  #dragStartY = 0;
  #elementRef = inject(ElementRef);
  #hierarchyPageSize: WritableSignal<number> = signal(defaultRowsFallback * 4);
  #isDragging = false;
  #isTablet: Signal<boolean> = this.#breakpointStateService.getStateProp('isTablet');
  #isMobileOrTablet: Signal<boolean> = computed(() => this.isMobile() || this.#isTablet());
  readonly #listeners: { listener: EventListener; type: string }[] = [];
  #minDragDistanceForPageChange = 30;
  #positionPx: WritableSignal<number> = signal(0);
  #potentialTileClick: {
    element: Element;
    startTime: number;
    startX: number;
    startY: number;
    tileId: number;
    tileType: OssTileType;
  } | null = null;
  #navigationDelayMs = 120;
  #navigationTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #rafId = 0;
  #resizeObserver?: ResizeObserver;
  #wheelBlockDuration = 50;
  #wheelBlocked = false;
  #wheelThreshold = 20;
  #wheelTimeout?: ReturnType<typeof setTimeout>;

  @Output() addUnitBySessionId = new EventEmitter<number>();
  forceDisableIncreaseCounter = input(false);
  allPages: Signal<HierarchyTileData[][]> = computed(() => {
    const tiles = this.currentTiles();

    if (this.#isMobileOrTablet()) {
      return tiles.length > 0 ? [tiles] : [[]];
    }

    const pageSize = this.#hierarchyPageSize();
    const pages: HierarchyTileData[][] = [];

    if (tiles.length === 0 || pageSize <= 0) {
      return [[]];
    }

    const totalPages = Math.ceil(tiles.length / pageSize);

    for (let i = 0; i < totalPages; i++) {
      const start = i * pageSize;
      const end = start + pageSize;
      pages.push(tiles.slice(start, end));
    }

    return pages;
  });
  breadcrumbs: WritableSignal<BreadcrumbItem[]> = signal([]);
  @Output() closed = new EventEmitter<void>();
  currentLevel: WritableSignal<HierarchyNavigationLevel | null> = signal(null);
  currentPageIndex: WritableSignal<number> = signal(0);
  currentTiles: WritableSignal<HierarchyTileData[]> = signal([]);
  @Input() initialLevel: HierarchyNavigationLevel | null = null;
  isAnimating: WritableSignal<boolean> = signal(false);
  isCartLocked = input(false);
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  loading: Signal<boolean> = computed(() => {
    return this.currentLevel() === null && this.currentTiles().length === 0;
  });
  @Input() locale: string | null = null;
  showTicketAvailabilityInfo = input(true);
  protected readonly OssTileVariant = OssTileVariant;
  @Input() sessionAvailabilityMap: Map<number, { isUnavailable: boolean }> | null = null;
  @Output() sessionSelected = new EventEmitter<string>();
  slideTransform: Signal<string> = computed(() => {
    if (this.#isMobileOrTablet()) {
      return 'none';
    }
    return `translateY(${this.#positionPx()}px)`;
  });
  totalPages: Signal<number> = computed(() => {
    if (this.#isMobileOrTablet()) {
      return 1;
    }

    const tiles = this.currentTiles();
    const pageSize = this.#hierarchyPageSize();

    if (tiles.length === 0 || pageSize <= 0) {
      return 1;
    }

    return Math.ceil(tiles.length / pageSize);
  });

  getTileUnitsAvailable(availableTickets: number | null | undefined): number | null {
    return this.showTicketAvailabilityInfo() ? getDisplayableUnitsAvailable(availableTickets) : null;
  }

  isTileOutOfStock(availableTickets: number | null | undefined): boolean {
    return availableTickets === 0;
  }

  canGoNext(): boolean {
    return this.currentPageIndex() < this.totalPages() - 1;
  }

  canGoPrevious(): boolean {
    return this.currentPageIndex() > 0;
  }

  goHome(): void {
    this.closed.emit();
  }

  // The ticket type's tag colour beats the custom tile colour, which beats the category default.
  protected tileColorOf(tileData: HierarchyTileData): string | null {
    const tagColor = this.#hasSessionTypeColors() ? tileData.session?.sessionType?.tileColor : undefined;

    return tagColor ?? tileData.customColor ?? null;
  }

  #hasSessionTypeColors(): boolean {
    this.#sessionTypeColorsAnswer ??= sessionTypeColorsAnswer(this.#optimizely);

    return this.#sessionTypeColorsAnswer ?? false;
  }

  isSessionTileUnavailable(tileData: HierarchyTileData): boolean {
    if (tileData.type === OssTileType.PARENT) {
      return false;
    }
    if (this.isCartLocked()) {
      return true;
    }
    if (tileData.session?.isUnavailable) {
      return true;
    }
    if (tileData.session?.sessionType?.isShopProduct) {
      return false;
    }
    if (!tileData.session) {
      return false;
    }
    return this.forceDisableIncreaseCounter();
  }

  handleTileAdd(event: { id: number; type: OssTileType }): void {
    if (this.#isMobileOrTablet()) {
      this.handleTileClick(event);
    }
  }

  handleTileClick(event: { id: number; type: OssTileType }): void {
    if (event.type === OssTileType.LEAF) {
      if (this.isCartLocked()) {
        return;
      }
      if (this.#isTileDisabled(event.id)) {
        return;
      }
      if (this.#navigationTimeoutId) {
        clearTimeout(this.#navigationTimeoutId);
        this.#navigationTimeoutId = null;
      }
      this.#trackTileTapped(event);
      this.sessionSelected.emit(event.id.toString());
      this.addUnitBySessionId.emit(event.id);
    } else if (event.type === OssTileType.PARENT) {
      this.#trackTileTapped(event);
      if (this.#navigationTimeoutId) {
        clearTimeout(this.#navigationTimeoutId);
      }
      this.#navigationTimeoutId = setTimeout(() => {
        this.#navigationTimeoutId = null;
        const hierarchyTile = this.currentTiles().find(tile => tile.id === event.id);
        if (hierarchyTile?.hierarchyData) {
          this.navigateToLevel(hierarchyTile.hierarchyData);
        }
      }, this.#navigationDelayMs);
    }
  }

  initialize(level: HierarchyNavigationLevel): void {
    this.currentLevel.set(level);
    this.breadcrumbs.set([
      {
        name: level.name,
        level: level,
        isHome: false,
        isCurrentLevel: true,
      },
    ]);
    this.#updateCurrentTiles();
    this.#recalculatePageSize();
  }

  initializeFromLevel(level: HierarchyNavigationLevel): void {
    this.currentLevel.set(level);
    this.breadcrumbs.set([
      {
        name: level.name,
        level,
        isHome: false,
        isCurrentLevel: true,
      },
    ]);
    this.#updateCurrentTiles();
    this.#recalculatePageSize();
  }

  navigateBack(): void {
    const breadcrumbsList = this.breadcrumbs();
    if (breadcrumbsList.length > 1) {
      this.navigateToBreadcrumb(breadcrumbsList[breadcrumbsList.length - 2]);
    }
  }

  navigateToBreadcrumb(breadcrumbItem: BreadcrumbItem, breadcrumbType: PosBreadcrumbType = 'category'): void {
    if (breadcrumbItem.isCurrentLevel) return;

    this.#fzTracking.track(
      posBreadcrumbsBreadcrumbTapped({
        breadcrumbType,
        category: breadcrumbType === 'home' ? null : breadcrumbItem.name,
      }),
    );

    const breadcrumbs = this.breadcrumbs();
    const targetIndex = breadcrumbs.findIndex(b => b === breadcrumbItem);
    if (targetIndex === -1) return;

    if (this.#rafId) {
      cancelAnimationFrame(this.#rafId);
      this.isAnimating.set(false);
    }
    clearTimeout(this.#wheelTimeout);

    const newBreadcrumbs = breadcrumbs.slice(0, targetIndex + 1).map((b, index) => ({
      ...b,
      isCurrentLevel: index === targetIndex,
    }));

    this.currentLevel.set(breadcrumbItem.level);
    this.breadcrumbs.set(newBreadcrumbs);
    this.#updateCurrentTiles();

    this.currentPageIndex.set(0);
    this.#positionPx.set(0);
  }

  navigateToHome(): void {
    const breadcrumbsList = this.breadcrumbs();
    if (breadcrumbsList.length > 0) {
      const firstLevel = breadcrumbsList[0];
      this.navigateToBreadcrumb(firstLevel, 'home');
    }
  }

  navigateToLevel(item: HierarchyNavigationParentNode): void {
    const currentLevelValue = this.currentLevel();
    if (!currentLevelValue) return;

    const newLevel: HierarchyNavigationLevel = {
      name: item.name,
      parentNodes: item.childrenParentNodes,
      leafNodes: item.childrenLeafNodes,
      sessions: currentLevelValue.sessions,
    };

    const currentBreadcrumbs = this.breadcrumbs();
    const updatedBreadcrumbs = currentBreadcrumbs.map(b => ({ ...b, isCurrentLevel: false }));
    updatedBreadcrumbs.push({
      name: item.name,
      level: newLevel,
      isHome: false,
      isCurrentLevel: true,
    });

    this.currentLevel.set(newLevel);
    this.breadcrumbs.set(updatedBreadcrumbs);
    this.#updateCurrentTiles();

    this.currentPageIndex.set(0);
    this.#positionPx.set(0);
  }

  ngAfterViewInit(): void {
    this.#addListener('pointerdown', this.onPointerDown.bind(this) as EventListener);
    this.#addListener('pointermove', this.onPointerMove.bind(this) as EventListener);
    this.#addListener('pointerup', this.onPointerUp.bind(this) as EventListener);
    this.#addListener('pointercancel', this.onPointerUp.bind(this) as EventListener);
    this.#addListener('wheel', this.onWheel.bind(this) as EventListener);
    this.#setupResizeObserver();
    requestAnimationFrame(() => {
      this.#recalculatePageSize();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialLevel'] && this.initialLevel) {
      const previousValue = changes['initialLevel'].previousValue;
      const currentValue = changes['initialLevel'].currentValue;

      const levelActuallyChanged = previousValue !== currentValue;
      const isFirstTime = previousValue === undefined;

      if (levelActuallyChanged || isFirstTime) {
        this.initializeFromLevel(this.initialLevel);
      }
    }

    if (changes['sessionAvailabilityMap']) {
      this.#updateCurrentTiles();
    }
  }

  ngOnDestroy(): void {
    for (const { listener, type } of this.#listeners) {
      (this.#elementRef.nativeElement as HTMLElement).removeEventListener(type, listener);
    }
    this.#resizeObserver?.disconnect();
    if (this.#rafId) {
      cancelAnimationFrame(this.#rafId);
    }
    if (this.#navigationTimeoutId) {
      clearTimeout(this.#navigationTimeoutId);
    }
    clearTimeout(this.#wheelTimeout);
  }

  onPageSelected(pageIndex: number): void {
    if (this.#rafId) {
      cancelAnimationFrame(this.#rafId);
      this.isAnimating.set(false);
    }
    clearTimeout(this.#wheelTimeout);

    if (pageIndex !== this.currentPageIndex()) {
      this.#animateOffsetToPage(pageIndex);
    }
  }

  onPointerDown(e: PointerEvent): void {
    if (this.#isMobileOrTablet()) return;

    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (this.isAnimating()) return;

    if (this.#rafId) {
      cancelAnimationFrame(this.#rafId);
    }
    clearTimeout(this.#wheelTimeout);

    const tileElement = (e.target as Element).closest('app-oss-tile');
    if (tileElement) {
      const tileId = tileElement.getAttribute('data-tile-id');
      const tileType = tileElement.getAttribute('data-tile-type');

      if (tileId && tileType) {
        this.#potentialTileClick = {
          element: tileElement,
          startX: e.clientX,
          startY: e.clientY,
          startTime: performance.now(),
          tileId: parseInt(tileId, 10),
          tileType: tileType as OssTileType,
        };
      }
    }

    this.#isDragging = true;
    this.#dragStartY = e.clientY;
    this.#dragStartPosition = this.#positionPx();
  }

  onPointerMove(e: PointerEvent): void {
    if (this.#isMobileOrTablet()) return;

    if (!this.#isDragging || this.isAnimating()) return;
    e.preventDefault();

    if (this.#potentialTileClick) {
      const moveDistance = Math.sqrt(
        Math.pow(e.clientX - this.#potentialTileClick.startX, 2) + Math.pow(e.clientY - this.#potentialTileClick.startY, 2),
      );

      if (moveDistance > 10) {
        this.#potentialTileClick = null;
      }
    }

    const totalDragDistance = e.clientY - this.#dragStartY;
    const newPosition = this.#dragStartPosition + totalDragDistance;
    this.#positionPx.set(newPosition);
  }

  onPointerUp(e: PointerEvent): void {
    if (this.#isMobileOrTablet()) return;

    if (!this.#isDragging) return;

    if (this.#potentialTileClick) {
      const moveDistance = Math.sqrt(
        Math.pow(e.clientX - this.#potentialTileClick.startX, 2) + Math.pow(e.clientY - this.#potentialTileClick.startY, 2),
      );
      const duration = performance.now() - this.#potentialTileClick.startTime;

      if (moveDistance <= 10 && duration <= 300) {
        const tileClick = { id: this.#potentialTileClick.tileId, type: this.#potentialTileClick.tileType };
        this.#zone.run(() => this.handleTileClick(tileClick));

        this.#isDragging = false;
        this.#potentialTileClick = null;
        return;
      }
    }

    this.#potentialTileClick = null;
    this.#isDragging = false;
    this.#releaseWithSnap();
  }

  onWheel(event: WheelEvent): void {
    if (this.#isMobileOrTablet()) return;

    if (this.#isDragging) return;
    event.preventDefault();

    if (this.#wheelBlocked) {
      return;
    }

    if (Math.abs(event.deltaY) < this.#wheelThreshold) {
      return;
    }

    clearTimeout(this.#wheelTimeout);

    const direction = event.deltaY > 0 ? 1 : -1;
    const currentPage = this.currentPageIndex();
    const totalPages = this.totalPages();
    let targetPage = currentPage;

    if (direction > 0 && currentPage < totalPages - 1) {
      targetPage = currentPage + 1;
    } else if (direction < 0 && currentPage > 0) {
      targetPage = currentPage - 1;
    }

    if (targetPage !== currentPage) {
      this.#wheelBlocked = true;

      if (this.#rafId) {
        cancelAnimationFrame(this.#rafId);
        this.isAnimating.set(false);
      }

      this.#animateOffsetToPage(targetPage);

      setTimeout(() => {
        this.#wheelBlocked = false;
      }, this.#wheelBlockDuration);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByTileId(index: number, tileData: HierarchyTileData): number {
    return tileData.id;
  }

  tileRenderKey(tileData: HierarchyTileData): string {
    const breadcrumbPath = this.breadcrumbs()
      .map(breadcrumb => breadcrumb.name)
      .join('>');
    return `${breadcrumbPath}|${tileData.type}|${tileData.id}|${tileData.name}`;
  }

  #addListener(type: string, listener: EventListener): void {
    this.#zone.runOutsideAngular(() => (this.#elementRef.nativeElement as HTMLElement).addEventListener(type, listener));
    this.#listeners.push({ listener, type });
  }

  #adjustCurrentPageIndex(newPageSize: number): void {
    const tiles = this.currentTiles();
    const newTotalPages = tiles.length > 0 ? Math.ceil(tiles.length / newPageSize) : 1;
    const currentPage = this.currentPageIndex();
    const maxValidPage = Math.max(0, newTotalPages - 1);

    if (currentPage > maxValidPage) {
      this.currentPageIndex.set(maxValidPage);
    }
  }

  #animateOffsetToPage(targetIndex: number): void {
    const h = Math.max(1, this.#getContainerHeight());
    const targetOffset = targetIndex === 0 ? 0 : -targetIndex * h;
    const start = this.#positionPx();

    const distance = Math.abs(targetOffset - start);

    const baseDuration = 200;
    const adaptiveDuration = Math.max(150, Math.min(300, baseDuration + (distance / h) * 50));
    const t0 = performance.now();

    this.isAnimating.set(true);

    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / adaptiveDuration);
      const v = start + (targetOffset - start) * easeOutQuart(k);
      this.#positionPx.set(v);

      if (k < 1) {
        this.#rafId = requestAnimationFrame(tick);
      } else {
        const finalPosition = targetIndex === 0 ? 0 : targetOffset;
        this.#positionPx.set(finalPosition);
        this.currentPageIndex.set(targetIndex);
        this.isAnimating.set(false);
      }
    };

    this.#zone.runOutsideAngular(() => {
      this.#rafId = requestAnimationFrame(tick);
    });
  }

  #calculatePageSize(): number {
    const columns = this.#getColumnsFromContainerWidth();
    const rows = this.#calculateRowsFromDOM();
    return columns * rows;
  }

  #calculateRowsFromDOM(): number {
    const container = (this.#elementRef.nativeElement as HTMLElement).querySelector('.oss-hierarchy-tiles__container');
    const firstTile = container?.querySelector('app-oss-tile');

    if (!container || !firstTile) {
      return defaultRowsFallback;
    }

    const containerHeight = container.getBoundingClientRect().height;
    const tileHeight = firstTile.getBoundingClientRect().height;

    if (tileHeight <= 0 || containerHeight <= 0) {
      return defaultRowsFallback;
    }

    return Math.max(1, Math.floor((containerHeight + gridGapPx) / (tileHeight + gridGapPx)));
  }

  #getCategoryFromSession(): OssTileCategory {
    return OssTileCategory.PRODUCT;
  }

  #trackTileTapped(event: { type: OssTileType }): void {
    this.#fzTracking.track(
      posProductTileTapped({
        tileType: event.type === OssTileType.PARENT ? 'category' : 'product',
      }),
    );
  }

  #getColumnsFromContainerWidth(): number {
    const gridElement = (this.#elementRef.nativeElement as HTMLElement)?.querySelector('.oss-hierarchy-tiles__grid');
    if (!gridElement) {
      return 2;
    }

    const containerWidth = gridElement.getBoundingClientRect().width;
    const isMobile = window.innerWidth < smBreakpointPx;
    const tileMinWidth = isMobile ? Math.max(tileMinWidthMobilePx, containerWidth * 0.34) : tileMinWidthDesktopPx;

    const columns = Math.floor((containerWidth + gridGapPx) / (tileMinWidth + gridGapPx));
    return Math.max(1, columns);
  }

  #getContainerHeight(): number {
    const containerElement = (this.#elementRef.nativeElement as HTMLElement)?.querySelector('.oss-hierarchy-tiles__container');
    if (containerElement) {
      return Math.floor(containerElement.getBoundingClientRect().height);
    }
    return 500;
  }

  #isTileDisabled(tileId: number): boolean {
    const tileData = this.currentTiles().find(tile => tile.id === tileId);
    return tileData?.session?.availableTickets === 0 || tileData?.session?.isUnavailable === true;
  }

  #recalculatePageSize(): void {
    if (this.#isMobileOrTablet()) return;

    const newPageSize = this.#calculatePageSize();
    const oldPageSize = this.#hierarchyPageSize();

    if (newPageSize !== oldPageSize && newPageSize > 0) {
      this.#hierarchyPageSize.set(newPageSize);
      this.#adjustCurrentPageIndex(newPageSize);

      if (!this.#isDragging && !this.isAnimating()) {
        const pageIndex = this.currentPageIndex();
        if (pageIndex === 0) {
          this.#positionPx.set(0);
        } else {
          const h = this.#getContainerHeight();
          const newPosition = -pageIndex * h;
          this.#positionPx.set(newPosition);
        }
      }
    }
  }

  #releaseWithSnap(): void {
    if (this.#isMobileOrTablet()) {
      this.#positionPx.set(0);
      this.currentPageIndex.set(0);
      return;
    }

    const pos = this.#positionPx();
    const currentPageIndex = this.currentPageIndex();

    const totalDragDistance = pos - this.#dragStartPosition;

    let target = currentPageIndex;

    if (Math.abs(totalDragDistance) > this.#minDragDistanceForPageChange) {
      if (totalDragDistance < -this.#minDragDistanceForPageChange && this.canGoNext()) {
        target = currentPageIndex + 1;
      } else if (totalDragDistance > this.#minDragDistanceForPageChange && this.canGoPrevious()) {
        target = currentPageIndex - 1;
      }
    }

    target = Math.max(0, Math.min(this.totalPages() - 1, target));

    this.#animateOffsetToPage(target);
  }

  #setupResizeObserver(): void {
    this.#resizeObserver = new ResizeObserver(() => {
      this.#recalculatePageSize();
    });

    const container = (this.#elementRef.nativeElement as HTMLElement).querySelector('.oss-hierarchy-tiles__container');
    if (container) {
      this.#resizeObserver.observe(container);
    }
  }

  #updateCurrentTiles(): void {
    const level = this.currentLevel();
    if (!level) {
      this.currentTiles.set([]);
      return;
    }

    type TileItem = { data: HierarchyNavigationParentNode | HierarchyNavigationLeafNode; order: number; type: OssTileTypeValues };
    const unsortedTileItems: TileItem[] = [];

    level.parentNodes.forEach(parent => {
      unsortedTileItems.push({ data: parent, order: parent.order, type: OssTileType.PARENT });
    });

    level.leafNodes.forEach(leaf => {
      unsortedTileItems.push({ data: leaf, order: leaf.order, type: OssTileType.LEAF });
    });

    const orderTileTuples: [number, HierarchyTileData][] = [];
    let idCounter = 0;

    unsortedTileItems.forEach(item => {
      if (item.type === OssTileType.PARENT) {
        const parent = item.data as HierarchyNavigationParentNode;
        orderTileTuples.push([
          item.order,
          {
            id: idCounter++,
            name: parent.name,
            type: OssTileType.PARENT,
            category: OssTileCategory.PRODUCT,
            customColor: parent.customColor,
            hierarchyData: parent,
          },
        ]);
      } else {
        const leaf = item.data as HierarchyNavigationLeafNode;
        if (leaf?.sessionId == null) {
          return;
        }

        const sessionIdToMatch = Number(leaf.sessionId);
        const session = level.sessions.find((s: OssSessionAvailability) => Number(s.id) === sessionIdToMatch);

        if (session) {
          let sessionWithAvailabilityUpdated = session;
          const availabilityInfo = this.sessionAvailabilityMap?.get(Number(session.id));
          if (availabilityInfo) {
            sessionWithAvailabilityUpdated = session.clone();
            sessionWithAvailabilityUpdated.isUnavailable = availabilityInfo.isUnavailable;
          }

          const displayName = leaf.customName || session.getDisplayName(false) || '';

          orderTileTuples.push([
            item.order,
            {
              id: Number(session.id),
              name: displayName,
              type: OssTileType.LEAF,
              category: this.#getCategoryFromSession(),
              session: sessionWithAvailabilityUpdated,
              customColor: leaf.customColor,
            },
          ]);
        }
      }
    });

    orderTileTuples.sort((a, b) => {
      if (a[0] !== b[0]) {
        return a[0] - b[0];
      }
      return a[1].name.localeCompare(b[1].name);
    });

    const sortedTiles: HierarchyTileData[] = orderTileTuples.map(tuple => tuple[1]);
    this.currentTiles.set(sortedTiles);

    requestAnimationFrame(() => {
      this.#recalculatePageSize();
    });
  }
}
