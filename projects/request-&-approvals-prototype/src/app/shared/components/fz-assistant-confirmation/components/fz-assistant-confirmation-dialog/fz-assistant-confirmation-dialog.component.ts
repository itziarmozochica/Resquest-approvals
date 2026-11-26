import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, Signal, viewChild } from '@angular/core';

import { FzAssistantConfirmationDialogData } from '@fz-original/app/shared/components/fz-assistant-confirmation/models/fz-assistant-confirmation-dialog-data.model';
import {
  FzAssistantConfirmationActionSummary,
  readActionSummary,
} from '@fz-original/app/shared/components/fz-assistant-confirmation/utils/fz-assistant-confirmation-action-summary.util';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntButtonComponent } from '@ignite/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

/**
 * Approve / Decline for a step Act refused to commit unattended (§5.8 step 3).
 *
 * Dumb by design: it closes with `true` or `false` and knows nothing about the controller or about Act.
 * `FzAssistantConfirmationDialogService` owns what those answers mean.
 *
 * Accessibility is acceptance criteria here rather than polish, because this dialog is the last thing
 * between an agent and a commit. What the Ignite modal shell already provides, and what is left to own,
 * split like this — `dialog-ref.directive.ts` and `dialog-portal.directive.ts` are the source:
 *
 * | Shell provides | Owned here |
 * | -- | -- |
 * | `role="dialog"` + `aria-modal` on its own host, **unnamed** | `role="alertdialog"`, named by the heading and described by the agent's message |
 * | `CdkTrapFocus`, and an initial focus move to the first tabbable element | Focus on **Decline** specifically, and Escape |
 *
 * - Focus lands on **Decline**, never Approve. A keyboard Partner who fires the focused control on
 *   reflex must not thereby commit, so the safe answer is the one under their hands. The shell's own
 *   move happens to land there too, because Decline is first in the DOM — this hook is what keeps that
 *   true if the DOM order ever changes, and it runs after the shell's (a bare `afterNextRender` callback
 *   is the `mixedReadWrite` phase, the shell's is `write`).
 * - Escape maps to Decline rather than dismissing. The dialog is opened with `disableCloseShortcuts`,
 *   so a bare dismissal would close the surface while the controller still held a pending step — a gate
 *   nobody answered, and a Partner with no way back to it.
 *
 * The shell's `role="dialog"` + `aria-modal` cannot be named or replaced from in here without reaching up
 * out of the portal, so this host's `alertdialog` sits inside it and the modal is declared twice — nested
 * `aria-modal` is not a pattern ARIA describes, and the outer one carries no accessible name. Left as is
 * on purpose: which of the two an AT latches onto is engine-specific, and changing it blind could make
 * the announcement worse rather than better. The fix belongs in Ignite, as `role` / `ariaLabelledby`
 * options on `openModal` (DS follow-up), not in a workaround here.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown.escape)': 'decline($event)',
    'aria-describedby': 'fz-assistant-confirmation-message',
    'aria-labelledby': 'fz-assistant-confirmation-title',
    'aria-modal': 'true',
    class: 'fz-assistant-confirmation-dialog',
    role: 'alertdialog',
  },
  imports: [IgntButtonComponent, TranslateModule],
  selector: 'app-fz-assistant-confirmation-dialog',
  standalone: true,
  styleUrl: './fz-assistant-confirmation-dialog.component.scss',
  templateUrl: './fz-assistant-confirmation-dialog.component.html',
})
export class FzAssistantConfirmationDialogComponent {
  readonly #dialogRef = inject(IGNT_DIALOG_REF);
  readonly #translate = inject(TranslateService);
  protected readonly data = inject(IGNT_DIALOG_DATA) as FzAssistantConfirmationDialogData; // the token is InjectionToken<unknown>; FzAssistantConfirmationDialogService is its only opener and builds exactly this shape
  // `protected`, not `#`: Angular refuses a signal query on an ES-private field ("Cannot use viewChild
  // on a class member that is declared as ES private"), and the repo bans the `private` keyword.
  // `ElementRef<unknown>`, which is what `read: ElementRef` actually resolves to - the token carries no
  // element type, so claiming `HTMLElement` here would assert something DI cannot guarantee. Narrowed
  // where it is used instead.
  protected readonly declineButton: Signal<ElementRef<unknown> | undefined> = viewChild('declineButton', { read: ElementRef });

  /**
   * A plain-language line for the step itself, beside the agent's own message: a translation key and the
   * values the `translate` pipe interpolates into it.
   *
   * The fallback target is resolved with `instant` rather than through the pipe, because it is a value
   * interpolated into another key rather than a string of its own. A modal does not outlive a language
   * change, so nothing is lost by reading it once.
   */
  protected readonly actionSummary: Signal<FzAssistantConfirmationActionSummary> = computed(() =>
    readActionSummary(this.data, this.#translate.instant('chatbot.confirmation.defaultTarget')),
  );

  constructor() {
    // After the portal has rendered, so the button exists to receive focus.
    afterNextRender(() => this.#focusDecline());
  }

  protected approve(): void {
    this.#dialogRef.close(true);
  }

  protected decline(event?: Event): void {
    // Stops Escape from also reaching anything behind the modal, and keeps the browser from treating it
    // as a dismissal of the overlay itself.
    event?.preventDefault();
    this.#dialogRef.close(false);
  }

  #focusDecline(): void {
    // `ignt-button` renders its focusable `<button>` inside the custom element, and the host itself is
    // not focusable, so the query has to reach through it. Both hops are narrowed rather than asserted:
    // the query's `nativeElement` is `unknown`, and the inner button may not exist at all.
    const host = this.declineButton()?.nativeElement;
    if (!(host instanceof HTMLElement)) {
      return;
    }

    const focusTarget = host.querySelector('button');
    if (focusTarget instanceof HTMLElement) {
      focusTarget.focus();
    }
  }
}
