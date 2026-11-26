import { SessionType, SessionTypeGroup } from '@fz-original/app/shared/services/sessions/session-type.model';

export interface CrossEventBulkEditTicketType {
  groupName: string;
  id: number;
  label: string;
  planId: number;
  planName: string;
}

export interface CrossEventBulkEditLoadedInventory {
  sessionTypeGroups: SessionTypeGroup[];
  sessionTypes: SessionType[];
  ticketTypes: CrossEventBulkEditTicketType[];
}

export interface CrossEventBulkEditTicketTypePlan {
  id: number;
  name: string;
}

export interface CrossEventBulkEditTicketTypeRow {
  groupName: string;
  key: string;
  label: string;
  plans: CrossEventBulkEditTicketTypePlan[];
  sessionTypeIds: number[];
}

export type CrossEventBulkEditTicketTypeSortColumn = 'appearsIn' | 'group';
