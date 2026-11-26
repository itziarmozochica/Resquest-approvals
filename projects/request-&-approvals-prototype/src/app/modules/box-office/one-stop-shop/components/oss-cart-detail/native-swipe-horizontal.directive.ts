import { AfterViewInit, Directive, ElementRef, EventEmitter, inject, Input, NgZone, OnDestroy, OnInit, Output } from '@angular/core';

interface EventListenerOptions {
  capture?: boolean;
  once?: boolean;
  passive?: boolean;
}

interface PointerEventListener {
  fn: EventListenerOrEventListenerObject;
  opts?: EventListenerOptions;
  type: string;
}

@Directive({
  selector: '[appNativeSwipeHorizontal]',
  standalone: true,
})
export class NativeSwipeHorizontalDirective implements AfterViewInit, OnDestroy, OnInit {
  #animateDeleteTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #animateToPositionTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #currentX = 0;
  #currentXPercent = 0;
  #deleteThresholdPercent = -36; // percentage to trigger delete (X% of element width)
  #el!: HTMLElement;
  readonly #elementRef = inject(ElementRef);
  readonly #ngZone = inject(NgZone);
  #elementWidth = 0;
  #isDeleting = false;
  #isDragging = false;
  #isHorizontal = false;
  #isPointerDown = false; // tracks if pointer is actively pressed
  #isVertical = false;
  #listeners: PointerEventListener[] = [];
  #maxSwipeDistancePercent = -50; // maximum swipe distance (X% of element width)
  #openThresholdPercent = -20; // percentage to open swipe actions (X% of element width)
  #pointerType = 'touch'; // track the type of pointer for adaptive behavior
  #startTime = 0;
  #startX = 0;
  #startY = 0;
  #swipeContainer: HTMLElement | null = null;
  #swipeDisabled = false;
  #threshold = 5; // pixels threshold to determine direction (keep this in pixels for touch sensitivity)

  /** Disabling the swipe also closes a row left open, so nothing stays shifted next to the hidden actions. */
  @Input() set swipeDisabled(swipeDisabled: boolean) {
    this.#swipeDisabled = swipeDisabled;
    if (swipeDisabled && this.#el?.style.transform) {
      this.#isPointerDown = false;
      this.#animateToPosition(0);
    }
  }
  get swipeDisabled(): boolean {
    return this.#swipeDisabled;
  }

  @Output() swipeClose = new EventEmitter<void>();
  @Output() swipeDelete = new EventEmitter<void>();
  @Output() swipeOpen = new EventEmitter<void>();

  ngAfterViewInit(): void {
    this.#addListener('pointerdown', this.#onPointerDown.bind(this) as EventListener, { passive: true });
    this.#addListener('pointermove', this.#onPointerMove.bind(this) as EventListener, { passive: false });
    this.#addListener('pointerup', this.#onPointerUp.bind(this) as EventListener, { passive: true });
    this.#addListener('pointercancel', this.#onPointerCancel.bind(this) as EventListener, { passive: true });
  }

  ngOnDestroy(): void {
    this.#clearPendingTimeouts();
    this.#cancelHostAndSubtreeAnimations();
    this.#clearInlineTransformStyles();

    for (const l of this.#listeners) {
      this.#el.removeEventListener(l.type, l.fn as EventListener, l.opts);
    }
  }

  ngOnInit(): void {
    this.#el = this.#elementRef.nativeElement as HTMLElement;
    this.#swipeContainer = this.#el.closest('.swipe-container') as HTMLElement;
  }

  #addListener(type: string, fn: EventListener, opts?: EventListenerOptions): void {
    this.#ngZone.runOutsideAngular(() => this.#el.addEventListener(type, fn, opts));
    this.#listeners.push({ type, fn, opts });
  }

  #animateDelete() {
    if (this.#swipeContainer) {
      this.#swipeContainer.style.transition = 'transform 0.4s ease';
      this.#swipeContainer.style.transform = 'translateX(-100%)';
    } else {
      this.#el.style.transition = 'transform 0.4s ease';
      this.#el.style.transform = 'translateX(-100%)';
    }

    this.#clearAnimateDeleteTimeout();
    this.#animateDeleteTimeoutId = setTimeout(() => {
      this.#animateDeleteTimeoutId = null;
      if (this.#swipeContainer) {
        this.#swipeContainer.style.transition = '';
      } else {
        this.#el.style.transition = '';
      }
      this.#ngZone.run(() => this.swipeDelete.emit());
    }, 300);
  }

  #animateToPosition(targetX: number) {
    this.#el.style.transition = 'transform 0.3s ease';
    this.#el.style.transform = `translateX(${targetX}px)`;

    this.#clearAnimateToPositionTimeout();
    this.#animateToPositionTimeoutId = setTimeout(() => {
      this.#animateToPositionTimeoutId = null;
      this.#el.style.transition = '';
    }, 300);
  }

  #cancelElementAnimations(element: HTMLElement): void {
    if (typeof element.getAnimations !== 'function') {
      return;
    }

    for (const animation of element.getAnimations({ subtree: true })) {
      animation.cancel();
    }
  }

  #cancelHostAndSubtreeAnimations(): void {
    this.#cancelElementAnimations(this.#swipeContainer ?? this.#el);
  }

  #clearAnimateDeleteTimeout(): void {
    if (this.#animateDeleteTimeoutId != null) {
      clearTimeout(this.#animateDeleteTimeoutId);
      this.#animateDeleteTimeoutId = null;
    }
  }

  #clearAnimateToPositionTimeout(): void {
    if (this.#animateToPositionTimeoutId != null) {
      clearTimeout(this.#animateToPositionTimeoutId);
      this.#animateToPositionTimeoutId = null;
    }
  }

  #clearInlineTransformStyles(): void {
    this.#el.style.transition = '';
    this.#el.style.transform = '';
    if (this.#swipeContainer) {
      this.#swipeContainer.style.transition = '';
      this.#swipeContainer.style.transform = '';
    }
  }

  #clearPendingTimeouts(): void {
    this.#clearAnimateDeleteTimeout();
    this.#clearAnimateToPositionTimeout();
  }

  #onPointerCancel(): void {
    if (this.#isHorizontal && !this.#isDeleting) {
      this.#animateToPosition(0);
    }

    this.#isDragging = false;
    this.#isHorizontal = false;
    this.#isPointerDown = false; // Reset pointer state
    this.#isVertical = false;
    this.#currentX = 0;
    this.#currentXPercent = 0;
  }

  #onPointerDown(ev: PointerEvent): void {
    if (this.swipeDisabled) {
      return;
    }
    this.#startX = ev.clientX;
    this.#startY = ev.clientY;
    this.#startTime = Date.now();
    this.#currentX = 0;
    this.#currentXPercent = 0;
    this.#isDragging = false;
    this.#isHorizontal = false;
    this.#isPointerDown = true; // Mark pointer as actively pressed
    this.#isVertical = false;
    this.#isDeleting = false;
    this.#pointerType = ev.pointerType || 'touch'; // Capture pointer type

    // Update element width in case it has changed
    this.#updateElementWidth();
  }

  #onPointerMove(ev: PointerEvent): void {
    // Only process move events if pointer is actively pressed
    if (!this.#isPointerDown) {
      return;
    }

    const deltaX = ev.clientX - this.#startX;
    const deltaY = ev.clientY - this.#startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (!this.#isDragging && !this.#isHorizontal && !this.#isVertical) {
      // Adaptive threshold based on pointer type
      const adaptiveThreshold = this.#pointerType === 'mouse' ? 2 : this.#threshold; // More sensitive for mouse

      // For mouse/pen, be even more aggressive with horizontal detection
      const isHorizontalMovement = absDeltaX >= 1 && absDeltaX > absDeltaY && this.#pointerType === 'mouse';
      if (absDeltaX > adaptiveThreshold || absDeltaY > adaptiveThreshold || isHorizontalMovement) {
        this.#isDragging = true;

        if (absDeltaY > absDeltaX && !isHorizontalMovement) {
          this.#isVertical = true;
          return;
        } else {
          this.#isHorizontal = true;
          ev.preventDefault();
        }
      } else {
        return;
      }
    }

    if (this.#isHorizontal) {
      ev.preventDefault();

      // Convert to percentage-based calculations
      const maxSwipePixels = this.#percentToPixels(this.#maxSwipeDistancePercent);
      const limitedDeltaX = Math.max(maxSwipePixels, Math.min(0, deltaX));
      const limitedDeltaXPercent = this.#pixelsToPercent(limitedDeltaX);

      const deleteThresholdPixels = this.#percentToPixels(this.#deleteThresholdPercent);

      if (limitedDeltaX <= deleteThresholdPixels && !this.#isDeleting) {
        const elapsedTime = Date.now() - this.#startTime;
        const swipeVelocityPercent = Math.abs(limitedDeltaXPercent) / elapsedTime;
        const isFastSwipe = swipeVelocityPercent > 0.15; // adjusted for percentage velocity
        const fastSwipeThresholdPixels = this.#percentToPixels(-18); // 18% for fast swipe

        // Trigger delete on slow swipe that reaches threshold OR fast swipe with less distance
        if (elapsedTime > 500 || (isFastSwipe && limitedDeltaX <= fastSwipeThresholdPixels)) {
          this.#isDeleting = true;
          this.#animateDelete();
          return;
        }
        const openThresholdPixels = this.#percentToPixels(this.#openThresholdPercent);
        const limitedToOpen = Math.max(openThresholdPixels, limitedDeltaX);
        this.#el.style.transform = `translateX(${limitedToOpen}px)`;
        this.#currentX = limitedToOpen;
        this.#currentXPercent = this.#pixelsToPercent(limitedToOpen);
        return;
      }

      if (!this.#isDeleting) {
        this.#el.style.transform = `translateX(${limitedDeltaX}px)`;
        this.#currentX = limitedDeltaX;
        this.#currentXPercent = limitedDeltaXPercent;
      }
    }
  }

  #onPointerUp(): void {
    if (this.#isHorizontal && !this.#isDeleting) {
      const elapsedTime = Date.now() - this.#startTime;
      const swipeVelocityPercent = Math.abs(this.#currentXPercent) / elapsedTime; // percentage per millisecond
      const isFastSwipe = swipeVelocityPercent > 0.15; // adjusted for percentage velocity
      const isSlowSwipe = elapsedTime > 600; // more time for deliberate slow swipe

      // Enhanced delete detection: fast swipes need less distance, slow swipes need more
      const dynamicDeleteThresholdPercent = isFastSwipe ? -18 : this.#deleteThresholdPercent; // 18% vs 25%
      const dynamicDeleteThresholdPixels = this.#percentToPixels(dynamicDeleteThresholdPercent);

      if (this.#currentX <= dynamicDeleteThresholdPixels) {
        if (isFastSwipe || isSlowSwipe) {
          this.#animateDelete();
        } else {
          this.#animateToPosition(0);
          this.#ngZone.run(() => this.swipeClose.emit());
        }
      } else {
        const openThresholdPixels = this.#percentToPixels(this.#openThresholdPercent);
        if (this.#currentX <= openThresholdPixels) {
          this.#animateToPosition(openThresholdPixels);
          this.#ngZone.run(() => this.swipeOpen.emit());
        } else {
          this.#animateToPosition(0);
          this.#ngZone.run(() => this.swipeClose.emit());
        }
      }
    }

    this.#isDragging = false;
    this.#isHorizontal = false;
    this.#isPointerDown = false; // Reset pointer state
    this.#isVertical = false;
    this.#currentX = 0;
    this.#currentXPercent = 0;
  }

  #percentToPixels(percent: number): number {
    return (percent / 100) * this.#elementWidth;
  }

  #pixelsToPercent(pixels: number): number {
    return this.#elementWidth > 0 ? (pixels / this.#elementWidth) * 100 : 0;
  }

  #updateElementWidth(): void {
    this.#elementWidth = this.#el.getBoundingClientRect().width;
  }
}
