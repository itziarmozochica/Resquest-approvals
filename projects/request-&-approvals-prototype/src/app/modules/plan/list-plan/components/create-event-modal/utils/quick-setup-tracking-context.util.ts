import { CreateEventEntryPoint, QuickSetupTrackingContext } from '../../../../tracking/models/plan-tracking.model';

export const DEFAULT_QUICK_SETUP_TRACKING_SOURCE: CreateEventEntryPoint = 'events_list';

export interface QuickSetupTrackingOrigin {
  informationRequestId?: string;
  resumePlanId?: number;
  source?: CreateEventEntryPoint;
}

export function buildQuickSetupTrackingContext(origin: QuickSetupTrackingOrigin): QuickSetupTrackingContext {
  return {
    // `!== undefined`, not truthiness: plan id `0` is a resume like any other.
    is_resume: origin.resumePlanId !== undefined,
    source: origin.source ?? DEFAULT_QUICK_SETUP_TRACKING_SOURCE,
    ...(origin.informationRequestId ? { information_request_id: origin.informationRequestId } : {}),
  };
}
