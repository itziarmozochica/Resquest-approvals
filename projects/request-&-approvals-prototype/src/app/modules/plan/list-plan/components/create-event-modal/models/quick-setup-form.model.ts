import { CreateMainPlanMediaItem } from '../../../../../../shared/services/plan/create-main-plan.service';
import { CreateEventEntryPoint } from '../../../../tracking/models/plan-tracking.model';
import { CreateEventType } from '../create-event.model';
import { ContentCategoryId } from './content-questions.model';
import { QuickSetupCategoryId } from './quick-setup-category.model';

export type QuickSetupEventType = Exclude<CreateEventType, 'showcase'>;

export type QuickSetupPlanCategoryId = ContentCategoryId | QuickSetupCategoryId;

export interface QuickSetupFormValues {
  category: QuickSetupPlanCategoryId;
  description: string;
  eventType: QuickSetupEventType;
  galleryMedia: CreateMainPlanMediaItem[];
  title: string;
  venueId: number;
  informationRequestId?: string;
  source?: CreateEventEntryPoint;
}
