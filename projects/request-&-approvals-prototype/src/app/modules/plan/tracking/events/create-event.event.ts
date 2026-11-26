import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { CreateEventEntryPoint, CreateEventFlow } from '../models/plan-tracking.model';

export interface CreateEventData {
  eventType: string;
  flow: CreateEventFlow;
  informationRequestId?: string;
  /** Only the quick flow spreads a `QuickSetupTrackingContext` in here; the advanced flow has no resume notion. */
  isResume?: boolean;
  planId: number;
  source?: CreateEventEntryPoint;
}

export const createEvent = defineEvent<CreateEventData>('create.event');
