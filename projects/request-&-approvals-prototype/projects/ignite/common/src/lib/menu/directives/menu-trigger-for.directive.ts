import { CdkMenuTrigger } from '@angular/cdk/menu';
import { Directive, inject } from '@angular/core';

@Directive({
  hostDirectives: [
    {
      directive: CdkMenuTrigger,
      inputs: ['cdkMenuTriggerFor: igntMenuTriggerFor'],
    },
  ],
  selector: '[igntMenuTriggerFor]',
  standalone: true,
})
export class IgntMenuTriggerForDirective {
  readonly #cdkMenuTrigger = inject(CdkMenuTrigger);

  constructor() {
    this.#cdkMenuTrigger.menuPosition = [
      {
        originX: 'end',
        originY: 'bottom',
        overlayX: 'end',
        overlayY: 'top',
      },
      {
        originX: 'end',
        originY: 'top',
        overlayX: 'end',
        overlayY: 'bottom',
      },
    ];
  }
}
