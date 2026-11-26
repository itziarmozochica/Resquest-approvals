import type { IgntIconName, IgntIconVariant } from '@ignite/icon';

/**
 * Supported visual variants for the pill component.
 */
export type IgntPillType = 'primary' | 'secondary';

/**
 * Configuration for the default trailing icon shown inside the pill.
 */
export interface IgntPillIcon {
  name: IgntIconName;
  variant: IgntIconVariant;
}
