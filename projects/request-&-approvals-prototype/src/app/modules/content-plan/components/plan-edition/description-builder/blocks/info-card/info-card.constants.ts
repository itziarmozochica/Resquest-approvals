import { ACCENT_FALLBACK_HEX, SHARED_ACCENT_PRESETS } from '../_shared/color.utils';
import { DescriptionColorConfig } from '../_shared/field-contract.types';

/** Maximum number of cards the editor permits per info-card block. */
export const INFO_CARD_MAX = 6;

export const INFO_CARD_ACCENT_DEFAULT_HEX = ACCENT_FALLBACK_HEX;

export const INFO_CARD_ACCENT_PRESETS = SHARED_ACCENT_PRESETS;

/** Accent picker config for the card color field in the translations editor. */
export const ACCENT_COLOR_CONFIG: DescriptionColorConfig = {
  defaultHex: INFO_CARD_ACCENT_DEFAULT_HEX,
  presets: INFO_CARD_ACCENT_PRESETS,
};
