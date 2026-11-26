import { FzUploadProgress } from '@fz-original/app/modules/ir-approval/shared/models/fz-upload.model';
import { DriveSyncStatus, parseDriveSyncStatus } from '@fz-original/app/shared/models/drive-sync-status.enum';
import { parseEditHistory } from '@fz-original/app/shared/models/edit-history/edit-history.parser';

import {
  ApprovalApiDto,
  ApprovalAssetApiDto,
  ApprovalAssetImportProgressApiDto,
  ApprovalRowApiDto,
  ApprovalTimelineEntryApiDto,
  ReviewProgressApiDto,
} from './approval-api.model';
import { mapItemCommentsSummary } from './approval-item-comment.mapper';
import { ApprovalStatus } from './approval-status.enum';
import { ApprovalUploadMethod } from './approval-upload-method.enum';
import {
  Approval,
  ApprovalAction,
  ApprovalAsset,
  ApprovalReviewerDecision,
  ApprovalReviewProgress,
  ApprovalRow,
  ApprovalSheetSync,
  ApprovalSheetSyncStatus,
  ApprovalTimelineEntry,
} from './approval.model';

export function mapApprovalDtoToApproval(dto: ApprovalApiDto): Approval {
  return {
    id: dto.id,
    // The API serializes the owning project as `project_id`; fall back to the legacy `launch_id`.
    launchId: dto.project_id ?? dto.launch_id ?? '',
    partnerId: dto.partner_id,
    status: parseApprovalStatus(dto.status),
    availableActions: parseActions(dto.available_actions, dto.status),
    uploadMethod: parseUploadMethod(dto.upload_method),
    driveUrl: dto.drive_url,
    driveFolderId: dto.drive_folder_id ?? undefined,
    driveFolderUrl: dto.drive_folder_url ?? undefined,
    isHubPermissionsEnabled: dto.hub_permissions_enabled ?? false,
    title: dto.title,
    category: dto.approval_type,
    description: dto.description ?? '',
    dueDate: dto.due_date ?? undefined,
    payload: dto.payload,
    sheetSync: mapSheetSync(dto.payload),
    assets: mapAssets(dto),
    rows: (dto.rows ?? []).map(mapRow),
    timeline: (dto.timeline ?? []).map(mapTimelineEntry),
    createdBy: dto.created_by,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
    editHistory: parseEditHistory(dto.edit_history),
    skippedDriveFiles: dto.skipped_drive_files ?? [],
    alertConfig: dto.alert_config ?? null,
    pendingRequiredItemIds: dto.pending_required_item_ids ?? [],
    reviewProgressByItem: mapReviewProgressByItem(dto.review_progress_by_item),
    ownCanReview: dto.own_can_review !== false,
    itemComments: mapItemCommentsSummary(dto.item_comments),
  };
}

export function mapAsset(dto: ApprovalAssetApiDto): ApprovalAsset {
  return {
    id: dto.id,
    fileName: dto.file_name,
    fileSize: dto.file_size,
    folderPath: parseFolderPath(dto.folder_path),
    driveFileId: dto.drive_file_id,
    driveUrl: dto.drive_url,
    driveSyncStatus: parseDriveSyncStatus(dto.drive_sync_status),
    hasS3Copy: dto.has_s3_copy === true,
    mimeType: dto.mime_type ?? null,
    importProgress: parseImportProgress(dto.import_progress),
    isDriveLinkImport: dto.import_progress !== undefined,
    isZiflow: dto.is_ziflow,
    folderId: dto.folder_id,
    thumbnailUrl: dto.thumbnail_url,
    reviewStatus: dto.review_status ? parseApprovalStatus(dto.review_status) : undefined,
    reviewFeedback: dto.review_feedback,
    reviewerEmail: dto.reviewer_email,
    reviewedAt: dto.reviewed_at,
    uploadedAt: new Date(dto.uploaded_at),
  };
}

function mapAssets(dto: ApprovalApiDto): ApprovalAsset[] {
  const assets = (dto.assets ?? []).map(mapAsset);
  return assets.length > 0 ? assets : mapPayloadFiles(dto.payload, dto.updated_at);
}

function mapPayloadFiles(payload: Record<string, unknown> | undefined, fallbackUploadedAt: string): ApprovalAsset[] {
  const files = payload?.['files'];
  if (!Array.isArray(files)) {
    return [];
  }

  return files.flatMap((file: unknown): ApprovalAsset[] => {
    if (!isPayloadFile(file)) {
      return [];
    }
    return [
      {
        id: file.drive_file_id,
        fileName: file.original_name ?? 'File',
        fileSize: file.size_bytes ?? 0,
        folderPath: parseFolderPath(file.folder_path),
        driveFileId: file.drive_file_id,
        driveUrl: file.web_view_link,
        driveSyncStatus: DriveSyncStatus.IN_DRIVE,
        hasS3Copy: false,
        mimeType: file.mime_type ?? null,
        reviewStatus: payloadItemReviewStatus(payload, file.drive_file_id),
        uploadedAt: new Date(file.uploaded_at ?? fallbackUploadedAt),
      },
    ];
  });
}

function payloadItemReviewStatus(payload: Record<string, unknown> | undefined, itemId: string): ApprovalStatus | undefined {
  const reviews = payload?.['item_reviews'];
  if (!reviews || typeof reviews !== 'object') {
    return undefined;
  }
  const review = (reviews as Record<string, unknown>)[itemId];
  if (!review || typeof review !== 'object') {
    return undefined;
  }
  const status = (review as Record<string, unknown>)['status'];
  return typeof status === 'string' ? parseApprovalStatus(status) : undefined;
}

function isPayloadFile(value: unknown): value is {
  drive_file_id: string;
  original_name?: string;
  size_bytes?: number;
  web_view_link?: string;
  mime_type?: string;
  uploaded_at?: string;
  folder_path?: unknown;
} {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const file = value as Record<string, unknown>;
  return typeof file['drive_file_id'] === 'string';
}

// Legacy assets carry no folder_path; anything malformed degrades to root so old approvals render flat.
function parseFolderPath(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((segment): segment is string => typeof segment === 'string' && segment.length > 0);
}

function parseImportProgress(value: ApprovalAssetImportProgressApiDto | null | undefined): FzUploadProgress | null {
  if (
    value === null ||
    value === undefined ||
    !Number.isInteger(value.done) ||
    !Number.isInteger(value.total) ||
    value.done < 0 ||
    value.total <= 0
  ) {
    return null;
  }
  return { done: Math.min(value.done, value.total), total: value.total };
}

function mapSheetSync(payload: Record<string, unknown> | undefined): ApprovalSheetSync | undefined {
  const raw = payload?.['sheet_sync'];
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const data = raw as Record<string, unknown>;
  const status = data['status'];
  if (status !== 'SYNCED' && status !== 'FAILED' && status !== 'SKIPPED') {
    return undefined;
  }
  return {
    status: status as ApprovalSheetSyncStatus,
    error: payloadString(data, 'error') ?? undefined,
    errorCode: payloadString(data, 'error_code') ?? undefined,
    serviceAccountEmail: payloadString(data, 'service_account_email') ?? undefined,
    lastAttemptAt: payloadString(data, 'last_attempt_at') ?? undefined,
  };
}

function payloadString(payload: Record<string, unknown> | undefined, key: string): string | null {
  const value = payload?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function mapRow(dto: ApprovalRowApiDto): ApprovalRow {
  return {
    id: dto.id,
    rowIndex: dto.row_index,
    values: dto.values,
    status: parseApprovalStatus(dto.status),
    comment: dto.comment,
  };
}

function mapTimelineEntry(dto: ApprovalTimelineEntryApiDto): ApprovalTimelineEntry {
  return {
    id: dto.id,
    status: parseApprovalStatus(dto.status),
    authorEmail: dto.author_email,
    comment: dto.comment,
    occurredAt: new Date(dto.occurred_at),
  };
}

export function mapReviewProgressByItem(
  dto: Record<string, ReviewProgressApiDto> | null | undefined,
): Record<string, ApprovalReviewProgress> {
  const out: Record<string, ApprovalReviewProgress> = {};
  for (const [itemId, entry] of Object.entries(dto ?? {})) {
    const progress = mapReviewProgress(entry);
    if (progress) {
      out[itemId] = progress;
    }
  }
  return out;
}

export function mapReviewProgress(dto: ReviewProgressApiDto | null | undefined): ApprovalReviewProgress | undefined {
  if (!dto || typeof dto !== 'object') {
    return undefined;
  }
  const reviewers = Array.isArray(dto.reviewers) ? dto.reviewers.flatMap(mapReviewerDecision) : [];
  return {
    mode: dto.mode === 'only_one' ? 'only_one' : 'everyone',
    ownDecision: parseZiflowOwnDecision(dto.own_decision),
    ownCanDecide: dto.own_can_decide !== false,
    ownReachesZiflow: dto.own_reaches_ziflow !== false,
    decidedReviewers: count(dto.decided_reviewers),
    totalReviewers: count(dto.total_reviewers),
    reviewers,
  };
}

function mapReviewerDecision(dto: unknown): ApprovalReviewerDecision[] {
  if (!dto || typeof dto !== 'object') {
    return [];
  }
  const raw = dto as {
    email?: unknown;
    ziflow_decision?: unknown;
    decided_at?: unknown;
    feedback?: unknown;
    is_me?: unknown;
  };
  const email = typeof raw.email === 'string' ? raw.email.trim() : '';
  if (!email) {
    return [];
  }
  return [
    {
      email,
      ziflowDecision: nonEmpty(raw.ziflow_decision),
      decidedAt: nonEmpty(raw.decided_at),
      feedback: nonEmpty(raw.feedback),
    },
  ];
}

// Only a decision the reviewer can act on: parseApprovalStatus would turn anything else into DRAFT.
function parseZiflowOwnDecision(value: unknown): ApprovalStatus | undefined {
  if (value === ApprovalStatus.APPROVED || value === ApprovalStatus.REJECTED) {
    return value;
  }
  return undefined;
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

export function parseApprovalStatus(value: string): ApprovalStatus {
  if (value === 'PENDING') {
    return ApprovalStatus.IN_REVIEW;
  }
  if (value === 'FEEDBACK') {
    return ApprovalStatus.CHANGES_REQUESTED;
  }
  return Object.values(ApprovalStatus).includes(value as ApprovalStatus) ? (value as ApprovalStatus) : ApprovalStatus.DRAFT;
}

function parseActions(values: string[] | undefined, status: string): ApprovalAction[] {
  const actions = Array.isArray(values) ? values.filter(isApprovalAction) : [];
  if (actions.length > 0) {
    return actions;
  }
  if (status === 'PENDING' || status === 'FEEDBACK') {
    return ['approve', 'reject', 'request_changes'];
  }
  if (status === 'DRAFT') {
    return ['inform_open'];
  }
  return [];
}

function isApprovalAction(value: string): value is ApprovalAction {
  return value === 'approve' || value === 'reject' || value === 'request_changes' || value === 'inform_open';
}

function parseUploadMethod(value: string): ApprovalUploadMethod {
  return Object.values(ApprovalUploadMethod).includes(value as ApprovalUploadMethod)
    ? (value as ApprovalUploadMethod)
    : ApprovalUploadMethod.COMPUTER;
}
