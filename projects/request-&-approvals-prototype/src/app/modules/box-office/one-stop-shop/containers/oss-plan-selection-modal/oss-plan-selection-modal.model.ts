import type { Plan } from '@fz-original/app/shared/models/plan/plan.model';

import type { OSSPlanConfig } from '../../models';

export interface OssPlanSelectionModalData {
  currentPlanConfig: OSSPlanConfig | null;
  disabledPlanIds?: Set<number> | number[];
  hasCloseButton: boolean;
  plans: Plan[];
}

export type OssPlanSelectionModalResult = OSSPlanConfig;
