import { Injectable } from '@angular/core';

import {
  ActionRuleActionType,
  ActionRuleActionUpdateVisibilityDTO,
  SessionActionRuleListItem,
  SessionActionRuleListItemDTO,
} from '@fz-original/app/modules/sessions/shared/models/action-rule.model';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import { CapacityGroup, CodePoolSummaryData } from '../../models/capacity/capacity-group.model';
import { CapacitySummaryBySession, CapacitySummaryBySessionData } from '../../models/capacity/capacity-summary-by-session.model';
import { CapacitySummaryByDate } from '../../models/capacity/capacity-summary-date.model';
import { CapacitySummaryByDatetime, CapacitySummaryByDatetimeData } from '../../models/capacity/capacity-summary-datetime.model';
import { CapacitySummary, CapacitySummaryData } from '../../models/capacity/capacity-summary.model';
import { SessionSalesSummary, SessionSalesSummaryData } from '../../models/capacity/session-sales-summary.model';
import { Money } from '../../models/money.model';

@Injectable({
  providedIn: 'root',
})
export class CapacitySummaryAdapter implements AdapterInterface<BaseResponse<CapacitySummary>> {
  fromApi(response: BaseResponse<CapacitySummaryData>): BaseResponse<CapacitySummary> {
    return new BaseResponse<CapacitySummary>(this.getData(response.data), this.getError(response?.error));
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: CapacitySummaryData | null): CapacitySummary | null {
    if (!data) {
      return null;
    }
    return new CapacitySummary(data.timezone, data.must_use_tax_base, this.getCapacitySummaryByDate(data), this.getCodePoolSummary(data));
  }

  private getCapacitySummaryByDate(data: CapacitySummaryData): CapacitySummaryByDate[] {
    return Object.entries(data.date_summaries).map(
      ([key, capacitySummary]: [
        string,
        {
          datetime_summaries: Record<string, CapacitySummaryByDatetimeData>;
        },
      ]) => {
        return new CapacitySummaryByDate(
          key,
          Object.entries(capacitySummary.datetime_summaries).map(([key, datetimeSummary]: [string, CapacitySummaryByDatetimeData]) => {
            return new CapacitySummaryByDatetime(
              key,
              datetimeSummary.sold_tickets,
              datetimeSummary.capacity,
              datetimeSummary.available_tickets,
              datetimeSummary.occupancy,
              datetimeSummary.reserved_unpaid_tickets,
              datetimeSummary.session_summaries.map((session: CapacitySummaryBySessionData) => {
                return new CapacitySummaryBySession(
                  session.id,
                  session.label,
                  session.starts_at,
                  session.ends_at,
                  session.expires_at,
                  session.has_seating,
                  session.is_hidden,
                  session.code_pool_id,
                  session.sold_tickets,
                  session.capacity,
                  session.available_tickets,
                  session.occupancy,
                  Money.fromData(session.ticket_price),
                  session.is_sold_out,
                  session.is_expired,
                  session.has_price_list_pricing,
                  session.ignore_time_slot_capacity,
                  session.use_for_availability,
                  session.reserved_unpaid_tickets,
                  session.blocked_tickets,
                  session.is_add_on,
                  session.is_pack,
                  this.getSessionSalesSummaries(session.session_sales_summaries),
                  null,
                  this.getSessionActionRules(session.incoming_rules),
                  this.getSessionActionRules(session.outgoing_rules),
                  session.ticket_price_tax_base
                    ? new Money(session.ticket_price_tax_base.amount, session.ticket_price_tax_base.currency)
                    : undefined,
                );
              }),
            );
          }),
        );
      },
    );
  }

  getSessionActionRules(rules: SessionActionRuleListItemDTO[] | null): SessionActionRuleListItem[] | null {
    if (!rules) {
      return null;
    }
    return rules.map((rule: SessionActionRuleListItemDTO) => ({
      id: rule.id,
      createdAt: new Date(rule.created_at),
      updatedAt: rule.updated_at ? new Date(rule.updated_at) : undefined,
      triggeredAt: rule.triggered_at_utc ? new Date(rule.triggered_at_utc) : undefined,
      error: rule.error,
      targetSessions: rule.target_sessions.map(session => ({
        id: session.id,
        label: session.label,
        ticketPrice: Money.fromData(session.ticket_price),
        startsAt: new Date(session.starts_at_utc),
      })),
      condition: {
        sourceSession: {
          id: rule.condition.source_session.id,
          label: rule.condition.source_session.label,
          ticketPrice: Money.fromData(rule.condition.source_session.ticket_price),
          startsAt: new Date(rule.condition.source_session.starts_at_utc),
        },
        conditionType: rule.condition.condition_type,
        availability: rule.condition.availability,
      },
      action:
        rule.action.action_type === ActionRuleActionType.UpdateVisibility
          ? { actionType: ActionRuleActionType.UpdateVisibility, hidden: (rule.action as ActionRuleActionUpdateVisibilityDTO).hidden }
          : { actionType: ActionRuleActionType.OpenPurchasabilityWindow },
    }));
  }

  getSessionSalesSummaries(packSummaries: SessionSalesSummaryData[] | null): SessionSalesSummary[] | null {
    if (!packSummaries) {
      return null;
    }
    return packSummaries.map(
      pack => new SessionSalesSummary(pack.pack_session_id, pack.pack_session_label, pack.sold_tickets, pack.reserved_unpaid_tickets),
    );
  }

  private getCodePoolSummary(data: CapacitySummaryData): Map<number, CapacityGroup> {
    const codePools: Map<number, CapacityGroup> = new Map();
    data.code_pool_summaries?.forEach((codePool: CodePoolSummaryData) => {
      codePools.set(
        codePool.id,
        new CapacityGroup(
          codePool.id.toString(),
          codePool.name,
          false, // Code pools from this endpoint are never asset-based; asset-based groups come via the time-slot sessions API
          codePool.created_at,
          codePool.is_cancelled,
          codePool.available_codes,
          codePool.used_codes,
          codePool.capacity,
          codePool.occupancy,
          null,
          codePool.group,
        ),
      );
    });
    return codePools;
  }
}
