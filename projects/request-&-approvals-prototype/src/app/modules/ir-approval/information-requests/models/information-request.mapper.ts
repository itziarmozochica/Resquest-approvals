import { parseDriveSyncStatus } from '@fz-original/app/shared/models/drive-sync-status.enum';
import { parseEditHistory } from '@fz-original/app/shared/models/edit-history/edit-history.parser';

import {
  InformationRequestApiDto,
  InformationRequestAttachmentApiDto,
  InformationRequestTimelineEntryApiDto,
} from './information-request-api.model';
import { mapInformationRequestQuestionDto } from './information-request-question.model';
import { InformationRequestStatus } from './information-request-status.enum';
import { InformationRequestType } from './information-request-type.enum';
import { InformationRequest, InformationRequestAttachment, InformationRequestTimelineEntry } from './information-request.model';
import { mapIrFormLayoutDto } from './ir-form-layout.model';
import { mapStepperTemplateDto, StepperTemplate } from './stepper-template.model';

export function mapInformationRequestDtoToInformationRequest(dto: InformationRequestApiDto): InformationRequest {
  return {
    id: dto.id,
    // The API serializes the owning project as `project_id`; fall back to the legacy `launch_id`.
    launchId: dto.project_id ?? dto.launch_id ?? '',
    partnerId: dto.partner_id,
    mainPlanId: dto.main_plan_id ?? null,
    type: parseType(dto.type),
    title: dto.title,
    description: dto.description,
    status: parseStatus(dto.status),
    attachments: (dto.attachments ?? []).map(mapAttachment),
    timeline: (dto.timeline ?? []).map(mapTimelineEntry),
    createdBy: dto.created_by,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
    serviceId: dto.service_id ?? null,
    serviceName: dto.service_name ?? null,
    templateKey: dto.template_key ?? null,
    dueDate: dto.due_date ?? null,
    driveFolderId: dto.drive_folder_id ?? null,
    driveFolderUrl: dto.drive_folder_url ?? null,
    isHubPermissionsEnabled: dto.hub_permissions_enabled ?? false,
    questions: (dto.questions ?? []).map(mapInformationRequestQuestionDto),
    editHistory: parseEditHistory(dto.edit_history),
    alertConfig: dto.alert_config ?? null,
    quickSetupEnabled: dto.quick_setup_enabled ?? false,
    aiDeclarationEnabled: dto.ai_declaration_enabled ?? false,
    aiGenerated: dto.ai_generated ?? false,
    quickSetupUsed: dto.quick_setup_used ?? false,
    advancedSetupUsed: dto.advanced_setup_used ?? false,
    canCreateMainPlan: dto.can_create_main_plan ?? false,
    canResumeQuickSetup: dto.can_resume_quick_setup ?? false,
    ...(dto.layout ? { layout: mapIrFormLayoutDto(dto.layout) } : {}),
    ...(dto.referenced_stepper_templates?.length
      ? { referencedStepperTemplates: mapReferencedStepperTemplates(dto.referenced_stepper_templates) }
      : {}),
  };
}

function mapReferencedStepperTemplates(
  dtos: import('./information-request-api.model').InformationRequestApiDto['referenced_stepper_templates'],
): Record<string, StepperTemplate> {
  const out: Record<string, StepperTemplate> = {};
  for (const dto of dtos ?? []) {
    const template = mapStepperTemplateDto(dto);
    out[template.key] = template;
  }
  return out;
}

export function mapAttachment(dto: InformationRequestAttachmentApiDto): InformationRequestAttachment {
  return {
    id: dto.id,
    fileName: dto.file_name,
    fileSize: dto.file_size,
    driveFileId: dto.drive_file_id,
    driveUrl: dto.drive_url,
    driveSyncStatus: parseDriveSyncStatus(dto.drive_sync_status),
    uploadedAt: new Date(dto.uploaded_at),
  };
}

function mapTimelineEntry(dto: InformationRequestTimelineEntryApiDto): InformationRequestTimelineEntry {
  return {
    id: dto.id,
    status: parseStatus(dto.status),
    authorEmail: dto.author_email,
    comment: dto.comment,
    occurredAt: new Date(dto.occurred_at),
  };
}

function parseStatus(value: string): InformationRequestStatus {
  return Object.values(InformationRequestStatus).includes(value as InformationRequestStatus)
    ? (value as InformationRequestStatus)
    : InformationRequestStatus.PENDING;
}

function parseType(value: string): InformationRequestType {
  return Object.values(InformationRequestType).includes(value as InformationRequestType)
    ? (value as InformationRequestType)
    : InformationRequestType.OTHER;
}
