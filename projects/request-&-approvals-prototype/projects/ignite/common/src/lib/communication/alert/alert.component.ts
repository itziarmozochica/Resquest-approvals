import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  output,
  TemplateRef,
  type Signal,
} from '@angular/core';

import { IgntIconComponent, type IgntIconName } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';

import { IgntButtonComponent } from '../../actions/button/button.component';
import type { IgntAlertSentiment } from './models/alert.model';

const ICON_BY_SENTIMENT: Record<Exclude<IgntAlertSentiment, 'neutral'>, IgntIconName> = {
  accent: 'bell',
  danger: 'exclamation-circle',
  info: 'info-circle',
  positive: 'check',
  warning: 'exclamation-triangle',
};

/**
 * Draws attention to important, persistent information tied to the page or a section of it.
 *
 * ### When to use
 * - Communicating a persistent state, warning, or confirmation tied to the surrounding content
 * - Surfacing an error or validation summary above a form, list, or section
 * - Highlighting a contextual tip unrelated to a status (`sentiment="accent"`)
 * - A message with a neutral tone, or one that doesn't fit any other sentiment (`sentiment="neutral"`)
 *
 * ### When NOT to use
 * - A transient, auto-dismissing confirmation → use Toast
 * - A single inline field validation message → use FieldError
 *
 * ### Related
 * - [Toast](?path=/docs/components-communication-toast--docs) — transient notification shown through `IgntToastService` instead of persistent, content-tied messaging
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, IgntButtonComponent, IgntIconButtonComponent, NgTemplateOutlet],
  selector: 'ignt-alert',
  standalone: true,
  styleUrl: './alert.component.scss',
  templateUrl: './alert.component.html',
})
export class IgntAlertComponent {
  /**
   * Label for the default action button (rendered as `size="small" variant="secondary"`).
   * Ignored when a `#igntAlertActions` template is projected instead.
   */
  readonly actionLabel = input<string | undefined>();

  /**
   * Accessible name for the icon-only dismiss button.
   */
  readonly closeButtonAriaLabel = input('Close alert');

  /**
   * Plain-text body, rendered when no `#igntAlertContent` template is projected.
   * Required unless a `#igntAlertContent` template is projected instead.
   */
  readonly description = input<string | undefined>();

  /**
   * Replaces the bell of an `accent` alert when another icon says more about the message, such as a lock
   * on a section that can no longer be edited.
   * Only `accent` takes a custom icon: every other sentiment keeps its own icon and ignores this input,
   * and a `neutral` alert stays without one.
   */
  readonly icon = input<IgntIconName | undefined>();

  /**
   * Colour intent of the alert.
   * - `info` — an informational message.
   * - `accent` — a contextual tip, not tied to a status.
   * - `positive` — success confirmation.
   * - `warning` — a caution the user should be aware of.
   * - `danger` — an error or destructive-state notice.
   * - `neutral` — the message is neutral in tone, or its semantics don't fit any of the other variants.
   */
  readonly sentiment = input<IgntAlertSentiment>('info');

  /**
   * Shows the dismiss (×) button and enables the `closeAlert` output.
   */
  readonly showCloseButton = input(false, { transform: booleanAttribute });

  /**
   * Bold heading shown above the content.
   */
  readonly title = input<string | undefined>();

  /**
   * Emitted when the default action button is activated. No-op when a `#igntAlertActions` template is projected instead.
   */
  readonly actionClicked = output();

  /**
   * Emitted when the dismiss button is activated.
   */
  readonly closeAlert = output();

  /**
   * Full control over the actions area — anything projected here (one or more buttons, a link, etc.)
   * replaces the default `actionLabel` button entirely.
   *
   * @example
   * <ng-template #igntAlertActions>
   *   <ignt-button label="Retry" size="small" variant="secondary" />
   * </ng-template>
   */
  protected readonly actionsTemplate = contentChild<TemplateRef<unknown>>('igntAlertActions');

  /**
   * Full control over the body content — anything projected here (a list, rich HTML, etc.)
   * replaces `description` entirely. `title` still renders separately above it.
   *
   * @example
   * <ng-template #igntAlertContent>
   *   <ul><li>Item one</li></ul>
   * </ng-template>
   */
  protected readonly contentTemplate = contentChild<TemplateRef<unknown>>('igntAlertContent');

  protected readonly displayedIcon: Signal<IgntIconName | null> = computed(() => {
    const sentiment = this.sentiment();
    if (sentiment === 'accent') {
      return this.icon() ?? ICON_BY_SENTIMENT.accent;
    }
    return sentiment === 'neutral' ? null : ICON_BY_SENTIMENT[sentiment];
  });

  protected readonly hasAction: Signal<boolean> = computed(() => this.actionsTemplate() !== undefined || this.actionLabel() !== undefined);

  protected onClose(): void {
    this.closeAlert.emit();
  }
}
