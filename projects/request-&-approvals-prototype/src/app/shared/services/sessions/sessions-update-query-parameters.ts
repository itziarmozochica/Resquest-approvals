import { SessionCapacityChange, SessionChange, SessionPricingChange, SessionSalesChange } from './session-resource-change.model';
import { SessionResource } from './session-resource.model';

export interface SessionsUpdateQuery {
  partnerId: number;
  planId: number;
  sessionId: number;
  resource?: SessionResource;
  change: SessionCapacityChange | SessionSalesChange | SessionPricingChange | SessionChange;
}
