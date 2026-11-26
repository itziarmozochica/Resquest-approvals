const scrollableOverflow = /^(auto|scroll|overlay)$/;
const textInputTypes: ReadonlySet<string> = new Set(['email', 'number', 'password', 'search', 'tel', 'text', 'url']);

/** A field the on-screen keyboard opens for: a textarea, an editable element, or an input typed into as text. */
export function isTextField(element: Element): boolean {
  if (element instanceof HTMLTextAreaElement || (element instanceof HTMLElement && element.isContentEditable)) {
    return true;
  }

  return element instanceof HTMLInputElement && textInputTypes.has(element.type);
}

/** Whether the element scrolls its content up and down, and has content to scroll. */
export function isScrollableY(element: Element, view: Window | null): boolean {
  const overflowY = view?.getComputedStyle(element).overflowY ?? '';

  return scrollableOverflow.test(overflowY) && element.scrollHeight > element.clientHeight;
}
