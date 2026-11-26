import {
  afterNextRender,
  afterRenderEffect,
  computed,
  DestroyRef,
  Directive,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';

import type { FztPagedChildBox, FztPagedGridSource, FztPageGeometry, FztPotentialTap } from '../models/paged-grid.model';
import {
  capturePointer,
  computePageBreaks,
  distanceFrom,
  easeOutPage,
  flattenSlideGeometry,
  FZT_PAGED_GRID_PAGING,
  isInsideSidewaysScroller,
  isNestedSidewaysScroll,
  isTap,
  measuredBoxOf,
  pageAnimationDurationMs,
  sameBreaks,
} from '../utils/paged-grid.util';

@Directive({
  host: {
    '[attr.style]': 'hostStyle()',
    '(pointercancel)': 'onPointerUp($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(touchmove)': 'onTouchMove($event)',
    '(wheel)': 'onWheel($event)',
  },
  selector: '[fztPagedGrid]',
})
export class FztPagedGridDirective {
  static readonly fallbackPageHeightPx = 500;
  static readonly remeasureBudgetPerLayout = 4;

  readonly #destroyRef = inject(DestroyRef);
  readonly #source = signal<FztPagedGridSource | null>(null);
  #animationFrameId: number | null = null;
  #animationTargetIndex: number | null = null;
  #dragStartPosition = 0;
  #dragStartY = 0;
  #isDragging = false;
  #pageAnchorChild: number | null = null;
  #potentialTap: FztPotentialTap | null = null;
  #remeasureBudget = FztPagedGridDirective.remeasureBudgetPerLayout;
  #resizeObserver: ResizeObserver | null = null;
  #wheelBlocked = false;
  #wheelTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly #isAnimating = signal(false);
  readonly #pageHeight = signal(FztPagedGridDirective.fallbackPageHeightPx);
  readonly #positionPx = signal(0);

  readonly #isCompact = computed<boolean>(() => this.#source()?.isCompact() ?? false);
  readonly #navigationKey = computed<string>(() => this.#source()?.navigationKey() ?? '');
  readonly #layoutKey = computed<string>(() => (this.#source()?.childKeys() ?? []).join('\u0000'));
  readonly #pageBreaks = linkedSignal<string, readonly number[]>({
    source: this.#layoutKey,
    computation: () => [0],
  });
  readonly pages = computed<readonly number[]>(() => (this.#isCompact() ? [0] : this.#pageBreaks()));
  readonly #pageIndex = linkedSignal<{ key: string; pageCount: number }, number>({
    source: () => ({ key: this.#navigationKey(), pageCount: this.pages().length }),
    computation: ({ key, pageCount }, previous) =>
      previous?.source.key === key ? Math.min(previous.value, Math.max(0, pageCount - 1)) : 0,
  });
  readonly isAnimating = this.#isAnimating.asReadonly();
  readonly pageIndex = this.#pageIndex.asReadonly();
  protected readonly hostStyle = computed<string>(() => `--fzt-slide-offset: ${this.#positionPx()}px;`);

  constructor() {
    afterRenderEffect({
      read: () => {
        this.#source()?.content();
        this.#isCompact();
        this.#pageBreaks();
        this.remeasurePages();
      },
    });

    afterNextRender(() => {
      this.#observeViewport();
    });

    effect(() => {
      const index = this.#pageIndex();
      const height = this.#pageHeight();

      if (this.#isCompact()) {
        this.#positionPx.set(0);

        return;
      }

      if (this.#isDragging || untracked(() => this.#isAnimating())) {
        return;
      }

      this.#positionPx.set(-index * height);
    });

    this.#destroyRef.onDestroy(() => {
      this.#resizeObserver?.disconnect();
      this.#cancelAnimation();
      this.#clearWheelTimeout();
    });
  }

  connect(source: FztPagedGridSource): void {
    this.#source.set(source);
  }

  onPageSelected(pageIndex: number): void {
    this.#cancelAnimation();
    this.#isAnimating.set(false);
    this.#clearWheelTimeout();

    if (pageIndex !== this.#pageIndex()) {
      this.#animateToPage(pageIndex);
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.#isCompact() || isInsideSidewaysScroller(event.target, event.currentTarget)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    capturePointer(event.target, event.pointerId);

    if (this.#isAnimating()) {
      return;
    }

    this.#cancelAnimation();
    this.#clearWheelTimeout();

    const tapTarget = event.target instanceof Element ? event.target.closest('[data-tile-key]') : null;
    const key = tapTarget?.getAttribute('data-tile-key') ?? null;

    this.#potentialTap = key === null ? null : { key, startTime: performance.now(), startX: event.clientX, startY: event.clientY };
    this.#isDragging = true;
    this.#dragStartY = event.clientY;
    this.#dragStartPosition = this.#positionPx();
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.#isCompact() || !this.#isDragging || this.#isAnimating()) {
      return;
    }

    event.preventDefault();

    if (this.#potentialTap !== null && distanceFrom(this.#potentialTap, event) > FZT_PAGED_GRID_PAGING.tapMaxDistancePx) {
      this.#potentialTap = null;
    }

    this.#positionPx.set(this.#dragStartPosition + (event.clientY - this.#dragStartY));
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.#isCompact() || !this.#isDragging) {
      return;
    }

    const potentialTap = this.#potentialTap;

    this.#potentialTap = null;

    if (potentialTap !== null && isTap(potentialTap, event)) {
      this.#isDragging = false;
      this.#snapToCurrentPage();
      this.#source()?.childTapped?.(potentialTap.key);

      return;
    }

    this.#isDragging = false;
    this.#releaseWithSnap();
  }

  protected onTouchMove(event: TouchEvent): void {
    if (this.#isCompact() || isInsideSidewaysScroller(event.target, event.currentTarget)) {
      return;
    }

    event.preventDefault();
  }

  protected onWheel(event: WheelEvent): void {
    if (this.#isCompact() || this.#isDragging || isNestedSidewaysScroll(event)) {
      return;
    }

    event.preventDefault();

    if (this.#wheelBlocked || Math.abs(event.deltaY) < FZT_PAGED_GRID_PAGING.wheelDeltaThreshold) {
      return;
    }

    this.#clearWheelTimeout();

    const currentPage = this.#pageIndex();
    const lastPage = this.pages().length - 1;
    const targetPage = event.deltaY > 0 ? Math.min(currentPage + 1, lastPage) : Math.max(currentPage - 1, 0);

    if (targetPage === currentPage) {
      return;
    }

    this.#wheelBlocked = true;
    this.#cancelAnimation();
    this.#isAnimating.set(false);
    this.#animateToPage(targetPage);
    this.#wheelTimeoutId = setTimeout(() => {
      this.#wheelBlocked = false;
      this.#wheelTimeoutId = null;
    }, FZT_PAGED_GRID_PAGING.wheelBlockDurationMs);
  }

  protected readPageGeometry(): FztPageGeometry | null {
    const viewport = this.#source()?.viewport()?.nativeElement;
    const wrapper = this.#source()?.slidesWrapper()?.nativeElement;

    if (viewport === undefined || wrapper === undefined) {
      return null;
    }

    const slideElements = Array.from(wrapper.children);
    const rowGap = slideElements.length === 0 ? 0 : parseFloat(getComputedStyle(slideElements[0]).rowGap) || 0;
    const slides: FztPagedChildBox[][] = slideElements.map((slide: Element) => {
      const slideTop = slide.getBoundingClientRect().top;

      return Array.from(slide.children).map((child: Element) => {
        const box = measuredBoxOf(child);

        return { height: box.height, offsetTop: box.top - slideTop };
      });
    });

    return { children: flattenSlideGeometry(slides, rowGap), containerHeight: viewport.getBoundingClientRect().height };
  }

  protected remeasurePages(): void {
    if (this.#isCompact()) {
      return;
    }

    const geometry = this.readPageGeometry();

    if (geometry === null) {
      return;
    }

    if (geometry.containerHeight <= 0) {
      return;
    }

    this.#pageHeight.set(geometry.containerHeight);

    const breaks = computePageBreaks(geometry.children, geometry.containerHeight);
    const current = untracked(() => this.#pageBreaks());

    if (current.length === 1 && current[0] === 0) {
      this.#remeasureBudget = FztPagedGridDirective.remeasureBudgetPerLayout;
    }

    if (sameBreaks(breaks, current) || this.#remeasureBudget === 0) {
      this.#restorePageAnchor(current);

      return;
    }

    this.#remeasureBudget -= 1;
    this.#pageBreaks.set(breaks);
    this.#restorePageAnchor(breaks);
  }

  #animateToPage(targetIndex: number): void {
    const navigationKey = untracked(() => this.#navigationKey());
    const height = untracked(() => this.#pageHeight());
    const targetOffset = -targetIndex * height;
    const start = this.#positionPx();
    const duration = pageAnimationDurationMs(Math.abs(targetOffset - start), height);
    const startedAt = performance.now();

    this.#isAnimating.set(true);
    this.#animationTargetIndex = targetIndex;

    const tick = (now: number): void => {
      if (this.#navigationKey() !== navigationKey) {
        this.#animationFrameId = null;
        this.#animationTargetIndex = null;
        this.#isAnimating.set(false);
        this.#snapToCurrentPage();

        return;
      }

      const progress = Math.min(1, (now - startedAt) / duration);

      this.#positionPx.set(start + (targetOffset - start) * easeOutPage(progress));

      if (progress < 1) {
        this.#animationFrameId = requestAnimationFrame(tick);

        return;
      }

      this.#animationFrameId = null;
      this.#animationTargetIndex = null;
      this.#positionPx.set(targetOffset);
      this.#pageIndex.set(targetIndex);
      this.#isAnimating.set(false);
    };

    this.#animationFrameId = requestAnimationFrame(tick);
  }

  #cancelAnimation(): void {
    if (this.#animationFrameId !== null) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }

    this.#animationTargetIndex = null;
  }

  #clearWheelTimeout(): void {
    if (this.#wheelTimeoutId !== null) {
      clearTimeout(this.#wheelTimeoutId);
      this.#wheelTimeoutId = null;
    }

    this.#wheelBlocked = false;
  }

  #observeViewport(): void {
    const viewport = this.#source()?.viewport()?.nativeElement;

    if (viewport === undefined) {
      return;
    }

    this.#resizeObserver = new ResizeObserver(() => {
      const page = this.#animationTargetIndex ?? untracked(() => this.#pageIndex());

      this.#pageAnchorChild ??= untracked(() => this.#pageBreaks()[page] ?? 0);
      this.#cancelAnimation();
      this.#isAnimating.set(false);
      this.#pageBreaks.set([0]);
    });
    this.#resizeObserver.observe(viewport);
  }

  #releaseWithSnap(): void {
    const currentPage = this.#pageIndex();
    const lastPage = this.pages().length - 1;
    const dragDistance = this.#positionPx() - this.#dragStartPosition;
    const threshold = FZT_PAGED_GRID_PAGING.dragPageChangeThresholdPx;
    let target = currentPage;

    if (dragDistance < -threshold && currentPage < lastPage) {
      target = currentPage + 1;
    } else if (dragDistance > threshold && currentPage > 0) {
      target = currentPage - 1;
    }

    this.#animateToPage(Math.max(0, Math.min(lastPage, target)));
  }

  #restorePageAnchor(breaks: readonly number[]): void {
    const anchor = this.#pageAnchorChild;

    if (anchor === null) {
      return;
    }

    this.#pageAnchorChild = null;
    this.#pageIndex.set(breaks.reduce((found: number, start: number, index: number) => (start <= anchor ? index : found), 0));
    this.#snapToCurrentPage();
  }

  #snapToCurrentPage(): void {
    this.#positionPx.set(this.#isCompact() ? 0 : -this.#pageIndex() * this.#pageHeight());
  }
}
