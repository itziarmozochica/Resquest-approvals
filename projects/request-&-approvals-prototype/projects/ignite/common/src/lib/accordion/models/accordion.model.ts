import type { IgntIconName, IgntIconSize, IgntIconVariant } from '@ignite/icon';

/** Visual treatment of an accordion group, shared by every item it contains. */
export type IgntAccordionVariant = 'band' | 'card' | 'list' | 'panel' | 'plain';

/** Chevron affordance an accordion item renders, resolved from the group's variant. */
export interface IgntAccordionChevron {
  /**
   * Icon shown while expanded. When set, the chevron swaps glyph instead of rotating and
   * `rotation` is expected to be `'0deg'` — only `panel` needs this, to match the legacy
   * expansion panel it replaces.
   */
  expandedName?: IgntIconName;
  /** Icon shown while collapsed, and while expanded unless `expandedName` overrides it. */
  name: IgntIconName;
  /** CSS angle applied to the chevron while the item is expanded. */
  rotation: string;
  size: IgntIconSize;
  variant: IgntIconVariant;
}
