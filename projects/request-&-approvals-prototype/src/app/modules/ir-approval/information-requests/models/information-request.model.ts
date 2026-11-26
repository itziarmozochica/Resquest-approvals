import { AlertConfigPayload } from '@fz-original/app/modules/ir-approval/shared/models/alert-config.model';
import { DriveSyncStatus } from '@fz-original/app/shared/models/drive-sync-status.enum';
import { EntityEditHistoryEntry } from '@fz-original/app/shared/models/edit-history/edit-history.model';

import { InformationRequestQuestion } from './information-request-question.model';
import { InformationRequestStatus } from './information-request-status.enum';
import { InformationRequestType } from './information-request-type.enum';
import { IrFormLayout } from './ir-form-layout.model';
import { StepperTemplate } from './stepper-template.model';

export interface InformationRequestAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  driveFileId?: string;
  driveUrl?: string;
  driveSyncStatus: DriveSyncStatus;
  uploadedAt: Date;
}

export interface InformationRequestTimelineEntry {
  id: string;
  status: InformationRequestStatus;
  authorEmail: string;
  comment?: string;
  occurredAt: Date;
}

export interface InformationRequest {
  id: string;
  launchId: string;
  partnerId: number;
  mainPlanId?: number | null;
  type: InformationRequestType;
  title: string;
  description?: string;
  status: InformationRequestStatus;
  attachments: InformationRequestAttachment[];
  timeline: InformationRequestTimelineEntry[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  serviceId?: string | null;
  serviceName?: string | null;
  templateKey?: string | null;
  dueDate?: string | null;
  driveFolderId?: string | null;
  driveFolderUrl?: string | null;
  isHubPermissionsEnabled: boolean;
  questions?: InformationRequestQuestion[];
  layout?: IrFormLayout | null;
  referencedStepperTemplates?: Record<string, StepperTemplate>;
  editHistory: EntityEditHistoryEntry[];
  alertConfig?: AlertConfigPayload | null;
  quickSetupEnabled: boolean;
  aiDeclarationEnabled: boolean;
  aiGenerated: boolean;
  quickSetupUsed: boolean;
  advancedSetupUsed: boolean;
  canCreateMainPlan: boolean;
  canResumeQuickSetup: boolean;
}
