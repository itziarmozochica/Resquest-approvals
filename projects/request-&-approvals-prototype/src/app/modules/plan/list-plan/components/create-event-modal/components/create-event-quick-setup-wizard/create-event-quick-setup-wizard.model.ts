import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';

import { ContentCategoryId, ContentVerticalId } from '../../models/content-questions.model';
import { QuickSetupEventType } from '../../models/quick-setup-form.model';
import { QuickSetupWizardStep } from './quick-setup-wizard-step.enum';

export type CreateEventQuickSetupWizardSource = 'events_list' | 'project_management';

export interface CreateEventQuickSetupWizardData {
  readonly eventType: QuickSetupEventType;
  readonly informationRequestId?: string;
  readonly resumePlanId?: number;
  // Defaults to 'events_list' when omitted.
  readonly source?: CreateEventQuickSetupWizardSource;
}

export interface CreateEventQuickSetupWizardResult {
  readonly completed: boolean;
  readonly planId: number | null;
}

export type CreateEventQuickSetupWizardCloseResult = CreateEventQuickSetupWizardResult | 'back';

export interface QuickSetupContentCategoryOption {
  id: ContentCategoryId;
  title: string;
  verticalId: ContentVerticalId;
}

export interface QuickSetupInventoryCurrencyState {
  readonly currency: string | null;
  readonly hasError: boolean;
  readonly isLoading: boolean;
}

export interface ModalToast {
  autoHide: boolean;
  id: string;
  message: string;
  sentiment: AlertSentiment;
  stepIndex?: QuickSetupWizardStep;
  testId: string;
}
