import { AlertConfigPayload } from '@fz-original/app/modules/ir-approval/shared/models/alert-config.model';
import { EditHistoryEntryApiDto } from '@fz-original/app/shared/models/edit-history/edit-history-api.model';

import { InformationRequestQuestionApiDto } from './information-request-question.model';
import { IrFormLayoutApiDto } from './ir-form-layout.model';
import { StepperTemplateApiDto } from './stepper-template.model';

export interface InformationRequestAttachmentApiDto {
  id: string;
  file_name: string;
  file_size: number;
  drive_file_id?: string;
  drive_url?: string;
  drive_sync_status?: string;
  uploaded_at: string;
}

export interface InformationRequestTimelineEntryApiDto {
  id: string;
  status: string;
  author_email: string;
  comment?: string;
  occurred_at: string;
}

export interface InformationRequestApiDto {
  id: string;
  launch_id: string;
  project_id?: string;
  main_plan_id?: number | null;
  partner_id: number;
  type: string;
  title: string;
  description?: string;
  status: string;
  attachments: InformationRequestAttachmentApiDto[];
  timeline: InformationRequestTimelineEntryApiDto[];
  created_by: string;
  created_at: string;
  updated_at: string;
  service_id?: string | null;
  service_name?: string | null;
  template_key?: string | null;
  due_date?: string | null;
  drive_folder_id?: string | null;
  drive_folder_url?: string | null;
  hub_permissions_enabled?: boolean;
  questions?: InformationRequestQuestionApiDto[];
  layout?: IrFormLayoutApiDto;
  referenced_stepper_templates?: StepperTemplateApiDto[];
  edit_history?: EditHistoryEntryApiDto[];
  alert_config?: AlertConfigPayload | null;
  quick_setup_enabled?: boolean;
  ai_declaration_enabled?: boolean;
  ai_generated?: boolean;
  quick_setup_used?: boolean;
  advanced_setup_used?: boolean;
  can_create_main_plan?: boolean;
  can_resume_quick_setup?: boolean;
}

export interface InformationRequestsListApiResponse {
  information_requests: InformationRequestApiDto[];
}
