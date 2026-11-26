import type { Deposit, DepositApi } from '../models/deposit.model';
import type { ReservationNote, ReservationNoteApi } from '../models/reservation-note.model';
import type { ReservationPlanSummary, ReservationPlanSummaryApi } from '../models/reservation-plan-summary.model';
import type {
  ReservationSessionItemBreakdownApi,
  ReservationSessionItemTicketsAllowed,
} from '../models/reservation-session-item-tickets-allowed.model';
import type { Reservation, ReservationApi } from '../models/reservation.model';

export function adaptReservation(data: ReservationApi): Reservation {
  return {
    attendanceStatus: data.attendance,
    b2bUserEmail: data.b2b_user_email,
    b2bUserName: data.b2b_user_name,
    b2bUserUsername: data.b2b_user_username,
    businessEmail: data.b2b_business_email,
    businessId: data.b2b_business_id,
    businessName: data.b2b_business_name,
    businessPhone: data.b2b_business_phone,
    businessType: data.b2b_business_type,
    cartId: data.cart_id,
    channelId: data.channel_id,
    cityId: data.city_id,
    cityName: data.city_name,
    createdAt: data.created_at,
    endCustomerEmail: data.end_customer?.email ?? undefined,
    endCustomerFirstName: data.end_customer?.first_name ?? undefined,
    endCustomerLastName: data.end_customer?.last_name ?? undefined,
    expirationDate: data.expiration_date_time,
    externalReservationId: data.external_locator_id ?? null,
    hidePriceOnTickets: data.hide_price_on_tickets ?? false,
    id: data.id,
    locator: data.locator,
    orderId: data.order_id === null ? null : String(data.order_id),
    ownerEmail: data.user?.email,
    ownerFirstName: data.user?.first_name,
    ownerFullName: data.user?.fullname,
    ownerLastName: data.user?.last_name,
    ownerNameEditable: data.user?.is_name_editable,
    partnerId: data.partner_id ?? null,
    placeId: data.place_id,
    placeName: data.place_name,
    planAvailableLanguages: data.plan_available_languages,
    planDefaultLanguage: data.plan_default_language,
    planHasBookingQuestions: data.plan_has_booking_questions ?? false,
    planId: data.plan_id,
    planName: data.plan_name,
    plans: adaptPlans(data.plans),
    purchaseUrn: data.purchase_urn ?? null,
    sessionStartsAt: data.session_starts_at,
    status: data.status,
    totalNumberOfTickets: data.total_number_of_tickets,
    sessionItems: (data.session_items_breakdown ?? []).map(item => ({
      count: item.count,
      isAddOn: item.is_add_on,
      sessionId: item.session_id,
      sessionLabel: item.session_label,
    })),
    totalToBePaid: { amount: data.total_to_be_paid, currency: data.currency },
    ...adaptPaymentLinkSent(data),
    ...adaptOptional(data),
  };
}

function adaptPaymentLinkSent(data: ReservationApi): Pick<Reservation, 'paymentLinkSentAt' | 'paymentLinkSentTo'> {
  return {
    paymentLinkSentAt: data.payment_link_sent_at ?? null,
    paymentLinkSentTo: data.payment_link_sent_to ?? null,
  };
}

function adaptOptional(data: ReservationApi): Partial<Pick<Reservation, 'deposit' | 'note' | 'ticketsAllowedPerBookingBySessionId'>> {
  const deposit = adaptDeposit(data.deposit, data.currency);
  const note = adaptNote(data.reservation_note);
  const ticketsAllowed = adaptTicketsAllowed(data.session_items_breakdown);
  return {
    ...(deposit !== undefined && { deposit }),
    ...(note !== undefined && { note }),
    ...(ticketsAllowed !== undefined && { ticketsAllowedPerBookingBySessionId: ticketsAllowed }),
  };
}

function adaptPlans(plans: readonly ReservationPlanSummaryApi[] | undefined): readonly ReservationPlanSummary[] {
  return (plans ?? []).map(plan => ({
    availableLanguages: plan.available_languages,
    defaultLanguage: plan.default_language,
    hasBookingQuestions: plan.has_booking_questions,
    id: plan.id,
    name: plan.name,
  }));
}

function adaptNote(note: ReservationNoteApi | null | undefined): ReservationNote | undefined {
  if (note === null || note === undefined) {
    return undefined;
  }
  return {
    createdAt: note.created_at,
    id: note.id,
    message: note.message,
    modifiedAt: note.modified_at,
    title: note.title,
    updatedAt: note.updated_at,
    userEmail: note.user_email,
    userId: note.user_id,
    username: note.username,
  };
}

function adaptDeposit(deposit: DepositApi | null | undefined, currency: string): Deposit | undefined {
  if (deposit === null || deposit === undefined) {
    return undefined;
  }
  const calculatedAmount = deposit.calculated_amount ?? undefined;
  const effectiveTotal = deposit.effective_total ?? undefined;
  return {
    calculatedAmount: calculatedAmount === undefined ? undefined : { amount: calculatedAmount, currency },
    effectiveTotal: effectiveTotal === undefined ? undefined : { amount: effectiveTotal.amount, currency: effectiveTotal.currency },
    expirationDate: deposit.expires_at ?? undefined,
    hasPaidDeposit: deposit.has_paid_deposit ?? undefined,
    id: deposit.id ?? undefined,
    isMarkAsPaidPayment: deposit.is_mark_as_paid_payment ?? undefined,
    isRefundable: deposit.is_refundable ?? undefined,
    paidAt: deposit.paid_at ?? undefined,
    paymentGateway: deposit.payment_gateway ?? undefined,
    paymentMethod: deposit.payment_method ?? undefined,
    refundedAt: deposit.refunded_at ?? undefined,
    status: deposit.status ?? undefined,
    termsAndConditionsUrl: deposit.terms_and_conditions_url ?? undefined,
    warningMessage: deposit.warning_message ?? undefined,
  };
}

function adaptTicketsAllowed(
  breakdown: readonly ReservationSessionItemBreakdownApi[] | null | undefined,
): ReadonlyMap<number, ReservationSessionItemTicketsAllowed> | undefined {
  if (breakdown === null || breakdown === undefined) {
    return undefined;
  }
  const entries = breakdown.flatMap(item => {
    const limits = item.tickets_allowed_per_booking;
    if (limits === undefined) {
      return [];
    }
    const allowed: ReservationSessionItemTicketsAllowed = {
      availableTickets: item.available_tickets,
      maximum: limits.maximum,
      minimum: limits.minimum,
      ruleMaximum: item.tickets_allowed_per_booking_excluding_availability?.maximum,
      ruleMinimum: item.tickets_allowed_per_booking_excluding_availability?.minimum,
      ticketSelectorStepQuantity: item.ticket_selector_step_quantity,
    };
    return [[item.session_id, allowed] as const];
  });
  return entries.length > 0 ? new Map(entries) : undefined;
}
