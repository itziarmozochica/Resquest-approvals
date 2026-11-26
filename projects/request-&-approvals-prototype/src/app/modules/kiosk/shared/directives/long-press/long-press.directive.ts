import { DestroyRef, Directive, inject, input, output } from '@angular/core';

@Directive({
  // Listen to pointer, touch and mouse events: some Android WebViews don't emit
  // PointerEvents, so touch/mouse act as a fallback. Re-arming on start is
  // idempotent, so double-firing across event families is harmless.
  host: {
    '(mousedown)': 'onPressStart()',
    '(mouseleave)': 'onPressEnd()',
    '(mouseup)': 'onPressEnd()',
    '(pointercancel)': 'onPressEnd()',
    '(pointerdown)': 'onPressStart()',
    '(pointerleave)': 'onPressEnd()',
    '(pointerup)': 'onPressEnd()',
    '(touchcancel)': 'onPressEnd()',
    '(touchend)': 'onPressEnd()',
    '(touchstart)': 'onPressStart()',
  },
  selector: '[appLongPress]',
  standalone: true,
})
export class LongPressDirective {
  // Time the pointer must stay pressed on the host before `longPress` fires.
  readonly longPressDelayMs = input(2000);
  readonly longPress = output<void>();

  readonly #destroyRef = inject(DestroyRef);
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.#destroyRef.onDestroy(() => this.#clearTimer());
  }

  onPressEnd(): void {
    this.#clearTimer();
  }

  onPressStart(): void {
    this.#clearTimer();
    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.longPress.emit();
    }, this.longPressDelayMs());
  }

  #clearTimer(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }
}
