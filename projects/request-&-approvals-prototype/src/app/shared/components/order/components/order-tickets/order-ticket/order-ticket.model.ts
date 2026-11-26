export interface OrderTicket {
  breakdownItems: OrderTicketBreakdownItem[];
  code: TicketCode | null;
  isCancelled: boolean;
  nominativeFirstName: string | null;
  nominativeLastName: string | null;
  referenceId: string;
  seat: AssignedSeat | null;
  validatedStatus: OrderTicketValidationStatus;
}

export type OrderTicketValidationStatus = 'validated' | 'not_validated' | 'partially_validated';

export interface OrderTicketBreakdownItem {
  code: TicketCode | null;
  isValidated: boolean;
  label: string;
  nominativeFirstName: string | null;
  nominativeLastName: string | null;
  seat: AssignedSeat | null;
}

export interface TicketCode {
  code: string;
  id: number;
  imageUrl: string | null;
  isValidated: boolean;
  redeemedAt: string | null;
  sessionLabel: string | null;
  status: string;
  type: string;
  validity: CodeValidity | null;
}

export interface CodeValidity {
  activationDate: string | null;
  expiryDate: string | null;
}

export interface AssignedSeat {
  id: number;
  label: string;
  seatingProvider: string;
}
