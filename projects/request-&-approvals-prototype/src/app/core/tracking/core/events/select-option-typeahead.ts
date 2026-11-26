import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export enum SelectOptionTypeaheadEventType {
  click = 'click',
  enter = 'enter',
}

export enum SelectOptionTypeaheadInput {
  city = 'city',
  plan = 'plan',
  venue = 'venue',
  channel = 'channel',
  business = 'business',
  partner = 'partner',
}

export enum ScreenTypeaheadInput {
  salesAndControl = 'sales-control',
  dashboard = 'dashboard',
  attendeesList = 'attendees-list',
  seatingManagement = 'seating-management',
  reviews = 'reviews',
  boxOffice = 'box-office',
  contentPlan = 'content-plan',
  bundles = 'bundles',
  inventory = 'inventory',
  invitations = 'invitations',
  capacity = 'capacity',
  pricing = 'pricing',
  sessions = 'sessions',
  channels = 'channels',
  sessionPerTimeslot = 'session-per-timeslot',
  sessionSchedule = 'session-schedule',
  makeReservation = 'make-reservation',
  orders = 'orders',
  ordersBulkReschedule = 'orders-bulk-reschedule',
  shifts = 'shifts',
  kiosk = 'kiosk',
  oboSettings = 'obo-settings',
  reservationOnBehalf = 'reservation-on-behalf',
  accessControl = 'access-control',
  winnerSelection = 'winner-selection',
}

export interface SelectOptionTypeaheadData {
  selectedOption?: string;
  typed: string;
  event: SelectOptionTypeaheadEventType;
  inputType: SelectOptionTypeaheadInput;
  screen?: ScreenTypeaheadInput;
}

export class SelectOptionTypeaheadEvent extends TrackingEvent<any> {
  constructor(readonly data: any) {
    super(TrackingEvents.SelectOptionTypeahead, data);
  }
}
