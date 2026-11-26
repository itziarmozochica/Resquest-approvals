import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { PlanSaveContext } from '../models/plan-tracking.model';

export interface SaveMainPlanSettingsData {
  planId: number;
  planName: string;
  allowTicketCancellations?: boolean;
  calendarSelector?: boolean;
  cities?: number[];
  context?: PlanSaveContext;
  continuousTimeSelector?: boolean;
  denyPublishingInOta?: boolean;
  disallowIndexing?: boolean;
  hasPriceListPricing?: boolean;
  hoursBeforeSessionCancellationNotAllowed?: number;
  mustUseTaxBase?: boolean;
  overrideCapacityLimit?: number | null;
  requestGeneralReview?: string;
  selectorSettingType?: string;
  sessionSelectorType?: string;
  transportEnabled?: boolean;
  transportExternalEventId?: string | null;
  transportProviderId?: number | null;
  validationMethod?: string;
  validationWindow?: string;
}

export const saveMainPlanSettings = defineEvent<SaveMainPlanSettingsData>('save.mainPlanSettings');
