import { EntitlementType } from '@fz-original/app/entitlements/models/entitlement.model';
import { PlanDiscountType } from '@fz-original/app/modules/box-office/memberships/models/memberships.model';
import { BookingQuestionNominativeTicketConfiguration } from '@fz-original/app/shared/booking-questions/models/booking-question-nominative-ticket-configuration';
import {
  CartAdjustmentPriceCalculation,
  CartAdjustmentPriceCalculationFinal,
  CartAdjustmentPriceData,
  CartAdjustmentPriceOperation,
} from '@fz-original/app/shared/cart/models/cart-adjustment-price.model';
import { CartSessionAdjustmentPriceData } from '@fz-original/app/shared/models/cart/cart-session.model';
import { PromotionPaidBy } from '@fz-original/app/shared/models/cart/promotion-paid-by.enum';
import { EntitlementStatus } from '@fz-original/app/shared/models/order/entitlements-info.model';
import { FiscalLineDTO } from '@fz-original/app/shared/models/order/fiscal-line.model';
import { PaymentNoteDTO } from '@fz-original/app/shared/models/order/payment-note.model';
import { ReferencePriceProvenance } from '@fz-original/app/shared/models/order/reference-price.model';
import { TicketTimeGranularity } from '@fz-original/app/shared/models/order/ticket-time-granularity.enum';

import { DiscountPaidBy } from '../../../models/cart/discount-paid-by.enum';
import { JourneyDTO } from '../../../models/journey/journey.dto';
import { OrderPendingModificationDTO } from '../../../models/order-pending-modification/order-pending-modification.dto';

interface MoneyDTO {
  amount: number;
  currency: string;
}

export interface OrderLoyaltyDTO {
  amount: number;
}

export interface TicketLoyaltyDTO {
  total_amount: number;
  unit_amount: number;
}

export interface BookingAnswerDTO {
  booking_question_id: string;
  code_id: number | null;
  id: number;
  main_plan_id?: number | null;
  ticket_index: number;
  value: Array<string>;
}

export interface BookingQuestionDTO {
  choices: Array<string>;
  id: string;
  label: string;
  message: string;
  nominative_ticket_configuration: BookingQuestionNominativeTicketConfiguration | null;
  type: string;
}

interface CouponDTO {
  code: string;
  discount: MoneyDTO;
  discount_paid_by: DiscountPaidBy;
  creation_purpose?: string;
}

interface CouponsDTO {
  discounts: Array<CouponDiscountDTO>;
  vouchers: Array<CouponDTO>;
}

interface CouponDiscountDTO {
  code: string;
  currency: string;
  discounts: Array<CouponDiscountItemDTO>;
}

interface CouponDiscountItemDTO {
  discount: number;
  discount_type: PlanDiscountType;
  session_type_id: number;
}

interface PromotionDTO {
  discount: MoneyDTO;
  discount_payer: PromotionPaidBy;
  name: string;
}

export interface CancellationInsurancePartnerShareDTO {
  price: MoneyDTO;
  unit_price: MoneyDTO;
}

export interface ReferencePriceDTO {
  price: MoneyDTO;
  price_per_ticket: MoneyDTO;
  provenance: ReferencePriceProvenance;
  total: MoneyDTO;
  unit_price: MoneyDTO;
}

export interface AssignedSeatDTO {
  id: number;
  label: string;
  seating_provider: string;
  code_id?: number | null;
}

export interface InvitationDTO {
  first_name: string;
  id: number;
  is_partner_guest: boolean;
  last_name: string;
  owner: string;
  recipient_email: string;
  source: string;
}

export interface TicketTransferDTO {
  count: number;
  created_at: string;
  id: string;
  received_ticket_id: number;
  recipient_id: number;
  sender_id: number;
  ticket_to_transfer_id: number;
  transfer_type: string;
}

export interface TicketTransferIntentDTO {
  codes: { code: string; id: number }[];
  count: number;
  created_at: string;
  id: number;
  only_claimable_by: { email: string } | null;
  status: string;
  ticket_id: number;
  ticket_transfer_id: number;
  user_id: number;
}

interface CodeDTO {
  code: string;
  id: number;
  image_url: string;
  is_validated: boolean;
  redeemed_at: string;
  spot_label: string | null;
  status: string;
  type: string;
  session_label?: string;
  validity?: ValidityDTO | null;
}

export interface CitySessionTicketDTO {
  id: number;
  iso_code: string;
  name: string;
  standard_id: number;
}

export interface PlaceSessionTicketDTO {
  address: string;
  city: CitySessionTicketDTO;
  id: number;
  name: string;
  zip_code: string;
}

export interface OrderAddOnConfigurationDTO {
  category: string;
}

export interface SessionTypeDTO {
  id: number;
  is_shop_product: boolean;
  label: string;
  spot_category_label: string | null;
  ticket_receipt_label: string;
  add_on_configuration?: OrderAddOnConfigurationDTO | null;
  is_entry_pass?: boolean;
  is_timeless?: boolean;
}

export interface PackedSessionDTO {
  ends_at: string;
  id: number;
  label: string;
  price: MoneyDTO;
  session_type: SessionTypeDTO;
  starts_at: string;
  units: number;
}

export interface SessionTicketDTO {
  address: string;
  ends_at: string;
  expires_at: string;
  id: number;
  open_gates_at: string | null;
  place: PlaceSessionTicketDTO;
  session_type: SessionTypeDTO;
  starts_at: string;
  timezone: string;
  title: string;
  updated_at: string;
  is_pack?: boolean;
  packed_sessions?: PackedSessionDTO[] | null;
}

export interface UserTicketDTO {
  email: string;
  first_name: string;
  fullname: string;
  id: number;
  last_name: string;
  phone_number?: string;
  terms?: Array<string>;
}

export interface CheckInDetailsDTO {
  is_available: boolean;
  completed_at?: string;
}

export interface ReleaseConditionActionDTO {
  is_enabled: boolean;
}

export interface ReleaseConditionDTO {
  type: string;
  action?: ReleaseConditionActionDTO | null;
}

export interface TicketEntitlementDTO {
  entitlement_type: EntitlementType;
  id: number;
}

export interface TicketDTO {
  accumulated_transaction_fee?: MoneyDTO | null;
  assigned_seats: Array<AssignedSeatDTO>;
  codes: Array<CodeDTO>;
  created_at: string;
  discount_per_each_access_ticket: MoneyDTO;
  id: number;
  invitation: InvitationDTO;
  price: MoneyDTO;
  purchased_at: string;
  redeemed_at: string;
  seats: Array<string>;
  session: SessionTicketDTO;
  status: string;
  surcharge_per_ticket: MoneyDTO;
  ticket_count: number;
  time_granularity: TicketTimeGranularity | null;
  total: MoneyDTO;
  total_price_per_ticket: MoneyDTO;
  total_surcharge_per_ticket: MoneyDTO;
  transfer_intents: Array<TicketTransferIntentDTO>;
  transfers: Array<TicketTransferDTO>;
  unit_price: MoneyDTO;
  units: number;
  updated_at: string;
  user: UserTicketDTO;
  validated_count: number;
  cancellation_insurance_partner_share?: CancellationInsurancePartnerShareDTO | null;
  check_in_details?: CheckInDetailsDTO;
  entitlements?: TicketEntitlementDTO[];
  fiscal_lines?: FiscalLineDTO[] | null;
  group_id?: number | null;
  has_release_conditions?: boolean;
  loyalty_price?: TicketLoyaltyDTO | null;
  /** The line price of the ticket's session type, as it was entered; null when the line has none. */
  manual_price?: TicketManualPriceDTO | null;
  override_prices?: CartSessionAdjustmentPriceData;
  product_type?: string | null;
  reference_price?: ReferencePriceDTO | null;
  release_condition?: ReleaseConditionDTO | null;
  surcharge_tax_rate_national?: number | null;
  target_entitlement_session_type_id?: number;
  tax_rate?: number;
}

/** A line price entry, shaped as the order `adjustment`: `operation` is null for a `final` price. */
export interface TicketManualPriceDTO {
  amount: number;
  calculation: CartAdjustmentPriceCalculation | CartAdjustmentPriceCalculationFinal;
  concept: string;
  operation: CartAdjustmentPriceOperation | null;
}

export interface OrderProductServingTimeDTO {
  session_id: number;
  serving_at: string | null;
}

export interface OrderPlanDTO {
  cover_image_url: string;
  id: number;
  name: string;
  session_selector_type: string;
  terms_and_conditions_qr_image: string;
  terms_and_conditions_url: string;
  is_pack_split_allowed?: boolean;
  provider_name: string | null;
}

export interface OrderNoteDTO {
  created_at: string;
  id: string;
  message: string;
  modified_at: string;
  title: string;
  user_id: number;
  username: string;
}

export interface OrderTaxesDTO {
  tax_base: number;
  tax_name: string;
  tax_rate: number;
  total_tax_amount: number;
}

export interface ValidityDTO {
  activation_date: string | null;
  expiry_date: string | null;
}

export interface SerializedCodeDTO {
  code: string;
  id: number;
  image_url: string | null;
  is_validated: boolean;
  redeemed_at: string | null;
  session_label: string | null;
  status: string;
  type: string;
  validity: ValidityDTO | null;
}

export interface SerializedAssignedSeatDTO {
  id: number;
  label: string;
  seating_provider: string;
}

export interface SerializedBreakdownItemDTO {
  code: SerializedCodeDTO | null;
  is_validated: boolean;
  label: string;
  seat: SerializedAssignedSeatDTO | null;
  nominative_first_name?: string | null;
  nominative_last_name?: string | null;
}

export interface SerializedCancellableItemDTO {
  breakdown_items: SerializedBreakdownItemDTO[];
  code: SerializedCodeDTO | null;
  is_cancelled: boolean;
  manual_refund_amount: MoneyDTO;
  nominative_first_name: string | null;
  nominative_last_name: string | null;
  order_item_ids: number[];
  reference_id: string;
  seat: SerializedAssignedSeatDTO | null;
  validated_status: 'validated' | 'not_validated' | 'partially_validated';
}

export interface TicketSummaryDTO {
  cancellable_items: SerializedCancellableItemDTO[];
  main_status: 'cancelled' | 'validated' | 'transferred' | 'default';
  ticket_id: number;
  ticket_type_label: string;
  total_count: number;
  validated_count: number;
}

export interface CancelledTicketDTO {
  count: number;
  label: string;
  notified_at: string | null;
  should_notify: boolean;
  ticket_id: number;
  cancellation_coupon_amount?: MoneyDTO | null;
  cancellation_coupon_code?: string | null;
  cancellation_coupon_is_available?: boolean | null;
  compensation_coupon_amount?: MoneyDTO | null;
  compensation_coupon_code?: string | null;
  compensation_coupon_is_available?: boolean | null;
  ticket_owner?: TicketsOwnerDTO | null;
}

export interface TicketsOwnerDTO {
  email: string;
  first_name: string;
  fullname: string;
  id: number;
  last_name: string;
  phone_number: string | null;
}

export interface PartnerCancellationReasonDTO {
  key: string;
  label: string;
}

export interface UserCancellationRecordDTO {
  cancellation_coupon_code: string | null;
  cancellation_coupon_type: string | null;
  cancellation_group_id: string;
  cancellation_reason: string;
  cancelled_tickets: CancelledTicketDTO[];
  comments: string;
  compensation_coupon_code: string | null;
  created_at: string;
  id: string;
  is_partner_visible?: boolean;
  is_post_cancellation_refund: boolean;
  notified_at: string | null;
  refund_reason: string;
  refunded_amount: MoneyDTO | null;
  refunded_at: string | null;
  reimbursement_type: string | null;
  requester_email: string | null;
  tickets_owner: TicketsOwnerDTO | null;
  partner_cancellation_reason?: PartnerCancellationReasonDTO | null;
}

export interface OrderDTO {
  allows_partial_cancellation: boolean;
  booking_answers: Array<BookingAnswerDTO>;
  booking_questions: Array<BookingQuestionDTO>;
  channel_id: string;
  channel_name: string;
  channel_type: string;
  coupon: CouponDTO;
  external_id: string;
  id: number;
  main_order_id: number;
  number_of_tickets: number;
  payment_card_type: string;
  payment_gateway: string;
  payment_method: string;
  plan: OrderPlanDTO;
  ticket_printer: string;
  ticket_size_type: string;
  tickets: Array<TicketDTO>;
  total: MoneyDTO;
  total_surcharge: MoneyDTO;
  total_surcharge_per_ticket: MoneyDTO;
  validation_method: string;
  adjustment?: CartAdjustmentPriceData;
  /** fever2's order serializer always sends it; optional because most order mocks and fixtures leave it out. */
  allowed_reimbursement_types?: Array<string>;
  bundle_discount?: MoneyDTO;
  cart_id?: string;
  catalog_plan?: { id: number; name: string };
  confirmed_at?: string;
  coupons?: CouponsDTO;
  created_at?: string;
  entitlements_info?: {
    max_reschedule_date: string;
    max_reschedules: number;
    min_reschedule_date: string;
    status: EntitlementStatus;
    used_reschedules: number;
  };
  external_order_code?: string | null;
  external_order_id?: string | null;
  group_member_count?: number;
  group_members?: OrderDTO[];
  grouped_orders?: number[];
  has_asset_based_booking?: boolean;
  has_deposit?: boolean;
  has_party_summary?: boolean;
  journey?: JourneyDTO;
  is_flexible_bundle_primary?: boolean;
  is_main_group_order?: boolean | null;
  loyalty?: OrderLoyaltyDTO | null;
  note?: OrderNoteDTO;
  order_group_id?: number | null;
  origin_channel_id?: string;
  partner_share_total?: MoneyDTO | null;
  payment_card_number_last_4_digits?: string;
  payment_note?: PaymentNoteDTO;
  pending_modification?: OrderPendingModificationDTO | null;
  prepared_at?: string;
  product_serving_times?: Array<OrderProductServingTimeDTO>;
  promotion?: PromotionDTO;
  purchase_urn?: string;
  external_reservation_id?: string;
  reservation_channel_id?: string;
  reservation_id?: string;
  reservation_locator?: string;
  source_reschedule_order_id?: number;
  status?: string;
  target_reschedule_order_ids?: number[];
  taxes?: Array<OrderTaxesDTO>;
  tickets_summaries?: Array<TicketSummaryDTO>;
  total_without_override?: MoneyDTO | null;
  user?: UserTicketDTO;
  user_cancellation_records?: UserCancellationRecordDTO[];
  // TODO: check if this fields could be present
  user_confirmation_messages?: string[];
  user_id?: number;
}
