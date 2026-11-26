import { DescriptionFieldContract } from '../_shared/field-contract.types';
import { SPACER_I18N } from './spacer.i18n-keys';

/** The spacer's only field is its structural height — not translatable, so the translations editor skips it. */
export const SPACER_FIELDS: DescriptionFieldContract = {
  rootFields: [{ field: 'size', kind: 'structural', labelKey: SPACER_I18N.height, required: true, translatable: false }],
};
