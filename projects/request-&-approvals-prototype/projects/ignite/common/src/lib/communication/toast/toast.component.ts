import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  NgZone,
  output,
  signal,
  TemplateRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';

import { IgntIconComponent, type IgntIconName } from '@ignite/icon';

import { IgntButtonComponent } from '../../actions/button/button.component';
import type { IgntToastSentiment } from './models/toast.model';

const ICON_BY_SENTIMENT: Record<Exclude<IgntToastSentiment, 'neutral'>, IgntIconName> = {
  accent: 'bell',
  danger: 'exclamation-circle',
  info: 'info-circle',
  positive: 'check',
  warning: 'exclamation-triangle',
};

/**
 * A transient, floating notification that confirms the result of an action. Rendered by `IgntToastService` inside its
 * outlet; it is never placed in a template directly.
 *
 * ### When to use
 * - Confirming a user-initiated action succeeded, failed, or produced a side effect (save, upload, delete)
 * - A message that is not tied to the surrounding page content and can disappear on its own
 *
 * ### When NOT to use
 * - A persistent state, warning, or confirmation tied to the surrounding content → use [Alert](?path=/docs/components-communication-alert--docs) instead.
 * - A single inline field validation message → use [FieldError](?path=/docs/components-fields-field-error--docs) instead.
 *
 * ### Related
 * - [Alert](?path=/docs/components-communication-alert--docs) — persistent, content-tied messaging instead of a transient notification
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut()',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    '[style.--ignt-toast-duration]': 'durationStyle()',
  },
  imports: [IgntButtonComponent, IgntIconComponent, NgTemplateOutlet],
  selector: 'ignt-toast',
  styleUrl: './toast.component.scss',
  templateUrl: './toast.component.html',
})
export class IgntToastComponent {
  readonly #ngZone = inject(NgZone);
  #pausedByFocus = false;
  #pausedByHover = false;
  #remainingMs = 0;
  #timeoutId: ReturnType<typeof setTimeout> | null = null;
  #timerStartedAt = 0;

  /**
   * Accessible name for the icon-only dismiss button. Resolved by `IgntToastService` from `IGNT_TOAST_TRANSLATIONS`;
   * not settable per toast.
   */
  readonly closeButtonAriaLabel = input.required<string>();

  /**
   * Plain-text body, rendered when no `content` template is set. `''` when `content` is set.
   */
  readonly description = input.required<string>();

  /**
   * Milliseconds before the toast auto-dismisses. `Infinity`, `0` or a negative value keeps it until dismissed and
   * hides the progress bar. The
   * timer pauses while the toast is hovered or contains focus (WCAG 2.2.1 Timing Adjustable) and resumes with the
   * remaining time.
   */
  readonly duration = input.required<number>();

  /**
   * Colour intent of the toast.
   * - `info` — an informational message.
   * - `accent` — a contextual tip, not tied to a status.
   * - `positive` — success confirmation.
   * - `warning` — a caution the user should be aware of.
   * - `danger` — an error or destructive-state notice.
   * - `neutral` — the message is neutral in tone, or its semantics don't fit any of the other variants.
   */
  readonly sentiment = input.required<IgntToastSentiment>();

  /**
   * Shows the dismiss (×) button and enables the `dismissed` output.
   */
  readonly showCloseButton = input.required<boolean>();

  /**
   * Label for the default action button (rendered as `contrast sentiment="neutral" size="small" variant="secondary"`).
   */
  readonly actionLabel = input<string | undefined>();

  /**
   * Full control over the actions area: anything projected here replaces the default `actionLabel`
   * button entirely.
   */
  readonly actions = input<TemplateRef<unknown> | undefined>();

  /**
   * Rich body rendered instead of `description`: a template declared by the caller (a list, a link, any markup).
   * `title` still renders separately above it.
   */
  readonly content = input<TemplateRef<unknown> | undefined>();

  /**
   * Bold heading shown above the body.
   */
  readonly title = input<string | undefined>();

  /**
   * Emitted when the default action button is activated.
   */
  readonly actionClicked = output();

  /**
   * Emitted when the toast is dismissed, either by the user (close button) or automatically after `duration` elapses.
   */
  readonly dismissed = output();

  // `0` and negatives mean "stay" here, as they do in Material, ngx-toastr and the legacy ToastService,
  // rather than scheduling a timeout that fires on the next tick and drops the message.
  protected readonly isPersistent: Signal<boolean> = computed(() => {
    const duration = this.duration();
    return !Number.isFinite(duration) || duration <= 0;
  });

  // Feeds the `--ignt-toast-duration` custom property the bar drains over; `null` removes it for a
  // persistent toast, which renders no bar.
  protected readonly durationStyle: Signal<string | null> = computed(() => (this.isPersistent() ? null : `${this.duration()}ms`));

  protected readonly icon: Signal<IgntIconName | null> = computed(() => {
    const sentiment = this.sentiment();
    return sentiment === 'neutral' ? null : ICON_BY_SENTIMENT[sentiment];
  });

  // Drives the bar's `animation-play-state` so it pauses exactly when the timer does; the timer itself runs
  // off the plain `#pausedByHover` / `#pausedByFocus` flags.
  protected readonly isPaused: WritableSignal<boolean> = signal(false);

  constructor() {
    effect(onCleanup => {
      this.#remainingMs = this.duration();
      this.#startTimer();
      onCleanup(() => {
        this.#stopTimer();
      });
    });
  }

  protected onClose(): void {
    this.dismissed.emit();
  }

  protected onFocusIn(event: FocusEvent): void {
    // A pointer click focuses a button too, so pausing on every focus would pin the toast open until the
    // user happened to click elsewhere. WCAG 2.2.1 is about keyboard users, and `:focus-visible` is exactly
    // the distinction the browser already draws.
    const target = event.target;
    if (!(target instanceof Element) || !target.matches(':focus-visible')) {
      return;
    }
    this.#pausedByFocus = true;
    this.isPaused.set(true);
    this.#pauseTimer();
  }

  protected onFocusOut(): void {
    this.#pausedByFocus = false;
    if (!this.#pausedByHover) {
      this.isPaused.set(false);
      this.#startTimer();
    }
  }

  protected onMouseEnter(): void {
    this.#pausedByHover = true;
    this.isPaused.set(true);
    this.#pauseTimer();
  }

  protected onMouseLeave(): void {
    this.#pausedByHover = false;
    if (!this.#pausedByFocus) {
      this.isPaused.set(false);
      this.#startTimer();
    }
  }

  #pauseTimer(): void {
    if (this.#timeoutId === null) {
      return;
    }
    this.#remainingMs -= Date.now() - this.#timerStartedAt;
    this.#stopTimer();
  }

  #startTimer(): void {
    // `setTimeout` coerces `Infinity` to a near-zero delay, so a persistent toast must never schedule one.
    if (this.isPersistent() || this.#pausedByFocus || this.#pausedByHover || this.#timeoutId !== null) {
      return;
    }
    this.#timerStartedAt = Date.now();
    // Outside the zone, as the ripple directive does: a toast counting down for seconds is not work the
    // application is waiting on, and inside the zone it keeps `ApplicationRef` unstable for its whole life —
    // which hangs every `whenStable()` in a consumer's spec. The emit goes back in, because it writes signals.
    this.#timeoutId = this.#ngZone.runOutsideAngular(() =>
      setTimeout(() => {
        this.#timeoutId = null;
        this.#ngZone.run(() => {
          this.dismissed.emit();
        });
      }, this.#remainingMs),
    );
  }

  #stopTimer(): void {
    if (this.#timeoutId === null) {
      return;
    }
    clearTimeout(this.#timeoutId);
    this.#timeoutId = null;
  }
}
