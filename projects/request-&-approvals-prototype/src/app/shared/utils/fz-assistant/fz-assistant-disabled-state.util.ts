import { isFzAssistantTemporalKind, readFzAssistantNativeControlKind } from './fz-assistant-native-control-kind.util';

/**
 * Native `disabled` only: the attribute, `:disabled`, and the `<fieldset disabled>` walk.
 *
 * Not what either side reads directly - both go through {@link isFzAssistantElementUnavailable}, which
 * adds `aria-disabled`. Note the attribute branch is deliberately loose: a bare `disabled` on a custom
 * element host blocks nothing in the browser, and is treated as unavailable anyway because a host that
 * declares itself disabled is not one the Partner is meant to operate.
 */
export function isFzAssistantElementDisabled(element: Element): boolean {
  if (element instanceof HTMLElement && element.hasAttribute('disabled')) {
    return true;
  }

  // `:disabled` includes descendants of `<fieldset disabled>` in browsers; `.disabled` does not.
  if (element.matches(':disabled')) {
    return true;
  }

  return isInsideDisabledFieldset(element);
}

/**
 * Native **or** ARIA disabled — the state Discover publishes as `disabled` and Act refuses to
 * operate.
 *
 * `aria-disabled` is the only signal for widgets that must stay focusable (Ignite buttons, tabs,
 * ng-select). The browser still dispatches their events, so Act has to refuse them explicitly:
 * clicking a control the Partner cannot click would report `ok` for a step that changed nothing.
 */
export function isFzAssistantElementUnavailable(element: Element): boolean {
  return isFzAssistantElementDisabled(element) || element.getAttribute('aria-disabled') === 'true';
}

/**
 * Native **or** ARIA readonly — the state Discover publishes as `readonly` and Act refuses to write.
 *
 * `aria-readonly` is the only signal for widgets with no `readOnly` property to set, and script can
 * write either kind regardless: assignment does not care, so nothing stops the fill but this. A
 * readonly control the Partner cannot type into is one Act must not type into either, or the agent
 * reports a change the user can neither see the point of nor undo.
 *
 * Clicks are deliberately not gated on this: readonly blocks editing, not activation.
 */
export function isFzAssistantElementReadonly(element: Element): boolean {
  if (isNativeReadonly(element)) {
    return true;
  }

  return element.getAttribute('aria-readonly') === 'true';
}

/**
 * `readOnly` reflects the attribute for every input type, but HTML honours it only for the text-like,
 * numeric and temporal ones. On a checkbox, radio, range, colour or file input the attribute does nothing
 * and the Partner can still change the control, so reading it there published `readonly` on something Act
 * would then refuse to write - the mismatch pointing the other way.
 */
function isNativeReadonly(element: Element): boolean {
  if (element instanceof HTMLTextAreaElement) {
    return element.readOnly;
  }

  if (!(element instanceof HTMLInputElement) || !element.readOnly) {
    return false;
  }

  const kind = readFzAssistantNativeControlKind(element);

  // Not `range`: HTML applies `readonly` to the text-like, numeric and temporal types, and a slider is
  // none of them - the Partner can still drag it.
  return kind === 'numeric' || kind === 'password' || kind === 'text' || isFzAssistantTemporalKind(kind);
}

/**
 * A `<select>` option the Partner cannot choose: disabled itself, or inside a disabled `<optgroup>`.
 *
 * Script can still select either, so this is the one predicate both sides read: Discover must not
 * advertise an option Act would refuse, and Act must refuse a fill naming one Discover never offered.
 */
export function isFzAssistantOptionUnavailable(option: HTMLOptionElement): boolean {
  if (isFzAssistantElementDisabled(option)) {
    return true;
  }

  // `:disabled` covers optgroup-disabled options in browsers but not reliably in jsdom, so the
  // group is checked explicitly.
  const group = option.parentElement;

  return group instanceof HTMLOptGroupElement && group.disabled;
}

/** The elements HTML's `<fieldset disabled>` actually disables - its "listed" form controls. */
const FIELDSET_DISABLEABLE_TAGS = new Set(['BUTTON', 'FIELDSET', 'INPUT', 'OBJECT', 'OUTPUT', 'SELECT', 'TEXTAREA']);

function firstLegendChild(fieldset: HTMLFieldSetElement): HTMLLegendElement | null {
  for (const child of Array.from(fieldset.children)) {
    if (child instanceof HTMLLegendElement) {
      return child;
    }
  }

  return null;
}

function isInsideDisabledFieldset(element: Element): boolean {
  // `<fieldset disabled>` disables the *listed* form controls inside it and nothing else, so an `<a href>`
  // or a `<div role="button">` in there stays operable. Walking for every element published those as
  // disabled and refused their clicks - a refusal the Partner would never have hit.
  if (!FIELDSET_DISABLEABLE_TAGS.has(element.tagName)) {
    return false;
  }

  // `closest` from the parent up, rather than a walk over every ancestor: it skips straight to each
  // enclosing fieldset, and the loop variable is typed and narrowed for free. The `for (…; …;
  // ancestor = ancestor.parentElement)` walk this replaces needed a `continue` per skipped ancestor, and
  // TypeScript analyses the update expression on the edges those create - so `ancestor` read as possibly
  // null there under `strict`, for a walk that could not actually produce one.
  let fieldset = element.parentElement?.closest('fieldset') ?? null;
  while (fieldset !== null) {
    // HTML keeps descendants of the fieldset's first `<legend>` enabled so the usual
    // "enable this section" toggle in the legend still works. Later legends are disabled.
    const legend = firstLegendChild(fieldset);
    if (fieldset.disabled && (legend === null || !legend.contains(element))) {
      return true;
    }

    fieldset = fieldset.parentElement?.closest('fieldset') ?? null;
  }

  return false;
}
