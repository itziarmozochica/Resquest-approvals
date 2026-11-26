import { detectOverflow } from '@popperjs/core';
import type { Modifier, Options } from '@popperjs/core';

/** How many options a detached popup shows before it scrolls. */
export const VISIBLE_OPTION_COUNT = 3;
/** Used when the popup holds no measurable row yet, so the cap never falls back to unbounded. */
const FALLBACK_MAX_HEIGHT_PX = 330;
/**
 * Floor on the viewport term only: below this a popup shows less than two rows, so overflowing the
 * viewport is the lesser evil. It never raises the row cap, so a popup holding two options stays two
 * options tall.
 */
const MIN_HEIGHT_PX = 96;
const OPTION_SELECTOR = '.dropdown-item';
const VIEWPORT_PADDING_PX = 8;

/**
 * Popper modifier that caps the popup at whichever is smaller: the space left between its field and
 * the edge of the viewport, or `VISIBLE_OPTION_COUNT` option rows.
 *
 * The viewport half is the standard "maxSize" recipe from the Popper docs. `flip` already picks the
 * side with more room, but nothing shrinks the popup once that side is still too small, which is
 * exactly what an open virtual keyboard leaves behind. `detectOverflow` measures how far the popup
 * runs past the edge it grows towards, and the cap turns that overflow into a scroll instead of rows
 * the user cannot reach.
 *
 * The row half keeps the popup short enough to stay out of the keyboard's way even when there would
 * be room for more. The rows are measured rather than assumed, so the cap follows the option row's
 * own padding and font instead of drifting the moment either changes.
 */
const maxHeightModifier: Modifier<'maxHeight', object> = {
  enabled: true,
  name: 'maxHeight',
  phase: 'beforeWrite',
  requires: ['computeStyles'],
  requiresIfExists: ['offset', 'preventOverflow', 'flip'],
  fn: ({ state }) => {
    const overflow = detectOverflow(state, { padding: VIEWPORT_PADDING_PX });
    const grownEdge = state.placement.startsWith('top') ? overflow.top : overflow.bottom;
    const available = state.rects.popper.height - grownEdge;
    const viewportCap = Math.max(available, MIN_HEIGHT_PX);
    state.styles.popper.maxHeight = `${Math.min(viewportCap, visibleOptionsHeight(state.elements.popper))}px`;
  },
};

/**
 * The height the first `VISIBLE_OPTION_COUNT` rows occupy, plus whatever the popup's own border and
 * padding add around them, so the last visible row is not clipped mid-height.
 */
function visibleOptionsHeight(popper: HTMLElement): number {
  const options = Array.from(popper.querySelectorAll<HTMLElement>(OPTION_SELECTOR));
  if (options.length === 0) {
    return FALLBACK_MAX_HEIGHT_PX;
  }

  const rows = options.slice(0, VISIBLE_OPTION_COUNT).reduce((total, option) => total + option.offsetHeight, 0);

  return rows + popper.offsetHeight - popper.clientHeight + verticalPadding(popper);
}

function verticalPadding(popper: HTMLElement): number {
  const styles = globalThis.getComputedStyle?.(popper);
  if (styles === undefined) {
    return 0;
  }

  return Number.parseFloat(styles.paddingTop || '0') + Number.parseFloat(styles.paddingBottom || '0');
}

/**
 * Keeps a popup inside the viewport by height, and short enough that an on-screen keyboard leaves it
 * readable. Meant for `container="body"` popups, whose height is bounded by nothing else. Pass to
 * `NgbTypeahead`'s `popperOptions` input.
 */
export function withViewportMaxHeight(options: Partial<Options>): Partial<Options> {
  return { ...options, modifiers: [...(options.modifiers ?? []), maxHeightModifier] };
}
