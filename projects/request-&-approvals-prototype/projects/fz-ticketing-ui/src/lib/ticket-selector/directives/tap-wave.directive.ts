import { computed, DestroyRef, Directive, effect, ElementRef, inject, input, linkedSignal } from '@angular/core';

import { FZT_IDLE_TAP_WAVE, type FztTapWaveState } from '../models/tap-wave.model';

@Directive({
  exportAs: 'fztTapWave',
  host: {
    '(click)': 'play($event)',
    '[style.--ripple-x]': 'wave().left',
    '[style.--ripple-y]': 'wave().top',
  },
  selector: '[fztTapWave]',
})
export class FztTapWaveDirective {
  static readonly durationMs = 400;

  readonly #destroyRef = inject(DestroyRef);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  #animationFrameId: number | null = null;
  #previousRenderKey: string | null = null;
  #renderTime = performance.now();
  #timeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly renderKey = input.required<string>({ alias: 'fztTapWave' });
  readonly fztTapWaveClickIndicator = input(false);

  protected readonly wave = linkedSignal<string, FztTapWaveState>({
    computation: () => FZT_IDLE_TAP_WAVE,
    source: () => this.renderKey(),
  });

  readonly isActive = computed<boolean>(() => this.wave().isActive && !this.wave().isClickIndicator);
  readonly isClickIndicatorActive = computed<boolean>(() => this.wave().isActive && this.wave().isClickIndicator);

  constructor() {
    effect(() => {
      const renderKey = this.renderKey();

      if (renderKey === this.#previousRenderKey) {
        return;
      }

      this.#renderTime = performance.now();
      this.#previousRenderKey = renderKey;
      this.#cancelPending();
    });

    this.#destroyRef.onDestroy(() => {
      this.#cancelPending();
    });
  }

  protected play(event: MouseEvent): void {
    // A click stamped before the last content change is a ghost click on content that just
    // re-rendered under the pointer. See AGENTS.md, "Tile, dots and breadcrumbs".
    if (event.timeStamp < this.#renderTime) {
      return;
    }

    this.#cancelPending();

    const rect = this.#host.nativeElement.getBoundingClientRect();
    const left = `${event.clientX - rect.left}px`;
    const top = `${event.clientY - rect.top}px`;
    const isClickIndicator = this.fztTapWaveClickIndicator();

    this.wave.set({ isActive: false, isClickIndicator: false, left, top });

    this.#animationFrameId = requestAnimationFrame(() => {
      this.#animationFrameId = null;
      this.wave.set({ isActive: true, isClickIndicator, left, top });

      this.#timeoutId = setTimeout(() => {
        this.wave.update(wave => ({ ...wave, isActive: false, isClickIndicator: false }));
        this.#timeoutId = null;
      }, FztTapWaveDirective.durationMs);
    });
  }

  #cancelPending(): void {
    if (this.#animationFrameId !== null) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }

    if (this.#timeoutId !== null) {
      clearTimeout(this.#timeoutId);
      this.#timeoutId = null;
    }
  }
}
