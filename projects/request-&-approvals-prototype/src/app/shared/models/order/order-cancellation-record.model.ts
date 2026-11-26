import { Money } from '@fz-original/app/shared/models/money.model';
import { ReimbursementType } from '@fz-original/app/shared/models/order/reimbursement-type.enum';

export const cancellationInsuranceCancellationReason = 'cancellation_insurance';
export const cancellationInsuranceClaimCommentPattern = /^Cancellation insurance claim .+ approved by the provider$/;

export interface OrderCancelledTicketRecord {
  count: number;
  label: string;
  ticketId: number;
  cancellationCouponCode?: string | null;
  cancellationCouponAmount?: Money | null;
  cancellationCouponIsAvailable?: boolean | null;
  compensationCouponCode?: string | null;
  compensationCouponAmount?: Money | null;
  compensationCouponIsAvailable?: boolean | null;
  shouldNotify: boolean;
  notifiedAt: string | null;
  ticketOwner?: OrderTicketsOwner | null;
}

export interface OrderTicketsOwner {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullname: string;
  phoneNumber: string | null;
}

export interface OrderPartnerCancellationReason {
  key: string;
  label: string;
}

export interface OrderUserCancellationRecord {
  cancellationCouponCode: string | null;
  cancellationCouponType: string | null;
  cancellationGroupId: string;
  cancellationReason: string;
  partnerCancellationReason: OrderPartnerCancellationReason | null;
  refundReason: string;
  cancelledTickets: OrderCancelledTicketRecord[];
  comments: string;
  compensationCouponCode: string | null;
  createdAt: string;
  id: string;
  isPartnerVisible: boolean;
  isPostCancellationRefund: boolean;
  notifiedAt: string | null;
  reimbursementType: ReimbursementType | null;
  refundedAmount: Money | null;
  refundedAt: string | null;
  requesterEmail: string | null;
  ticketsOwner: OrderTicketsOwner | null;
}
