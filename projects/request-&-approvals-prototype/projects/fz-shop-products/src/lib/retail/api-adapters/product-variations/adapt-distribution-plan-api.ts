import { adaptPlanApi } from '../../../core/api-adapters/adapt-plan-api';
import type { DistributionPlanApi } from '../../models/api/product-variations/distributions-response.model';
import type { DistributionPlan } from '../../models/product-variations/distributions.model';
import { adaptDistributionChannelApi } from './adapt-distribution-channel-api';

export function adaptDistributionPlanApi(plan: DistributionPlanApi): DistributionPlan {
  return {
    ...adaptPlanApi(plan),
    channels: plan.channels.map(adaptDistributionChannelApi),
    cityId: plan.city_id,
    hasActiveSession: plan.has_active_session ?? false,
    productTypeLabel: plan.product_type_label,
    sessionTypeId: plan.session_type_id,
    venueId: plan.venue_id,
  };
}
