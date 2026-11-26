import { TicketTimeGranularity } from '../../models/order/ticket-time-granularity.enum';
import { SessionSelectorType } from './session-selector-type.enum';

export const SESSION_SELECTOR_TYPE_BOOKING_TIME_GRANULARITY: Record<SessionSelectorType, TicketTimeGranularity> = {
  [SessionSelectorType.BY_DATE]: TicketTimeGranularity.DATE,
  [SessionSelectorType.BY_DATE_AND_TIME]: TicketTimeGranularity.DATE_AND_TIME,
  [SessionSelectorType.BY_TIMELESS_SESSION]: TicketTimeGranularity.ANYTIME,
  [SessionSelectorType.BY_SESSION_SINGLE_DATE]: TicketTimeGranularity.DATE,
  [SessionSelectorType.BY_LABEL_EXPLODE_PIPE]: TicketTimeGranularity.DATE,
  [SessionSelectorType.BY_DATE_TIME_SEATING_MAP]: TicketTimeGranularity.DATE_AND_TIME,
  [SessionSelectorType.BY_FREE_SELECTION_MAP]: TicketTimeGranularity.DATE_AND_TIME,
  [SessionSelectorType.BY_TICKET_NUMBER_FREE_SELECTION_MAP]: TicketTimeGranularity.DATE_AND_TIME,
  [SessionSelectorType.BY_FULL_BSA_DATE_SEATING_MAP]: TicketTimeGranularity.DATE,
  [SessionSelectorType.BY_FULL_BSA_DATE_TIME_SEATING_MAP]: TicketTimeGranularity.DATE_AND_TIME,
};
