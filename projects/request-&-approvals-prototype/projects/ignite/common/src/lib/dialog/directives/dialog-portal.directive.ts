import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CdkPortalOutlet, ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import { afterNextRender, Directive, effect, inject, Injector, input, Type, untracked } from '@angular/core';

import { IGNT_DIALOG_HOST } from '../models/dialog-host';

@Directive({
  standalone: true,
})
export class IgntDialogPortalDirective<C = unknown> {
  readonly #host = inject(IGNT_DIALOG_HOST);
  readonly #cdkFocusTrap = inject(CdkTrapFocus, { self: true });
  readonly #injector = inject(Injector);
  readonly portal = input.required<ComponentPortal<C> | TemplatePortal<unknown>>();

  constructor() {
    effect(() => {
      const outlet = this.#host.portalOutlet();
      const portal = this.portal();

      untracked(() => {
        this.#attachImplementationDialog(outlet, portal);
      });
    });
  }

  #attachImplementationDialog(outlet: CdkPortalOutlet, portal: ComponentPortal<C> | TemplatePortal<unknown>): void {
    if (portal instanceof ComponentPortal) {
      outlet.attachComponentPortal(portal);
    } else {
      outlet.attachTemplatePortal(portal);
    }

    afterNextRender(
      {
        write: async () => {
          await this.#cdkFocusTrap.focusTrap.focusInitialElementWhenReady({ preventScroll: true });
        },
      },
      { injector: this.#injector },
    );
  }
}

export function withIgntDialogPortal(): {
  directive: Type<IgntDialogPortalDirective>;
  inputs: string[];
  outputs: string[];
} {
  return {
    directive: IgntDialogPortalDirective,
    inputs: ['portal'],
    outputs: [],
  };
}
