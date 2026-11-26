import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import {
  PlanLiveAnalytics,
  PlanLiveAnalyticsDTO,
  PlanLiveStatus,
  PlanLiveStatusAndAnalytics,
  PlanLiveStatusAndAnalyticsDTO,
  PlanLiveStatusDTO,
} from '../../models/plan/plan.model';
import { BasePlanAdapter } from './base-plan.adapter';

@Injectable({
  providedIn: 'root',
})
export class PlanLiveStatusAndAnalyticsAdapter
  extends BasePlanAdapter
  implements AdapterInterface<PlanLiveStatusAndAnalytics, PlanLiveStatusAndAnalyticsDTO>
{
  fromApi(body: PlanLiveStatusAndAnalyticsDTO): PlanLiveStatusAndAnalytics {
    return this.#getData(body);
  }

  #getData({ status, analytics }: PlanLiveStatusAndAnalyticsDTO): PlanLiveStatusAndAnalytics {
    return {
      status: this.#parseStatus(status),
      analytics: this.#parseAnalytics(analytics),
    };
  }

  #parseAnalytics({ gross_revenue, paid_tickets_sold, free_tickets_sold, add_ons_sold }: PlanLiveAnalyticsDTO): PlanLiveAnalytics {
    return {
      grossRevenue: gross_revenue,
      paidTicketsSold: paid_tickets_sold,
      freeTicketsSold: free_tickets_sold,
      addOnsSold: add_ons_sold,
    };
  }

  #parseStatus({ status, is_active, is_hidden_feed, is_sold_out, published_at }: PlanLiveStatusDTO): PlanLiveStatus {
    return {
      status: status,
      isActive: is_active,
      isHiddenFeed: is_hidden_feed,
      isSoldOut: is_sold_out,
      publishedAt: published_at ? new Date(published_at) : null,
    };
  }
}
