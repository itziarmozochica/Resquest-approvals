import { inject, InjectionToken, type Type } from '@angular/core';

import { IgntDialogService } from '@ignite/common';
import type { Observable } from 'rxjs';

/** Handle to an opened announcement dialog. */
export interface AnnouncementDialogHandle {
  /** Emits (and completes) when the dialog is dismissed. */
  readonly closed$: Observable<unknown>;
  /** Dismisses the dialog from outside, e.g. when the session it belongs to ends. */
  readonly close: () => void;
}

/**
 * Host-agnostic dialog abstraction. Defaults to the Ignite design system dialog
 * (`IgntDialogService`), so the opened component receives an `IGNT_DIALOG_REF`
 * and can dismiss itself. A host can override {@link ANNOUNCEMENTS_DIALOG} for a
 * bespoke presentation (e.g. a different size or a non-Ignite dialog).
 */
export interface AnnouncementsDialogPort {
  open: (component: Type<unknown>) => AnnouncementDialogHandle;
}

/** Widest bounded Ignite modal size; hosts override {@link ANNOUNCEMENTS_DIALOG} to change it. */
const DEFAULT_MODAL_SIZE = 'lg';

/** Default {@link AnnouncementsDialogPort} backed by Ignite's `IgntDialogService`. */
class IgniteAnnouncementsDialog implements AnnouncementsDialogPort {
  readonly #dialogService = inject(IgntDialogService);

  open(component: Type<unknown>): AnnouncementDialogHandle {
    const ref = this.#dialogService.openModal(component, { size: DEFAULT_MODAL_SIZE });
    return {
      closed$: ref.closed$,
      close: () => {
        ref.close();
      },
    };
  }
}

/**
 * DI token for the dialog port. Ships a tree-shakable Ignite-backed default so the
 * token is always resolvable without host wiring.
 */
export const ANNOUNCEMENTS_DIALOG = new InjectionToken<AnnouncementsDialogPort>('ANNOUNCEMENTS_DIALOG', {
  providedIn: 'root',
  factory: () => new IgniteAnnouncementsDialog(),
});
