import { DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

import { IgntTooltipDirective } from '@ignite/common';

export const FZT_TOOLTIP_GESTURES = {
  doubleTapWindowMs: 300,
  hideDelayMs: 2000,
  longPressDelayMs: 500,
  pressSlopPx: 10,
} as const;

export type FztTooltipGesturesMode = 'control' | 'label';

interface FztPress {
  readonly clientX: number;
  readonly clientY: number;
  readonly startedAt: number;
}

@Directive({
  host: {
    '(contextmenu)': 'onContextMenu($event)',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'close()',
    '(keydown.escape)': 'close()',
    '(pointercancel)': 'onPointerCancel()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(pointerup)': 'onPointerUp($event)',
  },
  selector: '[fztTooltipGestures]',
})
export class FztTooltipGesturesDirective {
  readonly #destroyRef = inject(DestroyRef);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #tooltip = inject(IgntTooltipDirective, { self: true });

  #hideTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #lastTapAt: number | null = null;
  #longPressed = false;
  #longPressTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #press: FztPress | null = null;

  readonly mode = input<FztTooltipGesturesMode, FztTooltipGesturesMode | ''>('control', {
    alias: 'fztTooltipGestures',
    transform: (value: FztTooltipGesturesMode | '') => (value === '' ? 'control' : value),
  });

  readonly #dismiss = (): void => {
    this.close();
  };

  readonly #swallowClickAfterLongPress = (event: MouseEvent): void => {
    if (this.#longPressed && event.detail > 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  readonly #trackPressMove = (event: PointerEvent): void => {
    if (this.#press === null || !event.isPrimary) {
      return;
    }

    if (Math.hypot(event.clientX - this.#press.clientX, event.clientY - this.#press.clientY) > FZT_TOOLTIP_GESTURES.pressSlopPx) {
      this.#cancelPress();
    }
  };

  constructor() {
    const host = this.#host.nativeElement;

    host.addEventListener('click', this.#swallowClickAfterLongPress, { capture: true });

    this.#destroyRef.onDestroy(() => {
      host.removeEventListener('click', this.#swallowClickAfterLongPress, { capture: true });
      this.#cancelHide();
      this.#cancelPress();
      this.#stopDismissListener();
    });
  }

  protected close(): void {
    this.#cancelHide();
    this.#stopDismissListener();
    this.#tooltip.close();
  }

  protected onContextMenu(event: MouseEvent): void {
    if (this.#press !== null) {
      this.#completeLongPress();
    }

    if (this.#longPressed) {
      event.preventDefault();
    }
  }

  protected onFocusIn(): void {
    if (this.#host.nativeElement.matches(':focus-visible')) {
      this.#openFromPointerOrFocus();
    }
  }

  protected onPointerCancel(): void {
    this.#cancelPress();

    if (this.#longPressed) {
      this.#scheduleHide();
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    this.#cancelPress();
    this.#longPressed = false;

    if (event.pointerType === 'mouse' || !event.isPrimary) {
      return;
    }

    capturePointer(this.#host.nativeElement, event.pointerId);
    this.#press = { clientX: event.clientX, clientY: event.clientY, startedAt: performance.now() };
    this.#host.nativeElement.addEventListener('pointermove', this.#trackPressMove);
    this.#longPressTimeoutId = setTimeout(() => {
      this.#completeLongPress();
    }, FZT_TOOLTIP_GESTURES.longPressDelayMs);
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      this.#openFromPointerOrFocus();
    }
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      this.close();
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!event.isPrimary) {
      return;
    }

    if (this.#longPressed) {
      this.#scheduleHide();

      return;
    }

    const press = this.#press;

    if (press === null) {
      return;
    }

    this.#cancelPress();

    const isDoubleTap = this.#lastTapAt !== null && press.startedAt - this.#lastTapAt <= FZT_TOOLTIP_GESTURES.doubleTapWindowMs;

    this.#lastTapAt = isDoubleTap ? null : performance.now();

    if (isDoubleTap || this.mode() === 'label') {
      this.#show();
      this.#scheduleHide();
    }
  }

  #cancelHide(): void {
    if (this.#hideTimeoutId !== null) {
      clearTimeout(this.#hideTimeoutId);
      this.#hideTimeoutId = null;
    }
  }

  #cancelPress(): void {
    if (this.#longPressTimeoutId !== null) {
      clearTimeout(this.#longPressTimeoutId);
      this.#longPressTimeoutId = null;
    }

    this.#host.nativeElement.removeEventListener('pointermove', this.#trackPressMove);
    this.#press = null;
  }

  #completeLongPress(): void {
    this.#cancelPress();
    this.#lastTapAt = null;
    this.#longPressed = true;
    this.#show();
  }

  #openFromPointerOrFocus(): void {
    this.#tooltip.open();

    if (this.mode() === 'label') {
      this.#scheduleHide();
    }
  }

  #scheduleHide(): void {
    this.#cancelHide();
    this.#hideTimeoutId = setTimeout(() => {
      this.close();
    }, FZT_TOOLTIP_GESTURES.hideDelayMs);
  }

  #show(): void {
    this.#cancelHide();
    this.#tooltip.open();
    this.#host.nativeElement.ownerDocument.addEventListener('pointerdown', this.#dismiss, { capture: true });
  }

  #stopDismissListener(): void {
    this.#host.nativeElement.ownerDocument.removeEventListener('pointerdown', this.#dismiss, { capture: true });
  }
}

function capturePointer(target: HTMLElement, pointerId: number): void {
  const capturable = target as { setPointerCapture?: (id: number) => void }; // widening to optional: jsdom lacks setPointerCapture

  capturable.setPointerCapture?.(pointerId);
}
