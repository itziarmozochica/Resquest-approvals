import { InvitationGuestGroup } from '../invitation/invitation-guest-group.enum';
import { InvitationNotificationType } from '../invitation/invitation-notification-type.enum';

export class InvitationGuest {
  constructor(
    public id: string,
    public firstName: string,
    public email: string,
    public notificationType: InvitationNotificationType = InvitationNotificationType.COMBINED_PDF,
    public sessionId: number,
    public numberOfTickets: number,
    public lastName?: string,
    public seats?: Array<string>,
    public businessEntityId?: string,
    public requestor?: string,
    public guestGroup?: InvitationGuestGroup,
  ) {}
}
