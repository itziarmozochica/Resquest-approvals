import { SHARED_ACCENT_PRESETS } from '../_shared/color.utils';
import { DescriptionColorConfig } from '../_shared/field-contract.types';

/**
 * Maximum number of tabs the editor permits per tabs block. Also bounds the
 * CSS-only activation rules the export emits (one selector per index), so
 * editor cap and exported CSS can never drift apart.
 */
export const TABS_MAX = 6;

export const TABS_BAR_COLOR_DEFAULT_HEX = '#002737';

export const TABS_BAR_COLOR_PRESETS = [TABS_BAR_COLOR_DEFAULT_HEX, ...SHARED_ACCENT_PRESETS];

/** Color picker config for the tab-bar color field in the translations editor. */
export const TAB_BAR_COLOR_CONFIG: DescriptionColorConfig = {
  defaultHex: TABS_BAR_COLOR_DEFAULT_HEX,
  presets: TABS_BAR_COLOR_PRESETS,
};
