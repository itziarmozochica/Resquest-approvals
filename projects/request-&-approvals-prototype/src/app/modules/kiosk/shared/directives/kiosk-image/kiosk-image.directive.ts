import { AfterViewInit, DestroyRef, Directive, effect, ElementRef, inject, input, untracked } from '@angular/core';

import { KioskImageBox } from '../../../models/kiosk-image.model';
import { KioskImageService } from '../../services/kiosk-image.service';

@Directive({
  selector: 'img[appKioskImage]',
})
export class KioskImageDirective implements AfterViewInit {
  readonly appKioskImage = input.required<string | null | undefined>();
  readonly appKioskImageScale = input(1);

  readonly #destroyRef = inject(DestroyRef);
  readonly #element = inject<ElementRef<HTMLImageElement>>(ElementRef);
  readonly #kioskImageService = inject(KioskImageService);
  #cssBox: KioskImageBox | null = null;
  #isMeasured = false;

  constructor() {
    effect(() => {
      this.appKioskImage();
      this.appKioskImageScale();
      untracked(() => this.#applySrc());
    });
  }

  ngAfterViewInit(): void {
    this.#measure();
  }

  #applySrc(): void {
    if (!this.#isMeasured) {
      return;
    }
    const url = this.appKioskImage() ?? '';
    const src =
      url === '' || this.#cssBox === null
        ? url
        : this.#kioskImageService.fit(url, this.#cssBox.widthPx, this.#cssBox.heightPx, this.appKioskImageScale());
    const image = this.#element.nativeElement;
    if (image.getAttribute('src') === src) {
      return;
    }
    if (src === '') {
      image.removeAttribute('src');
      return;
    }
    image.setAttribute('src', src);
  }

  #measure(): void {
    const image = this.#element.nativeElement;
    this.#setBox(image.getBoundingClientRect());
    this.#isMeasured = true;
    this.#applySrc();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const rect = entries[0]?.contentRect;
      if (rect === undefined || !this.#setBox(rect)) {
        return;
      }
      this.#applySrc();
    });
    resizeObserver.observe(image);
    this.#destroyRef.onDestroy(() => resizeObserver.disconnect());
  }

  #setBox(rect: Pick<DOMRectReadOnly, 'height' | 'width'>): boolean {
    const cssBox = rect.width > 0 && rect.height > 0 ? { heightPx: rect.height, widthPx: rect.width } : null;
    if (cssBox?.widthPx === this.#cssBox?.widthPx && cssBox?.heightPx === this.#cssBox?.heightPx) {
      return false;
    }
    this.#cssBox = cssBox;
    return true;
  }
}
