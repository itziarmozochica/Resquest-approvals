import { BlockDefinition } from '../block-definition';
import { eventDetailsPropsFromDto, eventDetailsPropsToDto } from './event-details.dto';
import { EVENT_DETAILS_FIELDS } from './event-details.field-contract';
import { EVENT_DETAILS_I18N } from './event-details.i18n-keys';

export const EVENT_DETAILS_BLOCK: BlockDefinition<'eventDetails'> = {
  type: 'eventDetails',
  icon: 'badge',
  labelKey: EVENT_DETAILS_I18N.componentLabel,
  createDefaultProps: () => ({
    heading: '',
    locationLine: '',
    datesLine: '',
    promo: '',
  }),
  dtoType: 'event_details',
  fromDto: eventDetailsPropsFromDto,
  toDto: eventDetailsPropsToDto,
  fields: EVENT_DETAILS_FIELDS,
};
