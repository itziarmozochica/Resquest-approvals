import { adaptPlanApi as adaptCorePlanApi } from '../../core/api-adapters/adapt-plan-api';
import type { SalesRoutingPlanApi } from '../models/api/sales-routing-response.model';
import type { Plan } from '../models/sales-routing.model';
import { adaptChannelApi } from './adapt-channel-api';

export function adaptPlanApi(plan: SalesRoutingPlanApi): Plan {
  return {
    ...adaptCorePlanApi(plan),
    channels: plan.channels.map(adaptChannelApi),
    cityName: plan.city_name,
    imageUrl: plan.image_url,
    // `place_name` is non-null in this feature; re-narrow core's `string | null` output.
    placeName: plan.place_name,
  };
}
