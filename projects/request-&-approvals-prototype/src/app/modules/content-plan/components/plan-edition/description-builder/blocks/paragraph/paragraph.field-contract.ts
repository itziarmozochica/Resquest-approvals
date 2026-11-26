import { DescriptionFieldContract } from '../_shared/field-contract.types';
import { SHARED_BLOCK_I18N } from '../_shared/shared.i18n-keys';
import { PARAGRAPH_I18N } from './paragraph.i18n-keys';

/** ORDERED translatable fields — the order drives the translations UI. */
export const PARAGRAPH_FIELDS: DescriptionFieldContract = {
  rootFields: [
    {
      field: 'text',
      kind: 'rich-text',
      labelKey: SHARED_BLOCK_I18N.text,
      required: true,
      placeholderKey: PARAGRAPH_I18N.textPlaceholder,
      editorLabelKey: PARAGRAPH_I18N.editText,
    },
  ],
};
