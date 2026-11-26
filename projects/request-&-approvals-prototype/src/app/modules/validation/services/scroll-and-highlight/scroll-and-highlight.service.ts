import { ElementRef, Injectable, QueryList } from '@angular/core';

type BlockValues = 'start' | 'center' | 'end';

@Injectable({
  providedIn: 'root',
})
export class ScrollAndHighlightService {
  constructor() {}

  scrollAndHighlight(
    refs: QueryList<ElementRef<unknown>> | readonly ElementRef<unknown>[],
    attrName: string,
    value: string,
    className: string,
    block: BlockValues = 'center',
  ): void {
    const target = refs
      .map(ref => ref.nativeElement as HTMLElement)
      .find(ref => {
        return ref.getAttribute(attrName) === value;
      });
    if (target) {
      this.scrollTo(target, block);
      this.playAnimation(target, className);
    }
  }

  private playAnimation(element: HTMLElement, className: string) {
    element.classList.remove(className);
    element.focus(); // Necessary to trigger reflow
    element.classList.add(className);
  }

  private scrollTo(element: HTMLElement, block: BlockValues) {
    // Necessary to center the elememt AFTER expanding the element
    setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block });
    });
  }
}
