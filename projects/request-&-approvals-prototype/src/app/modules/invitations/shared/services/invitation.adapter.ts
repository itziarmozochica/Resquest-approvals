import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { LinkPaginationResponse } from '../../../../shared/models/link-pagination-response';
import { InvitationGuestGroup } from '../models/invitation/invitation-guest-group.enum';
import {
  Invitation,
  InvitationData,
  InvitationDataTicket,
  InvitationResponseData,
  InvitationTicket,
} from '../models/invitation/invitation.model';

@Injectable({
  providedIn: 'root',
})
export class InvitationAdapter implements AdapterInterface<LinkPaginationResponse<Invitation[]>> {
  fromApi(response: HttpResponse<BaseResponse<InvitationResponseData>>): LinkPaginationResponse<Invitation[]> {
    const body = response.body;
    if (!body) {
      throw new Error('Unexpected null response body from invitations API');
    }
    return new LinkPaginationResponse<Invitation[]>(response.headers.get('Link'), this.#getData(body.data), this.#getError(body.error));
  }

  #getData(data: { invitations?: InvitationData[] } | null | undefined): Invitation[] | null {
    let invitations: Invitation[] | null = null;
    if (data != null && data.invitations !== undefined) {
      invitations = data.invitations.map((invitation: InvitationData) => {
        return new Invitation(
          invitation.id,
          invitation.first_name,
          invitation.recipient_email,
          invitation.status,
          invitation.created_at,
          invitation.notification_type,
          this.#getTickets(invitation),
          invitation.last_name,
          invitation.error ? { code: invitation.error.code, message: invitation.error.message } : null,
          undefined,
          undefined,
          invitation.requester,
          invitation.email_requested ?? false,
          invitation.b2b_business_name,
          invitation.guest_group as InvitationGuestGroup | undefined,
          invitation.requestor,
        );
      });
    }
    return invitations;
  }

  #getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  #getTickets(invitation: InvitationData): InvitationTicket[] {
    return invitation.tickets.map((ticket: InvitationDataTicket) => {
      return {
        id: ticket.ticket_id,
        numberOfTickets: ticket.number_of_tickets,
        seats: ticket.seats_to_assign,
        sessionEndsAt: ticket.ends_at,
        sessionId: ticket.session_id,
        sessionName: ticket.session_label,
        sessionStartsAt: ticket.starts_at,
      };
    });
  }
}
