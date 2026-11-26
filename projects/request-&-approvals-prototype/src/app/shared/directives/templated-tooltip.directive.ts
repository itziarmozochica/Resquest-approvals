import { ConnectedPosition, Overlay, OverlayPositionBuilder, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Directive, ElementRef, HostListener, inject, input, Input, OnDestroy, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[appTemplatedTooltip]',
  standalone: true,
})
export class TemplatedTooltipDirective implements OnDestroy {
  readonly #defaultPosition: ConnectedPosition = {
    offsetY: -8,
    originX: 'center',
    originY: 'top',
    overlayX: 'center',
    overlayY: 'bottom',
  };

  #elementRef = inject(ElementRef);
  #overlay = inject(Overlay);
  #overlayPositionBuilder = inject(OverlayPositionBuilder);
  #overlayRef?: OverlayRef;
  #viewContainerRef = inject(ViewContainerRef);

  @Input() appTemplatedTooltipContext?: Record<string, unknown>;
  @Input() position: Partial<ConnectedPosition> = {};
  @Input('appTemplatedTooltip') templateRef!: TemplateRef<unknown>;

  readonly panelClass = input<string | string[]>();
  readonly zIndex = input<number>();

  @HostListener('mouseleave')
  hide(): void {
    this.#overlayRef?.detach();
    this.#overlayRef = undefined;
  }

  ngOnDestroy(): void {
    this.#overlayRef?.dispose();
    this.#overlayRef = undefined;
  }

  @HostListener('mouseenter')
  show(): void {
    const finalPosition: ConnectedPosition = {
      ...this.#defaultPosition,
      ...this.position,
    };

    const positionStrategy = this.#overlayPositionBuilder.flexibleConnectedTo(this.#elementRef).withPositions([finalPosition]);
    const panelClass = this.panelClass();

    this.#overlayRef = this.#overlay.create({
      positionStrategy,
      ...(panelClass !== undefined ? { panelClass } : {}),
    });

    const zIndex = this.zIndex();

    if (zIndex !== undefined) {
      this.#overlayRef.overlayElement.style.zIndex = String(zIndex);
    }

    const portal = new TemplatePortal(this.templateRef, this.#viewContainerRef, this.appTemplatedTooltipContext);
    this.#overlayRef.attach(portal);
  }
}
