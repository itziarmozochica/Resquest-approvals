import { DescriptionFieldContract } from '../_shared/field-contract.types';
import { SHARED_BLOCK_I18N } from '../_shared/shared.i18n-keys';
import { ACCENT_COLOR_CONFIG } from './info-card.constants';
import { INFO_CARD_I18N } from './info-card.i18n-keys';

/** ORDERED fields per card — the order drives the translations UI (structural fields like `highlighted` are skipped there). */
export const INFO_CARD_FIELDS: DescriptionFieldContract = {
  rootFields: [],
  items: {
    propsKey: 'cards',
    groupLabelKey: SHARED_BLOCK_I18N.cardLabel,
    fields: [
      { field: 'imageSrc', kind: 'image', labelKey: SHARED_BLOCK_I18N.uploadImage, required: false },
      {
        field: 'heading',
        kind: 'input',
        labelKey: INFO_CARD_I18N.heading,
        required: true,
        placeholderKey: INFO_CARD_I18N.headingPlaceholder,
      },
      { field: 'price', kind: 'input', labelKey: INFO_CARD_I18N.price, required: true, placeholderKey: INFO_CARD_I18N.pricePlaceholder },
      {
        field: 'ctaLabel',
        kind: 'input',
        labelKey: INFO_CARD_I18N.buttonLabel,
        required: true,
        placeholderKey: INFO_CARD_I18N.buttonLabelPlaceholder,
      },
      { field: 'accentColor', kind: 'color', labelKey: INFO_CARD_I18N.accentColor, required: true, color: ACCENT_COLOR_CONFIG },
      {
        field: 'badge',
        kind: 'input',
        labelKey: INFO_CARD_I18N.badge,
        required: false,
        placeholderKey: INFO_CARD_I18N.badgePlaceholder,
      },
      {
        field: 'bulletPointsText',
        kind: 'textarea',
        labelKey: INFO_CARD_I18N.bulletPoints,
        required: true,
        placeholderKey: INFO_CARD_I18N.bulletPointsPlaceholder,
      },
      { field: 'highlighted', kind: 'structural', labelKey: INFO_CARD_I18N.highlightCard, required: false, translatable: false },
    ],
  },
};
