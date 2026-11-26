import { DescriptionFieldContract } from '../_shared/field-contract.types';
import { SHARED_BLOCK_I18N } from '../_shared/shared.i18n-keys';

/** The image itself is localizable (per-market artwork). */
export const FULL_IMAGE_FIELDS: DescriptionFieldContract = {
  rootFields: [{ field: 'src', kind: 'image', labelKey: SHARED_BLOCK_I18N.uploadImage, required: true }],
};
