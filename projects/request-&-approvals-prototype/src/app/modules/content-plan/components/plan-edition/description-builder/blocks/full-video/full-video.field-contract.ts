import { DescriptionFieldContract } from '../_shared/field-contract.types';
import { SHARED_BLOCK_I18N } from '../_shared/shared.i18n-keys';

/** The video is localizable (per-market clip). The picker accepts video files only. */
export const FULL_VIDEO_FIELDS: DescriptionFieldContract = {
  rootFields: [{ field: 'src', kind: 'video', labelKey: SHARED_BLOCK_I18N.uploadVideo, required: true }],
};
