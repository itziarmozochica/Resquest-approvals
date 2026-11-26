import { refundReasons, type RefundReason } from '@fz-original/app/shared/models/order/refund-reason.model';

/**
 * Every code fever2 records a refund against, offered in full rather than as a shortlist. The five
 * a partner reaches for most come first; the rest follow alphabetically by label so a list this long
 * stays scannable, with "Other" last.
 *
 * Whatever is chosen here is recorded against the refund like any other, so it has to be a value
 * fever2 already knows, which is why this is ordered from the shared vocabulary rather than being a
 * list of its own.
 */
export const partialRefundReasonOrder = [
  refundReasons.ONSITE_ISSUE,
  refundReasons.CONDITIONS_CHANGED,
  refundReasons.CAPACITY_ISSUE,
  refundReasons.WEATHER,
  refundReasons.PARTNER_VENUE_DECISION,
  refundReasons.BAD_UX,
  refundReasons.BOX_OFFICE_EXCEPTION,
  refundReasons.BY_REMOTE_PROVIDER,
  refundReasons.CANCELLATION_VOUCHER_NOT_USED,
  refundReasons.EVENT_LESS_48H,
  refundReasons.EVENT_MORE_48H,
  refundReasons.SELF_EXCHANGE_SELF_SERVICE_REFUND,
  refundReasons.SELF_EXCHANGE_SELF_SERVICE_COUPON_GENERATION,
  refundReasons.SELF_EXCHANGE,
  refundReasons.SELF_EXCHANGE_COUPON_GENERATION,
  refundReasons.USER_MISTAKE,
  refundReasons.DEFAULT_TICKET,
  refundReasons.PLAN_DEACTIVATED,
  refundReasons.PLAN_DESCRIPTION_CHANGED,
  refundReasons.EVENT_DATE_CHANGED,
  refundReasons.BAD_UX_EVENT_NOT_HAPPENED,
  refundReasons.EVENT_ALREADY_PASSED,
  refundReasons.DEPOSIT_REFUND,
  refundReasons.DISPUTED_ACCEPTED,
  refundReasons.DISPUTED_LOST,
  refundReasons.DOUBLE_PURCHASE,
  refundReasons.EXCEPTION_OUT_OF_POLICY,
  refundReasons.FEVER_HUMAN_MISTAKE,
  refundReasons.FEVER_WORSE_CONDITIONS,
  refundReasons.FEVER_TEST,
  refundReasons.CARDING,
  refundReasons.GOLD_USER,
  refundReasons.BAD_UX_INCIDENCE_AT_EVENT,
  refundReasons.LEGAL_PERMITS_ISSUE,
  refundReasons.LOW_SALES,
  refundReasons.NO_REFUND,
  refundReasons.EMPTY,
  refundReasons.PARTNER_NO_NOTIFICATION,
  refundReasons.PARTNER_NOTIFICATION_LESS_24H,
  refundReasons.PARTNER_NOTIFICATION_MORE_24H,
  refundReasons.PREMIUM_REFUND_POLICY,
  refundReasons.PROACTIVE_COMMS,
  refundReasons.SOCIAL_MEDIA_PUBLIC_COMPLAINT,
  refundReasons.PURCHASED_LESS_24H,
  refundReasons.RESCHEDULE,
  refundReasons.BUG,
  refundReasons.WITHIN_POLICY,
  refundReasons.OTHER,
] as const satisfies readonly RefundReason[];

export type PartialRefundReason = (typeof partialRefundReasonOrder)[number];
