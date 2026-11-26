import { Overlay, OverlayConfig, OverlayRef, PositionStrategy } from '@angular/cdk/overlay';
import { ComponentPortal, ComponentType, TemplatePortal } from '@angular/cdk/portal';
import { DestroyRef, inject, Injectable, Injector, signal, TemplateRef, ViewContainerRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { I18N_DIRECTION } from '../core/tokens/i18n-direction.token';
import { IgntConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { IgntMessageModalComponent } from './components/message-modal/message-modal.component';
import { IgntDialogModalShellComponent } from './components/modal-shell/modal-shell.component';
import { IgntSidepanelShellComponent } from './components/sidepanel-shell/sidepanel-shell.component';
import { IgntDialogRef } from './directives/dialog-ref.directive';
import { IGNT_DIALOG_OVERLAY } from './models/dialog-host';
import {
  IGNT_DIALOG_CONFIG,
  IGNT_DIALOG_CONFIRM_MODAL_DEFAULT_CONFIG,
  IGNT_DIALOG_DATA,
  IGNT_DIALOG_MESSAGE_MODAL_DEFAULT_CONFIG,
  IGNT_DIALOG_MODAL_DEFAULT_CONFIG,
  IgntDialogConfirmModalConfig,
  IgntDialogMessageModalConfig,
  IgntDialogModalConfig,
  IgntDialogSidePanelConfig,
} from './models/dialog-options';
import { IGNT_DIALOG_REF } from './models/dialog-ref';

/**
 * Service to open a dialogs of type modal and sidepanel.
 */
@Injectable({
  providedIn: 'root',
})
export class IgntDialogService {
  readonly #overlay = inject(Overlay);
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);
  readonly #i18nDirection = inject(I18N_DIRECTION);
  readonly #openDialogs = signal<readonly { close: () => void }[]>([]);

  /**
   * Closes every dialog opened through this service (modals and side panels), the Ignite
   * equivalent of ng-bootstrap's `dismissAll()`. Dialogs close top-most first, as CDK's
   * `Dialog.closeAll()` does, and each opener's `closed$` emits `undefined`, as it does for
   * the X button, Escape or the backdrop.
   */
  closeAll(): void {
    const dialogs = this.#openDialogs();
    for (const dialog of [...dialogs].reverse()) {
      dialog.close();
    }
  }

  /**
   * Whether any dialog opened through this service (modal or side panel) is still open,
   * the Ignite equivalent of ng-bootstrap's `hasOpenModals()`.
   */
  hasOpenDialogs(): boolean {
    return this.#openDialogs().length > 0;
  }

  /**
   * Opens a two-button confirmation modal window
   * @param title Title shown in the modal header
   * @param message Message shown in the modal content. Rendered as plain text
   * @param options Options for changing the display of the modal
   * @returns A dialog ref whose closed$ emits true on accept and false on cancel. The modal cannot be dismissed.
   */
  openConfirmModal(title: string, message: string, options?: IgntDialogConfirmModalConfig): IgntDialogRef<boolean> {
    const config: IgntDialogConfirmModalConfig = {
      ...IGNT_DIALOG_CONFIRM_MODAL_DEFAULT_CONFIG,
      ...options,
      disableCloseShortcuts: true,
      data: {
        isDestructive: options?.isDestructive,
        message,
        title,
      },
    };
    const overlayConfig = this.#createCenteredOverlayConfig();
    return this.#openWithShell(IgntConfirmModalComponent, config, overlayConfig, IgntDialogModalShellComponent);
  }

  /**
   * Opens a message modal window
   * @param options Options for changing the display of the modal
   */
  openMessageModal(title: string, message: string, options?: IgntDialogMessageModalConfig): IgntDialogRef<boolean> {
    const config: IgntDialogMessageModalConfig = {
      ...IGNT_DIALOG_MESSAGE_MODAL_DEFAULT_CONFIG,
      ...options,
      data: {
        message,
        title,
      },
    };
    const overlayConfig = this.#createCenteredOverlayConfig();
    return this.#openWithShell(IgntMessageModalComponent, config, overlayConfig, IgntDialogModalShellComponent);
  }

  /**
   * Opens a Template based modal window
   * @param templateRef The template ref to show in the modal
   * @param options Options for changing the display of the modal
   */
  openModal<R = unknown, D = unknown>(template: TemplateRef<unknown>, options?: IgntDialogModalConfig<D>): IgntDialogRef<R>;
  /**
   * Opens a component based modal window
   * @param componentType The component type to show in the modal
   * @param options Options for changing the display of the modal
   */
  openModal<R = unknown, D = unknown, C = unknown>(component: ComponentType<C>, options?: IgntDialogModalConfig<D>): IgntDialogRef<R>;
  /**
   * Opens a modal window
   * @param implementationComponentOrTemplate The component type or template ref to show in the modal
   * @param options Options for changing the display of the modal
   */
  openModal<R = unknown, D = unknown, C = unknown>(
    implementationComponentOrTemplate: ComponentType<C> | TemplateRef<unknown>,
    options: IgntDialogModalConfig<D> = {},
  ): IgntDialogRef<R> {
    const config: IgntDialogModalConfig<D> = { ...(IGNT_DIALOG_MODAL_DEFAULT_CONFIG as IgntDialogModalConfig<D>), ...options };
    const overlayConfig = this.#createCenteredOverlayConfig();
    return this.#openWithShell(implementationComponentOrTemplate, config, overlayConfig, IgntDialogModalShellComponent);
  }

  /**
   * Opens a Template based sidepanel window
   * @param templateRef The template ref to show in the modal
   * @param options Options for changing the display of the modal
   */
  openSidePanel<R = unknown, D = unknown>(template: TemplateRef<unknown>, options?: IgntDialogSidePanelConfig<D>): IgntDialogRef<R>;
  /**
   * Opens a component based sidepanel window
   * @param componentType The component type to show in the modal
   * @param options Options for changing the display of the modal
   */
  openSidePanel<R = unknown, D = unknown, C = unknown>(
    component: ComponentType<C>,
    options?: IgntDialogSidePanelConfig<D>,
  ): IgntDialogRef<R>;
  /**
   * Opens a sidepanel window
   * @param implementationComponentOrTemplate The component type or template ref to show in the modal
   * @param options Options for changing the display of the modal
   */
  openSidePanel<R = unknown, D = unknown, C = unknown>(
    implementationComponentOrTemplate: ComponentType<C> | TemplateRef<unknown>,
    options: IgntDialogSidePanelConfig<D> = {},
  ): IgntDialogRef<R> {
    const overlayConfig = new OverlayConfig({
      hasBackdrop: true,
      positionStrategy: this.#overlay.position().global(),
      scrollStrategy: this.#overlay.scrollStrategies.block(),
    });
    return this.#openWithShell(implementationComponentOrTemplate, options, overlayConfig, IgntSidepanelShellComponent);
  }

  #createCenteredOverlayConfig(): OverlayConfig {
    const positionStrategy: PositionStrategy = this.#overlay.position().global().centerHorizontally().centerVertically();
    return new OverlayConfig({
      hasBackdrop: true,
      positionStrategy,
      scrollStrategy: this.#overlay.scrollStrategies.block(),
    });
  }

  #createShellPortal<C, D = unknown>(
    implementationComponent: ComponentType<C>,
    overlayRef: OverlayRef,
    options: IgntDialogModalConfig<D> | IgntDialogSidePanelConfig<D> | IgntDialogMessageModalConfig | IgntDialogConfirmModalConfig,
  ): ComponentPortal<C> {
    return new ComponentPortal<C>(
      implementationComponent,
      null,
      Injector.create({
        parent: options.injector ?? this.#injector,
        providers: [
          { provide: IGNT_DIALOG_CONFIG, useValue: options },
          { provide: IGNT_DIALOG_OVERLAY, useValue: overlayRef },
        ],
      }),
    );
  }

  #openWithShell<C, D, R>(
    implementationComponentOrTemplate: ComponentType<C> | TemplateRef<unknown>,
    options: IgntDialogModalConfig<D> | IgntDialogSidePanelConfig<D> | IgntDialogMessageModalConfig | IgntDialogConfirmModalConfig,
    overlayConfig: OverlayConfig,
    shellComponent: ComponentType<unknown>,
  ): IgntDialogRef<R> {
    overlayConfig.direction = this.#i18nDirection();
    const overlayRef = this.#overlay.create(overlayConfig);
    const shellPortal = this.#createShellPortal(shellComponent, overlayRef, options);
    const shellRef = overlayRef.attach(shellPortal);
    const dialogRef = shellRef.injector.get<IgntDialogRef<R>>(IgntDialogRef);
    this.#trackOpenDialog(dialogRef);
    const parentInjector: Injector = options.injector ?? this.#injector;
    const dialogInjector = Injector.create({
      parent: parentInjector,
      providers: [
        { provide: IGNT_DIALOG_DATA, useValue: options.data },
        { provide: IGNT_DIALOG_REF, useValue: dialogRef },
      ],
    });

    let implementationPortal: ComponentPortal<C> | TemplatePortal<unknown> | null = null;
    if (implementationComponentOrTemplate instanceof TemplateRef) {
      const viewContainerRef = shellRef.injector.get(ViewContainerRef);
      implementationPortal = new TemplatePortal(implementationComponentOrTemplate, viewContainerRef, undefined, dialogInjector);
    } else {
      implementationPortal = new ComponentPortal<C>(implementationComponentOrTemplate, undefined, dialogInjector);
    }

    shellRef.setInput('portal', implementationPortal);
    return dialogRef;
  }

  #trackOpenDialog<R>(dialogRef: IgntDialogRef<R>): void {
    this.#openDialogs.update(dialogs => [...dialogs, dialogRef]);
    // closed$ completes once the dialog is gone, whatever closed it.
    dialogRef.closed$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      complete: () => {
        this.#openDialogs.update(dialogs => dialogs.filter(dialog => dialog !== dialogRef));
      },
    });
  }
}
