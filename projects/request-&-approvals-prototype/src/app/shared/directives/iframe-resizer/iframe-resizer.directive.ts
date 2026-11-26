import { AfterViewInit, DestroyRef, Directive, ElementRef, inject, input, OnDestroy } from '@angular/core';

import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { HeightCalculationMethod, IFrameComponent, iframeResizer } from 'iframe-resizer';

const MIN_INNER_SCROLL_HEIGHT = 320;

@Directive({
  selector: '[appIframeResizer]',
  standalone: false,
})
export class IFrameResizerDirective implements AfterViewInit, OnDestroy {
  readonly heightCalculationMethod = input<HeightCalculationMethod>('documentElementOffset');
  readonly #destroyRef = inject(DestroyRef);
  readonly #dualScreenStorageService = inject(DualScreenStorageService);
  readonly #elementRef = inject<ElementRef<HTMLIFrameElement>>(ElementRef);
  component: IFrameComponent | null = null;

  ngAfterViewInit(): void {
    if (this.#dualScreenStorageService.containsData()) {
      this.#fillViewport();
      return;
    }

    const components = iframeResizer(
      {
        checkOrigin: false,
        heightCalculationMethod: this.heightCalculationMethod(),
        log: false,
      },
      this.#elementRef.nativeElement,
    );
    this.component = components && components.length > 0 ? components[0] : null;
  }

  ngOnDestroy(): void {
    if (this.component !== null && this.component.iFrameResizer) {
      this.component.iFrameResizer.close();
    }
  }

  #fillViewport(): void {
    const iframe = this.#elementRef.nativeElement;
    const view = iframe.ownerDocument.defaultView;
    if (!view) {
      return;
    }

    const fit = (): void => {
      const first = iframe.ownerDocument.querySelector<HTMLIFrameElement>('iframe[appiframeresizer]') ?? iframe;
      const scroller = this.#findScrollParent(first);
      const top = scroller
        ? first.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
        : first.getBoundingClientRect().top + view.scrollY;
      const viewportHeight = scroller ? scroller.clientHeight : view.innerHeight;
      iframe.style.minHeight = '0';
      iframe.style.height = `${Math.max(MIN_INNER_SCROLL_HEIGHT, Math.floor(viewportHeight - top))}px`;
    };

    fit();
    iframe.addEventListener('load', fit);
    view.addEventListener('resize', fit);
    const layoutObserver = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(fit) : null;
    if (layoutObserver) {
      const scroller = this.#findScrollParent(iframe);
      const targets = [iframe.ownerDocument.body, iframe.parentElement, ...Array.from(scroller?.children ?? [])];
      targets.forEach(target => target && layoutObserver.observe(target));
    }
    this.#destroyRef.onDestroy(() => {
      iframe.removeEventListener('load', fit);
      view.removeEventListener('resize', fit);
      layoutObserver?.disconnect();
    });
  }

  #findScrollParent(element: HTMLElement): HTMLElement | null {
    const view = element.ownerDocument.defaultView;
    for (let parent = element.parentElement; parent && parent !== element.ownerDocument.body; parent = parent.parentElement) {
      const overflowY = view?.getComputedStyle(parent).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return parent;
      }
    }

    return null;
  }
}
