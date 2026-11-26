import type { IgntIconName, IgntIconVariant } from '@ignite/icon';

/**
 * Emphasis tier of the button (Figma `variant`): filled, outlined, or text-only.
 */
export type IgntButtonVariant = 'primary' | 'secondary' | 'tertiary';

/**
 * Colour intent of the button (Figma `sentiment`).
 */
export type IgntButtonSentiment = 'brand' | 'danger' | 'neutral' | 'positive';

/**
 * Physical size of the button (Figma `size`).
 */
export type IgntButtonSize = 'large' | 'small';

/**
 * Native `type` attribute forwarded to the rendered `<button>` element.
 */
export type IgntButtonHtmlType = 'button' | 'reset' | 'submit';

/**
 * Configuration for an icon shown before or after the button label.
 */
export interface IgntButtonIcon {
  name: IgntIconName;
  variant: IgntIconVariant;
}
