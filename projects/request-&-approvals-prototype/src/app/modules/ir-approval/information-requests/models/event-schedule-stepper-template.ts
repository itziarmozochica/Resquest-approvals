import { ServiceCatalogCustomField } from '@fz-original/app/modules/admin-project-management-settings/models/service-catalog.model';

import { InformationRequestQuestionType } from './information-request-question.model';
import { StepperTemplate } from './stepper-template.model';

export const EVENT_SCHEDULE_TEMPLATE_KEY = 'event-schedule-default';

const customFields: ServiceCatalogCustomField[] = [
  {
    id: 'range-name',
    label: 'Range name',
    type: InformationRequestQuestionType.TEXT,
    section: 'range-basics',
    order: 0,
    required: true,
  },
  {
    id: 'range-start',
    label: 'Start date',
    type: InformationRequestQuestionType.DATE,
    section: 'range-basics',
    order: 1,
    required: true,
  },
  {
    id: 'range-end',
    label: 'End date',
    type: InformationRequestQuestionType.DATE,
    section: 'range-basics',
    order: 2,
    required: true,
  },
  {
    id: 'venue',
    label: 'Venue',
    type: InformationRequestQuestionType.VENUE,
    section: 'venue',
    order: 0,
    required: true,
  },
  {
    id: 'ticket-types',
    label: 'Ticket types',
    type: InformationRequestQuestionType.TICKET_TYPES,
    section: 'tickets',
    order: 0,
    required: true,
  },
  {
    id: 'weekdays',
    label: 'Available weekdays',
    type: InformationRequestQuestionType.MULTIPICKLIST,
    section: 'weekdays',
    order: 0,
    required: true,
    options: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
  },
];

export const EVENT_SCHEDULE_TEMPLATE: StepperTemplate = {
  key: EVENT_SCHEDULE_TEMPLATE_KEY,
  label: 'Event schedule',
  multiInstance: true,
  customFields,
  layout: {
    version: 1,
    sections: [
      {
        title: 'Range basics',
        rows: [{ columns: [['range-name'], ['range-start'], ['range-end']] }],
      },
      {
        title: 'Venue',
        rows: [{ columns: [['venue']] }],
      },
      {
        title: 'Tickets & prices',
        rows: [{ columns: [['ticket-types']] }],
      },
      {
        title: 'Weekdays & sessions',
        rows: [{ columns: [['weekdays']] }],
      },
    ],
  },
};
