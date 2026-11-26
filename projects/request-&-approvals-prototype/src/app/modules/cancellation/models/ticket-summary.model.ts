import {
  AssignedSeat,
  TicketCode,
} from '@fz-original/app/shared/components/order/components/order-tickets/order-ticket/order-ticket.model';
import { TicketMainStatus } from '@fz-original/app/shared/components/order/components/order-tickets/order-ticket/ticket-main-status.enum';
import { Money } from '@fz-original/app/shared/models/money.model';

export interface BreakdownItem {
  code: TicketCode | null;
  isValidated: boolean;
  label: string;
  seat: AssignedSeat | null;
  nominativeFirstName?: string | null;
  nominativeLastName?: string | null;
}

export type CancellableItemValidationStatus = 'validated' | 'not_validated' | 'partially_validated';

export interface CancellableItem {
  breakdownItems: BreakdownItem[];
  code: TicketCode | null;
  isCancelled: boolean;
  manualRefundAmount: Money;
  nominativeFirstName: string | null;
  nominativeLastName: string | null;
  orderItemIds: number[];
  referenceId: string;
  seat: AssignedSeat | null;
  validatedStatus: CancellableItemValidationStatus;
}

export interface TicketSummary {
  cancellableItems: CancellableItem[];
  mainStatus: TicketMainStatus;
  ticketId: number;
  ticketTypeLabel: string;
  totalCount: number;
  validatedCount: number;
}

export interface SelectedCancellableItems {
  selectedItems: CancellableItem[];
  ticketId: number;
}

export function hasCancelledItems(summary: TicketSummary): boolean {
  return summary.cancellableItems.some(i => i.isCancelled);
}

export function hasLiveItems(summary: TicketSummary): boolean {
  return summary.cancellableItems.some(i => !i.isCancelled);
}
