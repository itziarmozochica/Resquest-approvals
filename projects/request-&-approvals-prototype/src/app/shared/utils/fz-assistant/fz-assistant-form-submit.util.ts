/**
 * A control whose activation submits the form it belongs to - and so commits it.
 *
 * §5.8 gates "every `submit`, and any step that commits the form". The `op` alone cannot decide that:
 * `#submitViaControl` delegates to the same `#clickResolvedRef` as `#click`, so both ops end in the
 * same `element.click()`, and the agent picks which one to send. Without this, `{ op: 'click' }` on a
 * Save button is the identical commit with the core gate skipped.
 *
 * `element.type` rather than the attribute: HTML's missing-value **and** invalid-value default for
 * `<button type>` is the Submit Button state, so a bare `<button>` in a form submits it and reading the
 * attribute would miss the commonest case of all. `element.form` rather than an ancestor walk: it
 * resolves the enclosing `<form>` *and* the `form="<id>"` association, and a submit button owned by no
 * form submits nothing.
 *
 * `<input type="image">` counts - HTML classes it as a submit button.
 */
export function isFzAssistantFormSubmitControl(element: Element): boolean {
  if (element instanceof HTMLButtonElement) {
    return element.type === 'submit' && element.form !== null;
  }

  if (element instanceof HTMLInputElement) {
    return (element.type === 'submit' || element.type === 'image') && element.form !== null;
  }

  return false;
}
