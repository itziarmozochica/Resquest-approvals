import { BaseErrorResponse } from '../../../shared/models/base-response';
import type { DuplicatePlanSource } from '../tracking/models/plan-tracking.model';

export interface DuplicatePlanParams {
  planId: number;
  planName: string;
  source: DuplicatePlanSource;
}

export interface DuplicatePlanResponseBody {
  id: number;
}

export interface DuplicatePlanSuccess {
  planId: number;
  planName: string;
  source: DuplicatePlanSource;
  duplicatedPlanId: number;
}

export const GENERIC_ERROR: BaseErrorResponse = {
  code: 'GENERIC_ERROR',
  message: 'errors.generic',
};
