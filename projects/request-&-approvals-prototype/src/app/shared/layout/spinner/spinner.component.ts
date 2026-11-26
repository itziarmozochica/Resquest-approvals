import { afterRenderEffect, ChangeDetectionStrategy, Component, ElementRef, inject, untracked, viewChild } from '@angular/core';

import { SpinnerService } from './spinner.service';

declare global {
  interface Window {
    // Drawn by src/assets/js/fever-logo-loader.js, which index.html loads.
    startFeverLogoLoader?: (canvas: HTMLCanvasElement, elapsedMs: number) => void;
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-spinner',
  standalone: false,
  styleUrls: ['./spinner.component.scss'],
  templateUrl: './spinner.component.html',
})
export class SpinnerComponent {
  readonly #spinnerService = inject(SpinnerService);
  isLoading$ = this.#spinnerService.isLoading$;

  protected readonly logo = viewChild<ElementRef<HTMLCanvasElement>>('logo');

  constructor() {
    afterRenderEffect(() => {
      const canvas: HTMLCanvasElement | undefined = this.logo()?.nativeElement;
      if (canvas !== undefined) {
        window.startFeverLogoLoader?.(
          canvas,
          untracked(() => -this.#spinnerService.animationOffsetMs()),
        );
      }
    });
  }
}
