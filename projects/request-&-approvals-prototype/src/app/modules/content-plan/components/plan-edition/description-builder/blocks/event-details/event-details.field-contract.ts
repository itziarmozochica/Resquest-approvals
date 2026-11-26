import { DescriptionFieldContract } from '../_shared/field-contract.types';
import { EVENT_DETAILS_I18N } from './event-details.i18n-keys';

/** ORDERED translatable fields — the order drives the translations UI. */
export const EVENT_DETAILS_FIELDS: DescriptionFieldContract = {
  rootFields: [
    {
      field: 'heading',
      kind: 'input',
      labelKey: EVENT_DETAILS_I18N.sectionHeading,
      required: true,
      placeholderKey: EVENT_DETAILS_I18N.sectionHeadingPlaceholder,
    },
    {
      field: 'locationLine',
      kind: 'input',
      labelKey: EVENT_DETAILS_I18N.locationLine,
      required: true,
      placeholderKey: EVENT_DETAILS_I18N.locationLinePlaceholder,
    },
    {
      field: 'datesLine',
      kind: 'input',
      labelKey: EVENT_DETAILS_I18N.datesLine,
      required: true,
      placeholderKey: EVENT_DETAILS_I18N.datesLinePlaceholder,
    },
    {
      field: 'promo',
      kind: 'textarea',
      labelKey: EVENT_DETAILS_I18N.promotionalText,
      required: true,
      placeholderKey: EVENT_DETAILS_I18N.promotionalTextPlaceholder,
    },
  ],
};
