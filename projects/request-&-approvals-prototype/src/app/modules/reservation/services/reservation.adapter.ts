import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { journeyFromDto } from '../../../shared/models/journey/journey.adapter';
import { Money } from '../../../shared/models/money.model';
import { DepositAdapter } from '../../../shared/services/deposit/deposit.adapter';
import { SessionSelectorType } from '../../../shared/services/session-availability/session-selector-type.enum';
import { ReservationPlanSummary } from '../models/reservation-plan-summary.model';
import { ReservationSessionItemTicketsAllowed } from '../models/reservation-session-item-tickets-allowed.model';
import { Reservation } from '../models/reservation.model';
import { ReservationDTO, ReservationPlanSummaryDTO } from './models/reservation.dto';

@Injectable({
  providedIn: 'root',
})
export class ReservationAdapter implements AdapterInterface<Reservation> {
  constructor(private readonly depositAdapter: DepositAdapter) {}

  fromApi(response: ReservationDTO): Reservation {
    const reservation = new Reservation(
      response.id,
      response.locator,
      response.status,
      response.b2b_user_name,
      response.b2b_user_email,
      response.b2b_user_username,
      response.b2b_business_id,
      response.b2b_business_name,
      response.b2b_business_type,
      response.b2b_business_email,
      response.b2b_business_phone,
      new Money(response.total_to_be_paid, response.currency),
      response.total_number_of_tickets,
      response.session_starts_at,
      response.created_at,
      response.place_id,
      response.place_name,
      response.plan_name,
      response.plan_id,
      this.#mapPlans(response.plans),
      response.plan_default_language,
      response.plan_available_languages,
      response.plan_has_booking_questions ?? false,
      response.cart_id,
      response.city_id,
      response.city_name,
      response.order_id,
      response.channel_id,
      response.expiration_date_time,
      response.attendance,
      response.user?.fullname,
      response.user?.email,
      response.user?.first_name,
      response.user?.last_name,
      response.user?.is_name_editable,
      response.reservation_note
        ? {
            createdAt: response.reservation_note.created_at,
            id: response.reservation_note.id,
            message: response.reservation_note.message,
            modifiedAt: response.reservation_note.modified_at,
            title: response.reservation_note.title,
            updatedAt: response.reservation_note.updated_at,
            userEmail: response.reservation_note.user_email,
            userId: response.reservation_note.user_id,
            username: response.reservation_note.username,
          }
        : undefined,
      this.depositAdapter.fromApi(response.deposit, response.currency),
      response.external_locator_id ?? null,
      this.#buildTicketsAllowedPerBookingBySessionId(response),
      response.purchase_urn ?? null,
      undefined,
      response.has_asset_based_booking,
      response.plan_session_selector_type as SessionSelectorType | undefined,
      this.#buildServingTimesBySessionId(response),
      response.journey ? journeyFromDto(response.journey) : undefined,
    );

    reservation.partnerId = response.partner_id;
    reservation.distributorId = response.distributor_id;

    return reservation;
  }

  #mapPlans(plans: ReservationPlanSummaryDTO[] | undefined): ReservationPlanSummary[] {
    return (plans ?? []).map((plan: ReservationPlanSummaryDTO) => ({
      availableLanguages: plan.available_languages,
      defaultLanguage: plan.default_language,
      hasBookingQuestions: plan.has_booking_questions,
      id: plan.id,
      name: plan.name,
    }));
  }

  #buildServingTimesBySessionId(response: ReservationDTO): ReadonlyMap<number, string> | undefined {
    const breakdown = response.session_items_breakdown;
    if (!breakdown || breakdown.length === 0) {
      return undefined;
    }
    const map = new Map<number, string>();
    for (const item of breakdown) {
      if (item.serving_at) {
        map.set(item.session_id, item.serving_at);
      }
    }
    return map.size > 0 ? map : undefined;
  }

  #buildTicketsAllowedPerBookingBySessionId(
    response: ReservationDTO,
  ): ReadonlyMap<number, ReservationSessionItemTicketsAllowed> | undefined {
    const breakdown = response.session_items_breakdown;
    if (!breakdown || breakdown.length === 0) {
      return undefined;
    }
    const map = new Map<number, ReservationSessionItemTicketsAllowed>();
    for (const item of breakdown) {
      const limits = item.tickets_allowed_per_booking;
      if (limits === undefined) {
        continue;
      }
      map.set(item.session_id, {
        maximum: limits.maximum,
        minimum: limits.minimum,
        ruleMaximum: item.tickets_allowed_per_booking_excluding_availability?.maximum,
        ruleMinimum: item.tickets_allowed_per_booking_excluding_availability?.minimum,
        availableTickets: item.available_tickets,
        ticketSelectorStepQuantity: item.ticket_selector_step_quantity,
      });
    }
    return map.size > 0 ? map : undefined;
  }
}
