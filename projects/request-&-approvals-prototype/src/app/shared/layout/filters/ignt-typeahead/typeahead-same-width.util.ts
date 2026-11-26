import type { Modifier, Options } from '@popperjs/core';

/**
 * Popper modifier that gives the popup exactly the width of the field it belongs to — the standard
 * "sameWidth" recipe from the Popper docs. `fn` keeps the width in sync on every reposition
 * (resizes, scrolling); `effect` writes it before the first paint so the popup never flashes at its
 * content width.
 */
const sameWidthModifier: Modifier<'sameWidth', object> = {
  enabled: true,
  name: 'sameWidth',
  phase: 'beforeWrite',
  requires: ['computeStyles'],
  effect: ({ state }) => {
    const reference = state.elements.reference;
    if (reference instanceof HTMLElement) {
      state.elements.popper.style.width = `${reference.offsetWidth}px`;
    }
  },
  fn: ({ state }) => {
    state.styles.popper.width = `${state.rects.reference.width}px`;
  },
};

/**
 * Makes a typeahead popup as wide as its field, like the inline dropdowns whose CSS `width: 100%`
 * already does that. Meant for `container="body"` popups, where the popup is not a descendant of the
 * field and only the positioner knows both widths. Pass to `NgbTypeahead`'s `popperOptions` input.
 */
export function withSameWidth(options: Partial<Options>): Partial<Options> {
  return { ...options, modifiers: [...(options.modifiers ?? []), sameWidthModifier] };
}
