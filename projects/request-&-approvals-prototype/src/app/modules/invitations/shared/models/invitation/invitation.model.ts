import { BaseErrorResponse } from '@fz-original/app/shared/models/base-response';

import { InvitationGuestGroup } from './invitation-guest-group.enum';
import { InvitationNotificationType } from './invitation-notification-type.enum';
import { InvitationStatus } from './invitation-status.enum';

export interface InvitationResponseData {
  invitations?: InvitationData[];
}

export interface InvitationData {
  created_at: string;
  error: BaseErrorResponse;
  first_name: string;
  id: string;
  last_name: string;
  notification_type: InvitationNotificationType;
  recipient_email: string;
  status: InvitationStatus;
  tickets: InvitationDataTicket[];
  b2b_business_name?: string;
  email_requested?: boolean;
  guest_group?: string;
  requester?: InvitationRequesterData;
  requestor?: string;
}

export interface InvitationDeliveryStatusData {
  delivery_status: string;
}

export interface InvitationRequesterData {
  email: string;
  id: number;
  name: string;
  username: string;
}

export interface InvitationDataTicket {
  ends_at: string;
  number_of_tickets: number;
  seats_to_assign: null | string[];
  session_id: number;
  session_label: null | string;
  starts_at: string;
  ticket_id: null | number;
}

export interface InvitationTicket {
  id: null | number;
  numberOfTickets: number;
  seats: null | string[];
  sessionEndsAt: string;
  sessionId: number;
  sessionName: null | string;
  sessionStartsAt: string;
}

export interface CreateInvitationRequestBody {
  cart_id: string;
  first_name: string;
  notification_type: InvitationNotificationType;
  recipient_email: string;
  business_entity_id?: string;
  guest_group?: InvitationGuestGroup;
  last_name?: string;
  requestor?: string;
}

export class Invitation {
  constructor(
    public id: string,
    public firstName: string,
    public email: string,
    public status: InvitationStatus,
    public createdAt: string,
    public notificationType: InvitationNotificationType,
    public tickets: InvitationTicket[],
    public lastName?: string,
    public error?: BaseErrorResponse | null,
    public sessionTimezone?: string,
    public sessionAddress?: string,
    public requester?: InvitationRequesterData,
    public emailRequested?: boolean,
    public b2bBusinessName?: string,
    public guestGroup?: InvitationGuestGroup,
    public requestor?: string,
  ) {}

  getFullName(): string {
    if (!this.firstName) {
      return 'Guest';
    }
    let fullname: string = this.firstName;
    if (this.lastName) {
      fullname += ' ' + this.lastName;
    }
    return fullname;
  }

  getInvitationDisplayState(): string {
    switch (this.status) {
      case InvitationStatus.SUCCESS:
        return 'positive';
      case InvitationStatus.OPEN:
      case InvitationStatus.IN_PROGRESS:
        return 'warning';
      case InvitationStatus.ERROR:
      case InvitationStatus.NOTIFICATION_FAILED:
      case InvitationStatus.CANCELLED:
        return 'danger';
      default:
        return 'error';
    }
  }

  getInvitationDisplayStateName(): string {
    switch (this.status) {
      case InvitationStatus.SUCCESS:
        return 'generated';
      case InvitationStatus.OPEN:
      case InvitationStatus.IN_PROGRESS:
        return 'pending';
      case InvitationStatus.ERROR:
      case InvitationStatus.NOTIFICATION_FAILED:
        return 'error';
      case InvitationStatus.CANCELLED:
        return 'cancelled';
      default:
        return 'error';
    }
  }

  getStartDate(): string {
    return this.tickets[0].sessionStartsAt;
  }

  getTicketIds(): number[] {
    return this.tickets
      .map((ticket: InvitationTicket) => ticket.id)
      .filter((ticketId: null | number): ticketId is number => ticketId !== null && ticketId !== undefined);
  }

  getTotalNumberOfTickets(): number {
    return this.tickets.reduce((acc: number, ticket: InvitationTicket) => acc + ticket.numberOfTickets, 0);
  }

  hasNoValidSessionNames(): boolean {
    return this.tickets.every((ticket: InvitationTicket) => ticket.sessionName === undefined || ticket.sessionName === null);
  }

  hasSeats(): boolean {
    return this.tickets.some((ticket: InvitationTicket) => (ticket.seats?.length ?? 0) > 0);
  }

  hasValidTicketIds(): boolean {
    return this.tickets.every((ticket: InvitationTicket) => ticket.id !== undefined && ticket.id !== null);
  }
}
