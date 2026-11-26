/**
 * Mirrors fever2's `b2b.domain.order.cancellation.RefundReason`, the B2B-side vocabulary every
 * refund is recorded against. Kept whole and in its own names so a code read off an order and a
 * code sent with a refund are the same value; fever2 maps it to `payment`'s prefixed twin itself.
 *
 * FeverZone only ever displayed these before, by gluing the raw string onto a translation key in
 * the order history panel, so there was no type to reuse. Widening that panel to this type is a
 * separate change: it is display-only and takes whatever the backend sends, including codes this
 * enum may not have yet.
 */
export const refundReasons = {
  BAD_UX: 'bad_ux',
  BAD_UX_EVENT_NOT_HAPPENED: 'bad_ux_event_not_happened',
  BAD_UX_INCIDENCE_AT_EVENT: 'bad_ux_incidence_at_event',
  BOX_OFFICE_EXCEPTION: 'box_office_exception',
  BUG: 'bug',
  BY_REMOTE_PROVIDER: 'by_remote_provider',
  CANCELLATION_VOUCHER_NOT_USED: 'cancellation_voucher_not_used',
  CAPACITY_ISSUE: 'capacity_issue',
  CARDING: 'carding',
  CONDITIONS_CHANGED: 'conditions_changed',
  DEFAULT_TICKET: 'default_ticket',
  DEPOSIT_REFUND: 'deposit_refund',
  DISPUTED_ACCEPTED: 'disputed_accepted',
  DISPUTED_LOST: 'disputed_lost',
  DOUBLE_PURCHASE: 'double_purchase',
  EMPTY: 'empty',
  EVENT_ALREADY_PASSED: 'event_already_passed',
  EVENT_DATE_CHANGED: 'event_date_changed',
  EVENT_LESS_48H: 'event_less_48h',
  EVENT_MORE_48H: 'event_more_48h',
  EXCEPTION_OUT_OF_POLICY: 'exception_out_of_policy',
  FEVER_HUMAN_MISTAKE: 'fever_human_mistake',
  FEVER_TEST: 'fever_test',
  FEVER_WORSE_CONDITIONS: 'fever_worse_conditions',
  GOLD_USER: 'gold_user',
  LEGAL_PERMITS_ISSUE: 'legal_permits_issue',
  LOW_SALES: 'low_sales',
  NO_REFUND: 'no_refund',
  ONSITE_ISSUE: 'onsite_issue',
  OTHER: 'other',
  PARTNER_NO_NOTIFICATION: 'partner_no_notification',
  PARTNER_NOTIFICATION_LESS_24H: 'partner_notification_less_24h',
  PARTNER_NOTIFICATION_MORE_24H: 'partner_notification_more_24h',
  PARTNER_VENUE_DECISION: 'partner_venue_decision',
  PLAN_DEACTIVATED: 'plan_deactivated',
  PLAN_DESCRIPTION_CHANGED: 'plan_description_changed',
  PREMIUM_REFUND_POLICY: 'premium_refund_policy',
  PROACTIVE_COMMS: 'proactive_comms',
  PURCHASED_LESS_24H: 'purchased_less_24h',
  RESCHEDULE: 'reschedule',
  SELF_EXCHANGE: 'self_exchange',
  SELF_EXCHANGE_COUPON_GENERATION: 'self_exchange_coupon_generation',
  SELF_EXCHANGE_SELF_SERVICE_COUPON_GENERATION: 'self_exchange_self_service_coupon_generation',
  SELF_EXCHANGE_SELF_SERVICE_REFUND: 'self_exchange_self_service_refund',
  SOCIAL_MEDIA_PUBLIC_COMPLAINT: 'social_media_public_complaint',
  USER_MISTAKE: 'user_mistake',
  WEATHER: 'weather',
  WITHIN_POLICY: 'within_policy',
} as const;

export type RefundReason = (typeof refundReasons)[keyof typeof refundReasons];
