export function getScrollContainer(element: HTMLElement): HTMLElement | null {
  const parent = element.parentElement;
  if (parent === null) {
    return null;
  }
  const { overflowY } = getComputedStyle(parent);
  return overflowY === 'auto' || overflowY === 'scroll' ? parent : getScrollContainer(parent);
}
