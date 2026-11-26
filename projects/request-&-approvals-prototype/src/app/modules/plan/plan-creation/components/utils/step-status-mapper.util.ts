import { Step } from '@ignite/legacy/components/ignt-stepper/ignt.stepper.model';

import { SetupCard } from '../plan-setup/plan-setup.model';
import { StepStatus } from './step-status.enum';

export type SetupCardStatus = SetupCard['status'];

export type CurrentStepId = 'content' | 'settings' | 'inventory';

export function mapCardStatusToStepStatus(cardStatus: SetupCardStatus, isCurrentStep: boolean): Step['status'] {
  if (isCurrentStep) {
    return StepStatus.ACTIVE;
  }

  switch (cardStatus) {
    case 'completed':
      return StepStatus.COMPLETED;
    case 'in-progress':
      return StepStatus.STARTED;
    case 'not-started':
    default:
      return StepStatus.INACTIVE;
  }
}
