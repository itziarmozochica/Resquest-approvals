import { DescriptionFieldContract } from '../_shared/field-contract.types';
import { SHARED_BLOCK_I18N } from '../_shared/shared.i18n-keys';
import { IMAGE_GRID_I18N } from './image-grid.i18n-keys';

/** ORDERED translatable fields per grid item — the order drives the translations UI. */
export const IMAGE_GRID_FIELDS: DescriptionFieldContract = {
  rootFields: [],
  items: {
    propsKey: 'items',
    groupLabelKey: SHARED_BLOCK_I18N.cardLabel,
    fields: [
      { field: 'src', kind: 'image', labelKey: SHARED_BLOCK_I18N.uploadImage, required: true },
      {
        field: 'title',
        kind: 'input',
        labelKey: IMAGE_GRID_I18N.titleField,
        required: true,
        placeholderKey: IMAGE_GRID_I18N.titleFieldPlaceholder,
      },
      {
        field: 'body',
        kind: 'rich-text',
        labelKey: SHARED_BLOCK_I18N.body,
        required: true,
        placeholderKey: SHARED_BLOCK_I18N.bodyPlaceholder,
        editorLabelKey: IMAGE_GRID_I18N.editBody,
      },
    ],
  },
};
