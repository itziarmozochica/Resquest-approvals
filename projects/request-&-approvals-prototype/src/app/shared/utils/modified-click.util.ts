/** A click the browser handles itself: another button, or a modifier that opens the link in a new tab or window. */
export function isModifiedClick(event: MouseEvent): boolean {
  return event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}
