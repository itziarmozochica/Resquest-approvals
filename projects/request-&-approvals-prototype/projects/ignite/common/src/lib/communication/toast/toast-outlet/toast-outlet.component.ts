import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { IgntToastState } from '../models/toast.model';
import { IgntToastComponent } from '../toast.component';

/**
 * The single stack every toast renders in. `IgntToastService` creates one per application on the first `show()`,
 * appends it to `document.body` and promotes it to the browser top layer with the native Popover API
 * (`popover="manual"`), so toasts escape every containing block and every z-index stack, including CDK overlays.
 * Internal to `IgntToastService`; never used directly by consumers.
 *
 * The host is a persistent `aria-live="polite"` region: live regions must exist before content is inserted to be
 * announced reliably, which a per-toast `role="status"` cannot guarantee.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-live': 'polite',
    popover: 'manual',
  },
  imports: [IgntToastComponent],
  selector: 'ignt-toast-outlet',
  styleUrl: './toast-outlet.component.scss',
  templateUrl: './toast-outlet.component.html',
})
export class IgntToastOutletComponent {
  /**
   * Toasts to render, oldest first.
   */
  readonly toasts = input.required<readonly IgntToastState[]>();

  /**
   * Emits the id of the toast whose action button was activated.
   */
  readonly actionClicked = output<string>();

  /**
   * Emits the id of the toast whose close button was activated or whose timer elapsed.
   */
  readonly dismissed = output<string>();
}
