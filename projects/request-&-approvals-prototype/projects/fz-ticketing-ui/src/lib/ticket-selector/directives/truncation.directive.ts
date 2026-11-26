import { afterNextRender, DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';

@Directive({
  exportAs: 'fztTruncation',
  selector: '[fztTruncation]',
})
export class FztTruncationDirective {
  readonly #destroyRef = inject(DestroyRef);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #isTruncated = signal(false);
  #resizeObserver: ResizeObserver | null = null;

  readonly isTruncated = this.#isTruncated.asReadonly();

  constructor() {
    afterNextRender({
      read: () => {
        this.#measure();
        this.#resizeObserver = new ResizeObserver(() => {
          this.#measure();
        });
        this.#resizeObserver.observe(this.#host.nativeElement);
      },
    });

    this.#destroyRef.onDestroy(() => {
      this.#resizeObserver?.disconnect();
    });
  }

  #measure(): void {
    const element = this.#host.nativeElement;

    this.#isTruncated.set(element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight);
  }
}
