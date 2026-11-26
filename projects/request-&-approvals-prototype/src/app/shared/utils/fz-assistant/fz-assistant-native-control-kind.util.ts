/**
 * What kind of native control this is, in one place.
 *
 * Discover and Act both classify the same DOM by input type - Discover to pick the wire `type`, Act to
 * pick a writer and to decide which constraints apply - and they used to do it from separate lists of
 * their own. Nothing kept the two in step: adding a type to a writer left Discover mapping it to `text`,
 * and adding one to Discover's date branch left it unwritable, with no test either way.
 *
 * The kinds are deliberately finer than the wire vocabulary. `password` is separate from `text` because
 * no constraint on a secret is ever read, and `file` is separate because nothing can write one - script
 * cannot set a file input's value at all.
 */
export type FzAssistantNativeControlKind =
  | 'button'
  | 'checkbox'
  | 'color'
  | 'date'
  | 'file'
  | 'numeric'
  | 'password'
  | 'radio'
  | 'range'
  | 'select'
  | 'text'
  | 'time';

/**
 * Unknown and invalid `type` attributes reflect as `text` through the IDL getter, so this map needs no
 * fallback: anything absent from it is a type with no operable kind, such as `hidden`.
 */
const KIND_BY_INPUT_TYPE = new Map<string, FzAssistantNativeControlKind>([
  ['button', 'button'],
  ['checkbox', 'checkbox'],
  ['color', 'color'],
  ['date', 'date'],
  ['datetime-local', 'date'],
  ['email', 'text'],
  ['file', 'file'],
  ['image', 'button'],
  ['month', 'date'],
  ['number', 'numeric'],
  ['password', 'password'],
  ['radio', 'radio'],
  ['range', 'range'],
  ['reset', 'button'],
  ['search', 'text'],
  ['submit', 'button'],
  ['tel', 'text'],
  ['text', 'text'],
  ['time', 'time'],
  ['url', 'text'],
  ['week', 'date'],
]);

/** `undefined` means "no operable native kind" - a `hidden` input, or an element that is not a control. */
export function readFzAssistantNativeControlKind(element: Element): FzAssistantNativeControlKind | undefined {
  if (element instanceof HTMLTextAreaElement) {
    return 'text';
  }

  if (element instanceof HTMLSelectElement) {
    return 'select';
  }

  if (element instanceof HTMLButtonElement) {
    return 'button';
  }

  if (!(element instanceof HTMLInputElement)) {
    return undefined;
  }

  return KIND_BY_INPUT_TYPE.get(element.type.toLowerCase());
}

/**
 * The kinds whose value is a moment rather than a number or a string, so `min` / `max` are compared by
 * the browser's date arithmetic. `time` is its own kind only because the wire vocabulary separates it
 * from `date`; every constraint rule treats the two alike.
 */
export function isFzAssistantTemporalKind(kind: FzAssistantNativeControlKind | undefined): boolean {
  return kind === 'date' || kind === 'time';
}

/**
 * The kinds whose value is a number on a `min` / `max` / `step` grid.
 *
 * `range` is a kind of its own rather than a `numeric` because HTML treats it differently in two ways the
 * agent can see: `readonly` does nothing to a slider, and assigning `''` does not empty one - the browser
 * puts the thumb back. Everything about the grid is shared, so both kinds answer here.
 */
export function isFzAssistantNumericKind(kind: FzAssistantNativeControlKind | undefined): boolean {
  return kind === 'numeric' || kind === 'range';
}

/**
 * The kinds the native scalar write path can set: one value, committed by assignment, with the browser
 * free to sanitize it. Not `password` (Act refuses secrets outright), not `file` (unsettable by script),
 * not `checkbox` / `radio` / `select`, which have writers of their own.
 */
export function isFzAssistantScalarKind(kind: FzAssistantNativeControlKind | undefined): boolean {
  return kind === 'color' || kind === 'text' || isFzAssistantNumericKind(kind) || isFzAssistantTemporalKind(kind);
}
