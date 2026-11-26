import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseResponse } from '../../../../shared/models/base-response';
import { Invitation, InvitationData, InvitationDataTicket, InvitationTicket } from '../models/invitation/invitation.model';

@Injectable({
  providedIn: 'root',
})
export class GetInvitationAdapter implements AdapterInterface<BaseResponse<Invitation>> {
  fromApi(response: any): BaseResponse<Invitation> {
    return new BaseResponse<Invitation>(this.getData(response.data), this.getError(response.error));
  }

  private getError(data: any): { code: string; message: string } | null {
    if (!data) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: any): Invitation | null {
    if (!data) {
      return null;
    }
    return new Invitation(
      data.id,
      data.first_name,
      data.recipient_email,
      data.status,
      data.created_at,
      data.notification_type,
      this.getTickets(data),
      data.last_name,
      data.error ? { code: data.error.code, message: data.error.message } : null,
      undefined,
      undefined,
      data.requester,
    );
  }

  private getTickets(invitation: InvitationData): InvitationTicket[] {
    return invitation.tickets.map((ticket: InvitationDataTicket) => {
      return {
        id: ticket.ticket_id,
        sessionId: ticket.session_id,
        sessionName: ticket.session_label,
        numberOfTickets: ticket.number_of_tickets,
        seats: ticket.seats_to_assign,
        sessionStartsAt: ticket.starts_at,
        sessionEndsAt: ticket.ends_at,
      };
    });
  }
}
