import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';

import { IgntTourService } from './ignt-tour.service';

@Directive({
  selector: '[igntTourAnchor]',
  standalone: true,
})
export class IgntTourAnchorDirective implements OnInit, OnDestroy {
  @Input('igntTourAnchor') anchorId!: string;

  constructor(
    private el: ElementRef,
    private tour: IgntTourService,
  ) {}

  ngOnDestroy() {
    if (this.anchorId !== undefined && this.anchorId !== null) {
      this.tour.unregisterAnchor(this.anchorId);
    }
  }

  ngOnInit() {
    if (this.anchorId !== undefined && this.anchorId !== null) {
      this.tour.registerAnchor(this.anchorId, this.el);
    }
  }
}
