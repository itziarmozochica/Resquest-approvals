import { DescriptionFieldContract } from '../_shared/field-contract.types';
import { SHARED_BLOCK_I18N } from '../_shared/shared.i18n-keys';
import { TITLE_I18N } from './title.i18n-keys';

/** ORDERED fields — the order drives the translations UI (structural fields are skipped there). */
export const TITLE_FIELDS: DescriptionFieldContract = {
  rootFields: [
    { field: 'text', kind: 'input', labelKey: SHARED_BLOCK_I18N.text, required: true, placeholderKey: TITLE_I18N.textPlaceholder },
    { field: 'level', kind: 'structural', labelKey: TITLE_I18N.headingLevel, required: true, translatable: false },
  ],
};
