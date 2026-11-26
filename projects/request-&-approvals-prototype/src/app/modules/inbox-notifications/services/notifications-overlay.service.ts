import { FlexibleConnectedPositionStrategy, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { effect, inject, Injectable, Injector } from '@angular/core';

import { IgntDialogRef, IgntDialogService, IgntMediaQueriesService } from '@ignite/common';

import { NotificationsPanelContentComponent } from '../components/notifications-panel-content/notifications-panel-content.component';
import { NotificationsPanelComponent } from '../components/notifications-panel/notifications-panel.component';
import { PANEL_CLOSE } from '../tokens/panel-close.token';
import { PANEL_LAYOUT } from '../tokens/panel-layout.token';

@Injectable({ providedIn: 'root' })
export class NotificationsOverlayService {
  readonly #overlay = inject(Overlay);
  readonly #injector = inject(Injector);
  readonly #dialog = inject(IgntDialogService);
  readonly #mediaQueries = inject(IgntMediaQueriesService);

  #overlayRef: OverlayRef | null = null;
  #positionStrategy: FlexibleConnectedPositionStrategy | null = null;
  #dialogRef: IgntDialogRef<void> | null = null;

  constructor() {
    effect(() => {
      this.#mediaQueries.isMobile();
      /**
       * Crossing the mobile/desktop breakpoint tears down the panel (dropdown and sheet are different
       * overlays). This system-initiated close emits a single `notifications.panel.close` — counted as a
       * normal close, not distinguished from a user dismissal. It stays paired with the original open
       * (the panel is not reopened in the new layout), so the open/close funnel remains balanced.
       */
      if (this.isOpen) this.close();
    });
  }

  close(): void {
    this.#overlayRef?.dispose();
    this.#overlayRef = null;
    this.#positionStrategy = null;
    this.#dialogRef?.close();
    this.#dialogRef = null;
  }

  get isOpen(): boolean {
    return this.#overlayRef !== null || this.#dialogRef !== null;
  }

  open(triggerEl: HTMLElement, injector?: Injector): void {
    if (this.isOpen) return;

    const parentInjector = injector ?? this.#injector;

    if (this.#mediaQueries.isMobile()) {
      this.#openMobileSheet(parentInjector);
    } else {
      this.#openDesktopDropdown(triggerEl, parentInjector);
    }
  }

  reanchor(triggerEl: HTMLElement): void {
    if (this.#overlayRef === null || this.#positionStrategy === null) return;
    this.#positionStrategy.setOrigin(triggerEl);
    this.#overlayRef.updatePosition();
  }

  #openDesktopDropdown(triggerEl: HTMLElement, parentInjector: Injector): void {
    this.#positionStrategy = this.#overlay
      .position()
      .flexibleConnectedTo(triggerEl)
      .withPositions([
        { offsetY: 8, originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
        { offsetY: -8, originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
      ])
      .withFlexibleDimensions(false)
      .withViewportMargin(8)
      .withPush(true);

    this.#overlayRef = this.#overlay.create({
      backdropClass: 'cdk-overlay-transparent-backdrop',
      hasBackdrop: true,
      maxWidth: '641px',
      positionStrategy: this.#positionStrategy,
      scrollStrategy: this.#overlay.scrollStrategies.reposition({ autoClose: true }),
    });

    const portal = new ComponentPortal(NotificationsPanelComponent, null, parentInjector);
    this.#overlayRef.attach(portal);

    this.#overlayRef.backdropClick().subscribe(() => this.close());
    this.#overlayRef.detachments().subscribe(() => this.close());
    this.#overlayRef.keydownEvents().subscribe(event => {
      if (event.key === 'Escape') this.close();
    });
  }

  #openMobileSheet(parentInjector: Injector): void {
    const injector = Injector.create({
      parent: parentInjector,
      providers: [
        { provide: PANEL_CLOSE, useValue: () => this.#dialogRef?.close() },
        { provide: PANEL_LAYOUT, useValue: 'sheet' },
      ],
    });

    this.#dialogRef = this.#dialog.openSidePanel<void>(NotificationsPanelContentComponent, {
      disableCloseShortcuts: false,
      injector,
    });

    this.#dialogRef.closed$.subscribe(() => {
      this.#dialogRef = null;
    });
  }
}
