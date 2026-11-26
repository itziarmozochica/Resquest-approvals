import { OrderPartnerCancellationReason } from '../../../../models/order/order-cancellation-record.model';
import { ReimbursementType } from '../../../../models/order/reimbursement-type.enum';
import { TimelineItemModel } from '../../../timeline/models/timeline-item.model';
import { RefundDetailsSummary } from './refund-details-summary.model';
import { TicketItemSummary } from './ticket-item-summary.model';
import { UserNotificationSummary } from './user-notification-summary.model';

export interface OrderCancellationHistoryTimelineItem extends TimelineItemModel {
  allTicketsHaveSameOwner: boolean;
  cancellationCouponType: string | null;
  cancellationReason: string | null;
  comments: string | null;
  hasCancellationInsuranceComment: boolean;
  isCoveredByCancellationInsurance: boolean;
  isCoveredByFever: boolean;
  showsNeutralReason: boolean;
  isPostCancellationRefund: boolean;
  partnerCancellationReason: OrderPartnerCancellationReason | null;
  refundDetailsSummary: RefundDetailsSummary | null;
  refundReason: string | null;
  reimbursementType: ReimbursementType | null;
  requesterEmail: string | null;
  ticketsSummary: TicketItemSummary[];
  userNotificationsSummary: UserNotificationSummary[];
}
