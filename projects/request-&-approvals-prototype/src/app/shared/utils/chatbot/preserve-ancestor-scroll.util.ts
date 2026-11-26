interface AncestorScrollOffset {
  element: Element;
  left: number;
  top: number;
}

/**
 * Capture the scroll offsets of every scrollable ancestor of `element`, returning a
 * function that restores them.
 *
 * Measuring an iframe's intrinsic content height means collapsing it and forcing a
 * synchronous reflow. While it is collapsed the browser clamps the scroll offset of
 * every scrollable ancestor to the shrunken content, and putting the height back does
 * **not** put those offsets back. Wrapping such a measurement in capture/restore keeps
 * the reader's place.
 *
 * The walk runs over `parentElement`, so it reaches `<html>` and therefore covers a
 * page-level scroll as well as any nested scroll container.
 */
export function captureAncestorScroll(element: Element): () => void {
  const offsets: AncestorScrollOffset[] = [];

  for (let node: Element | null = element.parentElement; node !== null; node = node.parentElement) {
    if (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth) {
      offsets.push({ element: node, left: node.scrollLeft, top: node.scrollTop });
    }
  }

  return () => {
    for (const offset of offsets) {
      offset.element.scrollTop = offset.top;
      offset.element.scrollLeft = offset.left;
    }
  };
}
