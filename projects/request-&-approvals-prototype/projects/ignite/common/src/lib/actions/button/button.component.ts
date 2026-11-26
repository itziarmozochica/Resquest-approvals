import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, type Signal } from '@angular/core';

import { IgntIconComponent, type IgntIconSize } from '@ignite/icon';

import { IgntRippleDirective } from '../ripple/ripple.directive';
import type { IgntButtonHtmlType, IgntButtonIcon, IgntButtonSentiment, IgntButtonSize, IgntButtonVariant } from './models/button.model';

// Icon size mirrors the button's own typography scale: `large` uses the same `base` font
// size, `small` uses `sm` — see button.component.scss `foundations.$font-base-bold` / `$font-small-bold`.
const ICON_SIZE_BY_BUTTON_SIZE: Record<IgntButtonSize, IgntIconSize> = {
  large: 'base',
  small: 'sm',
};

/**
 * Triggers a single user-initiated action: submit, confirm, navigate, or a short async operation.
 *
 * ### When to use
 * - The main call-to-action in a form, dialog, or page (submit, save, confirm, continue)
 * - A secondary or tertiary action supporting the primary one (cancel, back, skip)
 * - A destructive action (`sentiment="danger"`) or a positive/success action (`sentiment="positive"`)
 * - A short async operation that needs visible feedback (`loading`)
 *
 * ### When NOT to use
 * - Navigating to another page/view with no other side effect → use Link
 * - Toggling a persistent on/off setting → use Toggle
 * - Choosing one option among several → use RadioButton or Pill
 * - Icon-only actions → use IconButton
 * - A non-interactive label or status → use Tag
 *
 * ### Related
 * - [IconButton](?path=/docs/components-actions-icon-button--docs) — icon-only actions, not covered by this component
 * - [Link](?path=/docs/components-actions-link--docs) — text-only navigation with no button chrome
 * - [PillButton](?path=/docs/components-selection-pillbutton--docs) — selecting one option among several (e.g. filtering), not a single action
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.ignt-button--fill]': 'fill()' },
  imports: [IgntIconComponent, IgntRippleDirective],
  selector: 'ignt-button',
  standalone: true,
  styleUrl: './button.component.scss',
  templateUrl: './button.component.html',
})
export class IgntButtonComponent {
  /**
   * Text label displayed inside the button.
   */
  readonly label = input.required<string>();

  /**
   * Whether the content this button shows or hides is expanded, exposed as `aria-expanded`.
   * Set it only when the button toggles a disclosure; leave it unset for plain actions.
   */
  readonly ariaExpanded = input<boolean | undefined>();

  /**
   * Accessible name override. Use when the visible label does not fully describe the action.
   */
  readonly ariaLabel = input<string | undefined>();

  /**
   * Renders the button using the `-contrast` token set, for placement on dark or coloured backgrounds.
   */
  readonly contrast = input(false, { transform: booleanAttribute });

  /**
   * Whether the button is disabled. Uses `aria-disabled` (not the native `disabled`
   * attribute) so the button stays reachable via Tab; pair with a tooltip explaining why.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Adds an elevation shadow for buttons floating over content (e.g. a sticky call-to-action).
   * Only meaningful combined with `variant="primary"`.
   */
  readonly fab = input(false, { transform: booleanAttribute });

  /**
   * Stretches the button to the full width of its parent, dropping the `inline-block` host box.
   * Use for stacked call-to-actions in narrow containers (mobile sheets, side panels, cards).
   */
  readonly fill = input(false, { transform: booleanAttribute });

  /**
   * Native `type` attribute forwarded to the rendered `<button>` element.
   */
  readonly htmlType = input<IgntButtonHtmlType>('button');

  /**
   * Icon rendered before the label.
   */
  readonly leadingIcon = input<IgntButtonIcon | undefined>();

  /**
   * Shows a loading spinner in place of the label/icons and blocks re-activation.
   */
  readonly loading = input(false, { transform: booleanAttribute });

  /**
   * Colour intent of the button.
   * - `brand` — default call-to-action colour.
   * - `danger` — destructive action.
   * - `positive` — positive confirmation or success action.
   * - `neutral` — low-contrast, sharp/dark alternative to `brand`.
   */
  readonly sentiment = input<IgntButtonSentiment>('brand');

  /**
   * Physical size of the button, driving typography, spacing, and icon size.
   */
  readonly size = input<IgntButtonSize>('large');

  /**
   * Icon rendered after the label.
   */
  readonly trailingIcon = input<IgntButtonIcon | undefined>();

  /**
   * Emphasis tier of the button.
   * - `primary` — filled, highest emphasis.
   * - `secondary` — outlined, medium emphasis.
   * - `tertiary` — text-only, lowest emphasis.
   */
  readonly variant = input<IgntButtonVariant>('primary');

  protected readonly blocked: Signal<boolean> = computed(() => this.disabled() || this.loading());

  protected readonly iconSize: Signal<IgntIconSize> = computed(() => ICON_SIZE_BY_BUTTON_SIZE[this.size()]);

  protected readonly showLeadingIcon: Signal<boolean> = computed(() => Boolean(this.leadingIcon()));

  protected readonly showTrailingIcon: Signal<boolean> = computed(() => Boolean(this.trailingIcon()));

  /**
   * Whether exactly one icon slot is filled, which requires the opposite side's
   * padding to grow by `gap + 2px` to keep the label optically centred (see `.scss`).
   */
  protected readonly onlyLeadingIcon: Signal<boolean> = computed(() => this.showLeadingIcon() && !this.showTrailingIcon());

  protected readonly onlyTrailingIcon: Signal<boolean> = computed(() => this.showTrailingIcon() && !this.showLeadingIcon());

  /**
   * Blocks activation while disabled or loading, since `aria-disabled` does not
   * prevent the native `<button>` from dispatching click events.
   */
  protected onClick(event: MouseEvent): void {
    if (this.blocked()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
