export const CONVERSATION_SCROLL_BOTTOM_THRESHOLD_PX = 100;

export function isConversationScrolledToBottom(
  scrollElement: HTMLElement,
  thresholdPx: number = CONVERSATION_SCROLL_BOTTOM_THRESHOLD_PX,
): boolean {
  const bottomOffset: number = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;

  return bottomOffset < thresholdPx;
}

export function isConversationContentFullyVisible(scrollElement: HTMLElement): boolean {
  return scrollElement.scrollHeight <= scrollElement.clientHeight;
}

export function isConversationFullyConsumed(scrollElement: HTMLElement): boolean {
  return isConversationContentFullyVisible(scrollElement) || isConversationScrolledToBottom(scrollElement);
}

export function attachConversationContentResizeScroll(scrollElement: HTMLElement): () => void {
  let stickToBottom: boolean = isConversationFullyConsumed(scrollElement);

  function onScroll(): void {
    stickToBottom = isConversationFullyConsumed(scrollElement);
  }

  scrollElement.addEventListener('scroll', onScroll, { passive: true });

  const resizeObserver = new ResizeObserver(() => {
    if (!stickToBottom) {
      return;
    }

    scrollElement.scrollTop = scrollElement.scrollHeight;
  });

  function observeChildren(): void {
    for (const child of Array.from(scrollElement.children)) {
      if (child instanceof Element) {
        resizeObserver.observe(child);
      }
    }
  }

  const mutationObserver = new MutationObserver(() => {
    observeChildren();
  });

  observeChildren();
  mutationObserver.observe(scrollElement, { childList: true });

  return () => {
    scrollElement.removeEventListener('scroll', onScroll);
    resizeObserver.disconnect();
    mutationObserver.disconnect();
  };
}
