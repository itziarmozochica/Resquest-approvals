import { DescriptionFieldContract } from '../_shared/field-contract.types';
import { SHARED_BLOCK_I18N } from '../_shared/shared.i18n-keys';
import { TAB_BAR_COLOR_CONFIG } from './tabs.constants';
import { TABS_I18N } from './tabs.i18n-keys';

/** ORDERED translatable fields (root + per tab) — the order drives the translations UI. */
export const TABS_FIELDS: DescriptionFieldContract = {
  rootFields: [{ field: 'tabBarColor', kind: 'color', labelKey: TABS_I18N.tabBarColor, required: true, color: TAB_BAR_COLOR_CONFIG }],
  items: {
    propsKey: 'tabs',
    groupLabelKey: TABS_I18N.tabLabel,
    fields: [
      {
        field: 'label',
        kind: 'input',
        labelKey: TABS_I18N.label,
        required: true,
        placeholderKey: TABS_I18N.tabLabel,
        placeholderParamsForIndex: index => ({ index }),
      },
      {
        field: 'contentTitle',
        kind: 'input',
        labelKey: TABS_I18N.sectionHeading,
        required: false,
        placeholderKey: TABS_I18N.sectionHeadingPlaceholder,
      },
      {
        field: 'body',
        kind: 'rich-text',
        labelKey: SHARED_BLOCK_I18N.body,
        required: true,
        placeholderKey: SHARED_BLOCK_I18N.bodyPlaceholder,
        editorLabelKey: TABS_I18N.editBody,
      },
      { field: 'imageSrc', kind: 'image', labelKey: SHARED_BLOCK_I18N.uploadImage, required: false },
    ],
  },
};
