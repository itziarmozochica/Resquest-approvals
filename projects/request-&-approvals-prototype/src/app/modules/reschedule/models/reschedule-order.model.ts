import { UserInterfaceType } from '../../../shared/models/user/user-interface.enum';
import { Channel } from '../../../shared/services/session-availability/channel.enum';

export interface SessionItem {
  sessionId: number;
  ticketNumber: number;
}

export interface B2BUser {
  b2bUserId: number;
  b2bUserEmail: string;
  b2bUserName: string;
  b2bUserUsername: string;
  b2bUserInterface: UserInterfaceType;
}

export interface RescheduleOrder {
  sessions: SessionItem[];
  b2bUser: B2BUser;
  onsiteSetupId?: string;
}

export interface SessionItemDTO {
  session_id: number;
  ticket_number: number;
}

export interface OrderRescheduled {
  orderId: number | undefined;
  cartId: string | undefined;
}

export interface B2BUserDTO {
  b2b_user_id: number;
  b2b_user_email: string;
  b2b_user_name: string;
  b2b_user_username: string;
  b2b_user_interface: UserInterfaceType;
}

export interface RescheduleOrderDTO {
  sessions: SessionItemDTO[];
  b2b_user: B2BUserDTO;
  onsite_setup_id?: string;
}

export interface OrderRescheduledDTO {
  order_id: number;
  cart_id: string;
}

export interface RescheduleChannelConfig {
  channel: Channel;
  channelId: string;
  requiresOnsiteSetup: boolean;
  resolveFromOnsiteSetup?: boolean;
}
