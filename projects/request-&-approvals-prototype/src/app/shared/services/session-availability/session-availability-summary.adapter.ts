import { Injectable } from '@angular/core';

import { ChannelService } from '@fz-original/app/shared/services/session-availability/channel.service';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import { BookingQuestion } from '../../models/booking-questions/booking-question.model';
import { Money } from '../../models/money.model';
import { RegularSessionAvailabilitySummaryByDate } from '../../models/session-availability/regular-session-availability-summary-by-date.model';
import { Seat } from '../../models/session-availability/seat.model';
import { SessionAvailabilitySummaryByDatetime } from '../../models/session-availability/session-availability-summary-by-datetime.model';
import {
  SessionAvailabilitySummary,
  SessionAvailabilitySummaryData,
} from '../../models/session-availability/session-availability-summary.model';
import { SessionAvailability, SessionAvailabilityData } from '../../models/session-availability/session-availability.model';
import {
  SharedAvailabilityBudgets,
  SharedAvailabilityBudgetsData,
  SharedAvailabilityRule,
  SharedAvailabilityRuleData,
  SharedAvailabilityRuleItemType,
} from '../../models/session-availability/shared-availability-rule.model';
import { TimeRangeGroupingMode } from '../../models/session-availability/time-range-section.util';
import { SessionType } from '../../models/session-type/session-type.model';
import { isAddOnSelectedOnce } from '../../models/session-type/session-type.util';
import { sessionTypeTileColor } from '../../tags/utils/session-type-tile-color.util';
import { Channel } from './channel.enum';

const MAXIMUM_TICKETS_OF_ADD_ON_SELECTED_ONCE = 1;

@Injectable({
  providedIn: 'root',
})
export class SessionAvailabilitySummaryAdapter implements AdapterInterface<BaseResponse<SessionAvailabilitySummary>> {
  fromApi(
    response: {
      data: SessionAvailabilitySummaryData | null;
      error?: BaseErrorResponse | null;
      minutes_before_to_expire?: number;
      override_maximum_tickets?: number;
    },
    channel?: Channel,
    placeId?: number,
    canOverrideCapacity: boolean = false,
    appliesCartWideSharedAvailability: boolean = false,
  ): BaseResponse<SessionAvailabilitySummary> {
    return new BaseResponse<SessionAvailabilitySummary>(
      this.getData(
        response?.data,
        response?.override_maximum_tickets,
        response?.minutes_before_to_expire,
        channel,
        placeId,
        canOverrideCapacity,
        appliesCartWideSharedAvailability,
      ),
      this.getError(response?.error),
    );
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getSessionsInfo(
    summaries: Record<string, { capacity: number | null; override_capacity?: number | null; sessions: SessionAvailabilityData[] }>,
    overrideMaximumTickets?: number,
    minutesBeforeToExpire?: number,
    channel?: Channel,
    venueId?: number,
    canOverrideCapacity: boolean = false,
    sharedAvailabilityBudgets: SharedAvailabilityBudgets = new Map(),
  ): {
    sessionAvailabilitySummaryByDatetimeList: SessionAvailabilitySummaryByDatetime[];
    sessionsWithSeating: boolean;
  } {
    let hasSessionsWithSeating = false;

    const sessionAvailabilitySummaryByDatetimeList = Object.entries(summaries).map(
      ([datetimeKey, sessionAvailability]: [
        string,
        { capacity: number | null; override_capacity?: number | null; sessions: SessionAvailabilityData[] },
      ]) => {
        const sessionAvailabilityList: SessionAvailability[] = sessionAvailability.sessions.map(session => {
          if (!hasSessionsWithSeating && session.seating) {
            hasSessionsWithSeating = true;
          }
          return this.createSessionAvailabilityFromDateTimeItem(
            session,
            overrideMaximumTickets,
            minutesBeforeToExpire,
            channel,
            venueId,
            sharedAvailabilityBudgets,
          );
        });
        return new SessionAvailabilitySummaryByDatetime(
          datetimeKey,
          sessionAvailabilityList,
          sessionAvailability.capacity ?? undefined,
          sessionAvailability.override_capacity ?? undefined,
          canOverrideCapacity,
        );
      },
    );
    return { sessionAvailabilitySummaryByDatetimeList, sessionsWithSeating: hasSessionsWithSeating };
  }

  private getTimeRangeGroupingMode(): TimeRangeGroupingMode {
    return 'operatingDay';
  }

  private getData(
    data: SessionAvailabilitySummaryData | null,
    overrideMaximumTickets?: number,
    minutesBeforeToExpire?: number,
    channel?: Channel,
    venueId?: number,
    canOverrideCapacity: boolean = false,
    appliesCartWideSharedAvailability: boolean = false,
  ): SessionAvailabilitySummary | null {
    let sessionAvailabilitySummary: SessionAvailabilitySummary | null = null;
    let hasSessionsWithSeating = false;
    if (data) {
      const groupingMode = this.getTimeRangeGroupingMode();
      const sharedAvailabilityBudgets = this.adaptSharedAvailabilityBudgets(
        appliesCartWideSharedAvailability ? data.shared_availability_budgets : undefined,
      );
      const regularSessionAvailabilitySummaryByDateList: RegularSessionAvailabilitySummaryByDate[] = Object.entries(
        data.date_summaries,
      ).map(
        ([key, dateSummary]: [
          string,
          {
            datetime_summaries: Record<
              string,
              { capacity: number | null; override_capacity?: number | null; sessions: SessionAvailabilityData[] }
            >;
          },
        ]) => {
          const { sessionAvailabilitySummaryByDatetimeList, sessionsWithSeating } = this.getSessionsInfo(
            dateSummary.datetime_summaries,
            overrideMaximumTickets,
            minutesBeforeToExpire,
            channel,
            venueId,
            canOverrideCapacity,
            sharedAvailabilityBudgets,
          );

          if (sessionsWithSeating) {
            hasSessionsWithSeating = true;
          }

          return new RegularSessionAvailabilitySummaryByDate(
            key,
            data.timezone,
            sessionAvailabilitySummaryByDatetimeList,
            venueId ?? null,
            groupingMode,
          );
        },
      );

      const productSessions: SessionAvailability[] = data.product_summaries.map(productSessionAvailability => {
        return this.createSessionAvailabilityFromDateTimeItem(
          productSessionAvailability,
          overrideMaximumTickets,
          minutesBeforeToExpire,
          channel,
          venueId,
          sharedAvailabilityBudgets,
        );
      });

      sessionAvailabilitySummary = new SessionAvailabilitySummary(
        data.timezone,
        data.allow_multi_session_purchase && !hasSessionsWithSeating,
        data.has_explode_pipe,
        regularSessionAvailabilitySummaryByDateList,
        data.next_available_date,
        data.session_selector_type,
        productSessions,
      );
    }
    return sessionAvailabilitySummary;
  }

  private createSessionAvailabilityFromDateTimeItem(
    sessionAvailability: SessionAvailabilityData,
    overrideMaximumTickets?: number,
    minutesBeforeToExpire?: number,
    channel?: Channel,
    venueId?: number,
    sharedAvailabilityBudgets: SharedAvailabilityBudgets = new Map(),
  ): SessionAvailability {
    const addOnConfiguration = sessionAvailability.session_type?.add_on_configuration;
    const isSelectedOnce = isAddOnSelectedOnce(addOnConfiguration);
    const sessionAvailabilityModel = new SessionAvailability(
      sessionAvailability.id,
      sessionAvailability.title,
      sessionAvailability.start_date,
      sessionAvailability.end_date,
      new Money(sessionAvailability.price.amount, sessionAvailability.price.currency),
      sessionAvailability.sellable,
      sessionAvailability.available_tickets,
      capForAddOnSelectedOnce(sessionAvailability.tickets_allowed_per_booking.minimum, isSelectedOnce),
      capForAddOnSelectedOnce(this.getSessionMaximumAvailability(sessionAvailability, overrideMaximumTickets, channel), isSelectedOnce),
      sessionAvailability.purchasable_from_date,
      sessionAvailability.purchasable_until_date,
      sessionAvailability.is_hidden || false,
      sessionAvailability.surcharge_per_ticket
        ? new Money(sessionAvailability.surcharge_per_ticket.amount, sessionAvailability.surcharge_per_ticket.currency)
        : undefined,
      sessionAvailability.seating ? new Seat(sessionAvailability.seating.category, [], sessionAvailability.seating.pool_id) : null,
      sessionAvailability.booking_questions
        ? sessionAvailability.booking_questions.map(
            bookingQuestion =>
              new BookingQuestion(
                bookingQuestion.id,
                bookingQuestion.label,
                bookingQuestion.message,
                bookingQuestion.type,
                bookingQuestion.choices,
              ),
          )
        : undefined,
      minutesBeforeToExpire ? minutesBeforeToExpire : undefined,
      sessionAvailability.session_type
        ? new SessionType(
            sessionAvailability.session_type.id,
            sessionAvailability.session_type.label,
            sessionAvailability.session_type.is_pass,
            sessionAvailability.session_type.is_add_on,
            sessionAvailability.session_type.reservation_restriction,
            sessionAvailability.session_type.ticket_receipt_label,
            sessionAvailability.session_type.ignore_time_slot_capacity,
            capOptionalForAddOnSelectedOnce(sessionAvailability.session_type.allowed_num_tickets?.minimum, isSelectedOnce),
            capOptionalForAddOnSelectedOnce(sessionAvailability.session_type.allowed_num_tickets?.maximum, isSelectedOnce),
            sessionAvailability.session_type.is_shop_product,
            undefined,
            isSelectedOnce ? 1 : this.getStepQuantityFromSessionType(sessionAvailability.session_type),
            sessionAvailability.session_type.is_timeless,
            sessionAvailability.session_type.image_url,
            sessionTypeTileColor(sessionAvailability.session_type.color) ?? undefined,
          )
        : undefined,
      sessionAvailability.details,
      sessionAvailability.main_plan_id,
      sessionAvailability.strikethrough_price != null && sessionAvailability!.strikethrough_price!.amount !== null
        ? new Money(sessionAvailability.strikethrough_price.amount, sessionAvailability.strikethrough_price.currency)
        : undefined,
      venueId,
      sessionAvailability.override_available_tickets ?? undefined,
      capOptionalForAddOnSelectedOnce(sessionAvailability.tickets_allowed_per_booking_excluding_availability?.maximum, isSelectedOnce),
      capOptionalForAddOnSelectedOnce(sessionAvailability.tickets_allowed_per_booking_excluding_availability?.minimum, isSelectedOnce),
      sessionAvailability.is_pack,
    );

    if (sessionAvailabilityModel.sessionType !== undefined && addOnConfiguration !== undefined) {
      sessionAvailabilityModel.sessionType.addOnConfiguration = {
        category: addOnConfiguration.category,
        pricingType: addOnConfiguration.pricing_type,
      };
    }

    sessionAvailabilityModel.sharedAvailabilityRule = this.adaptSharedAvailabilityRule(
      sessionAvailability.shared_availability_rule,
      sessionAvailability.shared_availability_footprint,
      sharedAvailabilityBudgets,
    );

    return sessionAvailabilityModel;
  }

  private adaptFootprint(
    footprint: string[] | null | undefined,
    sharedAvailabilityBudgets: SharedAvailabilityBudgets,
    inlineTypes: ReadonlySet<string>,
  ): SharedAvailabilityRuleItemType[] {
    const itemTypes: SharedAvailabilityRuleItemType[] = [];
    const seenTypes = new Set<string>();
    for (const type of footprint ?? []) {
      const budget = sharedAvailabilityBudgets.get(type);
      if (budget === undefined || budget.max <= 0 || inlineTypes.has(type) || seenTypes.has(type)) {
        continue;
      }
      seenTypes.add(type);
      itemTypes.push({ isCartWide: true, max: budget.max, messageOnFailure: budget.messageOnFailure, min: 0, type });
    }
    return itemTypes;
  }

  private adaptSharedAvailabilityBudgets(budgets: SharedAvailabilityBudgetsData | null | undefined): SharedAvailabilityBudgets {
    const sharedAvailabilityBudgets = new Map<string, { max: number; messageOnFailure?: string | null }>();
    for (const [type, budget] of Object.entries(budgets ?? {})) {
      sharedAvailabilityBudgets.set(type, { max: budget.max, messageOnFailure: budget.message_on_failure });
    }
    return sharedAvailabilityBudgets;
  }

  private adaptSharedAvailabilityRule(
    rule: SharedAvailabilityRuleData | null | undefined,
    footprint: string[] | null | undefined,
    sharedAvailabilityBudgets: SharedAvailabilityBudgets,
  ): SharedAvailabilityRule | undefined {
    const inlineItemTypes: SharedAvailabilityRuleItemType[] = (rule?.item_types_sharing_availability_all_of ?? []).map(itemType => ({
      isCartWide: false,
      type: itemType.type,
      min: itemType.min,
      max: itemType.max,
      quantityMultiplier: itemType.quantity_multiplier,
      messageOnFailure: itemType.message_on_failure,
      messageOnFailureMin: itemType.message_on_failure_min,
    }));
    const itemTypesSharingAvailabilityAllOf = [
      ...inlineItemTypes,
      ...this.adaptFootprint(footprint, sharedAvailabilityBudgets, new Set(inlineItemTypes.map(itemType => itemType.type))),
    ];
    if (!itemTypesSharingAvailabilityAllOf.length) {
      return undefined;
    }
    return { itemTypesSharingAvailabilityAllOf };
  }

  private getStepQuantityFromSessionType(sessionType: SessionAvailabilityData['session_type']): number {
    if (!sessionType) return 1;
    const value = sessionType.ticket_selector_step_quantity;
    if (value === undefined || value === null) return 1;
    const num = Number(value);
    return Number.isInteger(num) && num > 0 ? num : 1;
  }

  private getSessionMaximumAvailability(
    sessionAvailability: SessionAvailabilityData,
    overrideMaximumTickets?: number | null,
    channel?: Channel,
  ): number {
    const { maximum, minimum }: { maximum: number; minimum: number } = sessionAvailability.tickets_allowed_per_booking;
    const isFixedTicketNumber: boolean = maximum === minimum;

    if (isFixedTicketNumber) {
      return maximum;
    }

    if (overrideMaximumTickets == null) {
      return maximum;
    }

    // Only invitations may exceed the maximum; the backend rejects the rest at checkout (B2BO-8294).
    if (channel !== undefined && ChannelService.isInvitation(channel)) {
      return overrideMaximumTickets;
    }

    return Math.min(overrideMaximumTickets, maximum);
  }
}

function capForAddOnSelectedOnce(ticketCount: number, isSelectedOnce: boolean): number {
  return isSelectedOnce ? Math.min(ticketCount, MAXIMUM_TICKETS_OF_ADD_ON_SELECTED_ONCE) : ticketCount;
}

function capOptionalForAddOnSelectedOnce(ticketCount: number | undefined, isSelectedOnce: boolean): number | undefined {
  return ticketCount === undefined ? undefined : capForAddOnSelectedOnce(ticketCount, isSelectedOnce);
}
