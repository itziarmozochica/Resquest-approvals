import { SalesWindowConfig } from '@fz-original/app/modules/sessions/shared/components/sales-window/models/sales-window.model';
import { SessionActionRuleListItem, SessionActionRuleListItemDTO } from '@fz-original/app/modules/sessions/shared/models/action-rule.model';
import { SessionSalesSummary, SessionSalesSummaryData } from '@fz-original/app/shared/models/capacity/session-sales-summary.model';

import { SalesWindowsResponseDTO } from '../../../modules/sessions/shared/components/sales-window/models/sales-window-dto.model';
import { Money } from '../money.model';
import { Schedule } from '../schedule.model';
import { CapacityGroup, SharedWithMainPlan } from './capacity-group.model';
import { CapacityPool } from './capacity-pool.model';
import { CapacitySummaryBySession } from './capacity-summary-by-session.model';
import { GroupedSessions, SessionWithGroup } from './grouped-sessions.model';

export interface TimeSlotSessionsCapacitySummaryDTO {
  available_tickets: number;
  capacity: number;
  capacity_group_summaries: CapacityGroupSummaryDTO[];
  must_use_tax_base: boolean;
  occupancy: number;
  reserved_unpaid_tickets: number;
  session_capacity_summaries: SessionCapacitySummaryDTO[];
  sold_tickets: number;
  time_slot_capacity_group_summary: CapacityGroupSummaryDTO | null;
  timezone: string;
}

export interface SessionCapacitySummaryDTO {
  available_tickets: number;
  blocked_tickets: number;
  capacity: number;
  capacity_group_id: string | null;
  capacity_pool_id: string | null;
  ends_at: string;
  ends_at_utc: string;
  expires_at: string;
  expires_at_utc: string;
  has_price_list_pricing: boolean;
  has_seating: boolean;
  ignore_time_slot_capacity: boolean;
  incoming_rules: SessionActionRuleListItemDTO[] | null;
  is_add_on: boolean;
  is_expired: boolean;
  is_hidden: boolean;
  is_pack: boolean;
  is_sold_out: boolean;
  label: string;
  occupancy: number;
  outgoing_rules: SessionActionRuleListItemDTO[] | null;
  sales_windows?: SalesWindowsResponseDTO | null;
  quotas: CapacityQuotaDTO[];
  reserved_unpaid_tickets: number;
  session_id: number;
  session_sales_summaries: SessionSalesSummaryData[] | null;
  sold_tickets: number;
  starts_at: string;
  starts_at_utc: string;
  ticket_price: Money | null;
  ticket_price_tax_base: Money | null;
  use_for_availability: boolean;
}

export enum CapacityQuotaConsumeMode {
  blocked = 'blocked',
  exclusive = 'exclusive',
  shared = 'shared',
}

export interface CapacityGroupSummaryDTO {
  available_tickets: number;
  blocked_tickets: number | null;
  capacity: number;
  capacity_group_id: string;
  created_at: string;
  created_at_utc: string;
  is_asset_based: boolean;
  is_cancelled: boolean;
  name: string;
  occupancy: number;
  quotas: CapacityQuotaDTO[];
  shared_with_main_plans: SharedWithMainPlanDTO[] | null;
  sold_tickets: number;
}

export interface SharedWithMainPlanDTO {
  main_plan_id: number;
}

export interface CapacityQuotaDTO {
  applicability_context: ApplicabilityContextRuleDTO[][] | null;
  available_units: number;
  capacity: number;
  capacity_quota_id: string;
  consume_mode: CapacityQuotaConsumeMode;
  issued_units: number;
  name: string;
}

export enum ApplicabilityContextField {
  businessId = 'business_id',
  channelId = 'channel_id',
  channelType = 'channel_type',
}

export enum ApplicabilityContextOperator {
  eq = 'eq',
  in = 'in',
}

export interface ApplicabilityContextRuleDTO {
  field_name: ApplicabilityContextField;
  operator: ApplicabilityContextOperator;
  value: string | string[];
}

export interface CapacityQuota {
  applicabilityContext: ApplicabilityContextRule[][] | null;
  availableUnits: number;
  capacity: number;
  capacityQuotaId: string;
  consumeMode: CapacityQuotaConsumeMode;
  issuedUnits: number;
  name: string;
}

interface ApplicabilityContextRuleBase {
  fieldName: ApplicabilityContextField;
  operator: ApplicabilityContextOperator;
  value: string | string[];
}

export interface ApplicabilityContextRuleEq extends ApplicabilityContextRuleBase {
  fieldName: ApplicabilityContextField;
  operator: ApplicabilityContextOperator.eq;
  value: string;
}

export interface ApplicabilityContextRuleIn extends ApplicabilityContextRuleBase {
  fieldName: ApplicabilityContextField;
  operator: ApplicabilityContextOperator.in;
  value: string[];
}

export type ApplicabilityContextRule = ApplicabilityContextRuleEq | ApplicabilityContextRuleIn;

export function isRuleEq(rule: ApplicabilityContextRule): rule is ApplicabilityContextRuleEq {
  return rule.operator === ApplicabilityContextOperator.eq;
}

type GroupsSortingFunction = (a: SessionWithGroup, b: SessionWithGroup) => number;

export class TimeSlotSessionsCapacitySummary {
  static getGroupsSortingFunctionFromOrderedIds(idsOrder: string[]): GroupsSortingFunction {
    return (a: SessionWithGroup, b: SessionWithGroup) => {
      return idsOrder.indexOf(a.pool.id) - idsOrder.indexOf(b.pool.id);
    };
  }

  constructor(
    public timezone: string,
    public mustUseTaxBase: boolean,
    public capacity: number,
    public availableTickets: number,
    public soldTickets: number,
    public reservedUnpaidTickets: number,
    public occupancy: number,
    public sessionCapacitySummaries: SessionCapacitySummary[],
    public capacityGroupSummaries: CapacityGroupSummary[] = [],
    public timeSlotCapacityGroupSummary?: CapacityGroupSummary,
  ) {}

  getSessionsGroupedByDates(date: string, datetime: string): Map<string, GroupedSessions> {
    const result = new Map<string, GroupedSessions>();
    result.set(datetime, this.getSessionsGroupedByCapacity());
    return result;
  }

  private getSessionsGroupedByCapacity(): GroupedSessions {
    let sessionsInCapacityGroup: SessionWithGroup[] = [];
    const sessionsNotInCapacityGroup: CapacitySummaryBySession[] = [];
    let schedule: Schedule | null = null;

    const capacitySummariesBySession = this.sessionCapacitySummaries.map(session => {
      let codePoolId = null;
      if (!isNaN(Number(session.capacityGroupId))) {
        codePoolId = Number(session.capacityGroupId);
      }
      return new CapacitySummaryBySession(
        session.sessionId,
        session.label,
        session.startsAt,
        session.endsAt,
        session.expiresAt,
        session.hasSeating,
        session.isHidden,
        codePoolId,
        session.soldTickets,
        session.capacity,
        session.availableTickets,
        session.occupancy,
        session.ticketPrice,
        session.isSoldOut,
        session.isExpired,
        session.hasPriceListPricing,
        session.ignoreTimeSlotCapacity,
        session.useForAvailability,
        session.reservedUnpaidTickets,
        session.blockedTickets,
        session.isAddOn,
        session.isPack,
        session.sessionSalesSummaries,
        session.capacityGroupId,
        session.incomingRules,
        session.outgoingRules,
        session.ticketPriceTaxBase ?? null,
        null,
        session.salesWindows,
      );
    });

    const sessionsInCapacityGroupMap = new Map<string, CapacitySummaryBySession[]>();
    capacitySummariesBySession.forEach(session => {
      if (!schedule) {
        schedule = new Schedule(session.startsAt, session.expiresAt, session.endsAt, session.soldTickets);
      } else {
        schedule.updateSchedule(session.startsAt, session.expiresAt, session.endsAt, session.soldTickets);
      }

      if (!session.capacityGroupId) {
        sessionsNotInCapacityGroup.push(session);
      } else {
        const existingSessions = sessionsInCapacityGroupMap.get(session.capacityGroupId) || [];
        existingSessions.push(session);
        sessionsInCapacityGroupMap.set(session.capacityGroupId, existingSessions);
      }
    });

    sessionsInCapacityGroup = Array.from(sessionsInCapacityGroupMap.entries()).map(([capacityGroupId, sessions]) => {
      const group = this.capacityGroupSummaries.find(g => g.capacityGroupId === capacityGroupId);
      return {
        pool: new CapacityGroup(
          capacityGroupId,
          group!.name || '',
          group!.isAssetBased,
          group!.createdAt,
          group!.isCancelled,
          group!.availableTickets,
          group!.soldTickets,
          group!.capacity,
          group!.occupancy,
          group!.blockedTickets,
          { id: group!.capacityGroupId, name: group!.name },
          this.#getSharedWithMainPlans(group!.sharedMainPlanIds),
        ),
        sessions,
      };
    });

    const capacityGroupSummariesIdsInOriginalOrder = this.capacityGroupSummaries.map(({ capacityGroupId }) => capacityGroupId);

    sessionsInCapacityGroup.sort(
      TimeSlotSessionsCapacitySummary.getGroupsSortingFunctionFromOrderedIds(capacityGroupSummariesIdsInOriginalOrder),
    );

    const timeSlotCapacity: CapacityPool | undefined = this.timeSlotCapacityGroupSummary
      ? {
          id: this.timeSlotCapacityGroupSummary.capacityGroupId,
          capacity: this.timeSlotCapacityGroupSummary.capacity,
          availableUnits: this.timeSlotCapacityGroupSummary.availableTickets,
          soldUnits: this.timeSlotCapacityGroupSummary.soldTickets,
          occupancy: this.timeSlotCapacityGroupSummary.occupancy,
          blockedUnits: this.timeSlotCapacityGroupSummary.blockedTickets ?? 0,
        }
      : undefined;

    return {
      sessionsWithCodePool: sessionsInCapacityGroup,
      sessionsWithoutCodePool: sessionsNotInCapacityGroup,
      schedule,
      mustUseTaxBase: this.mustUseTaxBase,
      timeSlotCapacity,
    };
  }

  #getSharedWithMainPlans(sharedMainPlanIds: number[] | null): SharedWithMainPlan[] | null {
    return sharedMainPlanIds?.map(mainPlanId => ({ mainPlanId })) ?? null;
  }
}

export class SessionCapacitySummary {
  constructor(
    public sessionId: number,
    public label: string,
    public startsAt: string,
    public startsAtUtc: string,
    public endsAt: string,
    public endsAtUtc: string,
    public expiresAt: string,
    public expiresAtUtc: string,
    public hasSeating: boolean,
    public isHidden: boolean,
    public isSoldOut: boolean,
    public isAddOn: boolean,
    public isExpired: boolean,
    public hasPriceListPricing: boolean,
    public ignoreTimeSlotCapacity: boolean,
    public useForAvailability: boolean,
    public isPack: boolean,
    public capacity: number,
    public availableTickets: number,
    public soldTickets: number,
    public reservedUnpaidTickets: number,
    public blockedTickets: number,
    public occupancy: number,
    public ticketPrice: Money | null,
    public ticketPriceTaxBase: Money | null,
    public sessionSalesSummaries: SessionSalesSummary[] | null,
    public incomingRules: SessionActionRuleListItem[] | null,
    public outgoingRules: SessionActionRuleListItem[] | null,
    public capacityGroupId: string | null,
    public quotas: CapacityQuota[] = [],
    public capacityPoolId: string | null = null,
    public salesWindows: SalesWindowConfig | null = null,
  ) {}
}

export class CapacityGroupSummary {
  constructor(
    public capacityGroupId: string,
    public name: string | null,
    public capacity: number,
    public availableTickets: number,
    public soldTickets: number,
    public blockedTickets: number | null,
    public occupancy: number,
    public isCancelled: boolean,
    public createdAt: string,
    public createdAtUtc: string,
    public quotas: CapacityQuota[] = [],
    public isAssetBased: boolean = false,
    public sharedMainPlanIds: number[] | null = null,
  ) {}
}
