import { CdkPortalOutlet } from '@angular/cdk/portal';
import { ChangeDetectionStrategy, Component, inject, signal, viewChild, ViewEncapsulation } from '@angular/core';

import { IgntDialogRef, withIgntDialogRef } from '../../directives/dialog-ref.directive';
import { IGNT_DIALOG_HOST, IgntDialogHost } from '../../models/dialog-host';
import { IGNT_DIALOG_CONFIG } from '../../models/dialog-options';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The dialog body is projected through `CdkPortalOutlet`, so the caller's component element
  // (e.g. `<b2b-marketplace-browse-filters-drawer>`) sits as an intermediate wrapper between this
  // shell and `ignt-dialog-header`/`ignt-dialog-content`/`ignt-dialog-footer`. To lay those out as
  // the shell's grid rows, that wrapper must be `display: contents` and the grid must be gated by
  // `:has(ignt-dialog-content)`. Portaled content is created dynamically and never receives this
  // component's emulated-encapsulation attribute, and Angular's ShadowCss scopes the element names
  // referenced inside `:has()`/`:not()` and the `> *` rule, so under `Emulated` those selectors
  // could never match the portaled DOM (`::ng-deep` can't help since the gate is on the host
  // itself). `ViewEncapsulation.None` is therefore required. It is safe here because every selector
  // is namespaced under `.ignt-dialog-sidepanel-shell` and all keyframes/custom properties are
  // `ignt-dialog-*`-prefixed, so nothing leaks into unrelated components.
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.ignt-dialog-sidepanel-shell]': 'true',
    '[class.ignt-dialog-sidepanel-shell--lg]': 'dialogOptions.size === "lg"',
    '[class.ignt-dialog-sidepanel-shell--md]': 'dialogOptions.size === "md"',
    '[class.ignt-dialog-sidepanel-shell--sm]': 'dialogOptions.size === "sm"',
    '[class.ignt-dialog-sidepanel-shell--xl]': 'dialogOptions.size === "xl"',
  },
  hostDirectives: [withIgntDialogRef()],
  imports: [CdkPortalOutlet],
  providers: [{ provide: IGNT_DIALOG_HOST, useExisting: IgntSidepanelShellComponent }],
  selector: 'ignt-dialog-sidepanel-shell',
  standalone: true,
  styleUrl: './sidepanel-shell.component.scss',
  templateUrl: './sidepanel-shell.component.html',
})
export class IgntSidepanelShellComponent implements IgntDialogHost {
  readonly #dialogRef = inject(IgntDialogRef);
  readonly dialogType = 'sidepanel';
  readonly portalOutlet = viewChild.required<CdkPortalOutlet>(CdkPortalOutlet);
  protected readonly dialogOptions = inject(IGNT_DIALOG_CONFIG);
  protected readonly dialogState = signal<'opening' | 'open' | 'closing'>('opening');
  #closeCallback: (() => void) | null = null;

  constructor() {
    this.#dialogRef.requestClose.subscribe(closeCallback => {
      this.#closeCallback = closeCallback;
      this.dialogState.set('closing');
    });
  }

  onAnimationEnd(event: AnimationEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (this.dialogState() === 'opening') {
      this.dialogState.set('open');
      return;
    }

    if (this.dialogState() === 'closing') {
      this.#closeCallback?.();
      this.#closeCallback = null;
    }
  }
}
