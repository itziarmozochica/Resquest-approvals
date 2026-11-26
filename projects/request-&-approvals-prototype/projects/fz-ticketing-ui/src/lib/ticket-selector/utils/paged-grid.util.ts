import type { FztPagedChildBox, FztPotentialTap } from '../models/paged-grid.model';

export const FZT_PAGED_GRID_PAGING = {
  animationBaseDurationMs: 200,
  animationMaxDurationMs: 300,
  animationMinDurationMs: 150,
  dragPageChangeThresholdPx: 30,
  tapMaxDistancePx: 10,
  tapMaxDurationMs: 300,
  wheelBlockDurationMs: 50,
  wheelDeltaThreshold: 20,
} as const;

const SIDEWAYS_SCROLL_OVERFLOWS: readonly string[] = ['auto', 'scroll'];

export function computePageStarts(children: readonly FztPagedChildBox[], containerHeight: number): readonly number[] {
  if (children.length === 0 || containerHeight <= 0) {
    return [0];
  }

  const starts: number[] = [0];
  let currentStart = 0;

  for (const child of children) {
    const bottom = child.offsetTop + child.height;

    if (bottom - currentStart > containerHeight && child.offsetTop > currentStart) {
      currentStart = child.offsetTop;
      starts.push(currentStart);
    }
  }

  return starts;
}

export function easeOutPage(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

export function pageAnimationDurationMs(distancePx: number, containerHeight: number): number {
  const height = Math.max(1, containerHeight);
  const adaptive = FZT_PAGED_GRID_PAGING.animationBaseDurationMs + (distancePx / height) * 50;

  return Math.max(FZT_PAGED_GRID_PAGING.animationMinDurationMs, Math.min(FZT_PAGED_GRID_PAGING.animationMaxDurationMs, adaptive));
}

export function computePageBreaks(children: readonly FztPagedChildBox[], containerHeight: number): readonly number[] {
  return computePageStarts(children, containerHeight).map(start =>
    Math.max(
      0,
      children.findIndex(child => child.offsetTop >= start),
    ),
  );
}

export function flattenSlideGeometry(slides: readonly (readonly FztPagedChildBox[])[], rowGap: number): FztPagedChildBox[] {
  const children: FztPagedChildBox[] = [];
  let slideTop = 0;

  for (const slide of slides) {
    let contentHeight = 0;

    for (const child of slide) {
      children.push({ height: child.height, offsetTop: slideTop + child.offsetTop });
      contentHeight = Math.max(contentHeight, child.offsetTop + child.height);
    }

    slideTop += contentHeight + rowGap;
  }

  return children;
}

export function sliceIntoPages<T>(children: readonly T[], breaks: readonly number[]): readonly (readonly T[])[] {
  return breaks.map((start: number, index: number) => children.slice(start, breaks[index + 1] ?? children.length));
}

export function capturePointer(target: EventTarget | null, pointerId: number): void {
  const capturable = target as { setPointerCapture?: (id: number) => void } | null; // widening to optional: jsdom lacks setPointerCapture

  capturable?.setPointerCapture?.(pointerId);
}

export function distanceFrom(tap: FztPotentialTap, event: PointerEvent): number {
  return Math.sqrt((event.clientX - tap.startX) ** 2 + (event.clientY - tap.startY) ** 2);
}

export function isTap(tap: FztPotentialTap, event: PointerEvent): boolean {
  return (
    distanceFrom(tap, event) <= FZT_PAGED_GRID_PAGING.tapMaxDistancePx &&
    performance.now() - tap.startTime <= FZT_PAGED_GRID_PAGING.tapMaxDurationMs
  );
}

export function closestSidewaysScroller(target: EventTarget | null, boundary: EventTarget | null): Element | null {
  let element: Element | null = target instanceof Element ? target : null;

  while (element !== null && element !== boundary) {
    if (SIDEWAYS_SCROLL_OVERFLOWS.includes(getComputedStyle(element).overflowX)) {
      return element;
    }

    element = element.parentElement;
  }

  return null;
}

export function isInsideSidewaysScroller(target: EventTarget | null, boundary: EventTarget | null): boolean {
  return closestSidewaysScroller(target, boundary) !== null;
}

export function isNestedSidewaysScroll(event: WheelEvent): boolean {
  if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
    return false;
  }

  const scroller = closestSidewaysScroller(event.target, event.currentTarget);

  return scroller !== null && scroller.scrollWidth > scroller.clientWidth;
}

export function measuredBoxOf(element: Element): DOMRect {
  const box = element.getBoundingClientRect();

  if (box.height > 0) {
    return box;
  }

  return element.firstElementChild?.getBoundingClientRect() ?? box;
}

export function sameBreaks(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value: number, index: number) => value === right[index]);
}
