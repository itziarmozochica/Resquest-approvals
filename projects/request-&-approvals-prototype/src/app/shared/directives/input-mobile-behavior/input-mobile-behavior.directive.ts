import { Directive, ElementRef, HostListener } from '@angular/core';

import { DualScreenStorageService } from '../../services/dual-screen/dual-screen-storage.service';

@Directive({
  selector: '[appInputMobileBehavior]',
  standalone: false,
})
export class InputMobileBehaviorDirective {
  isDualScreen: boolean;

  constructor(
    private element: ElementRef,
    private dualScreenStorageService: DualScreenStorageService,
  ) {
    this.isDualScreen = this.dualScreenStorageService.containsData();
  }

  @HostListener('focus')
  onFocus(): void {
    if (!this.isDualScreen) {
      return;
    }
    setTimeout(() => {
      this.element.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });

      const scrollContainer = document.scrollingElement || document.documentElement;
      const elementRect = this.element.nativeElement.getBoundingClientRect();
      const offset = elementRect.top + scrollContainer.scrollTop - 200;

      scrollContainer.scrollTo({
        top: offset,
        behavior: 'smooth',
      });
    }, 300);
  }

  @HostListener('keydown.enter')
  onEnter(): void {
    if (!this.isDualScreen) {
      return;
    }
    this.element.nativeElement.blur();
  }
}
