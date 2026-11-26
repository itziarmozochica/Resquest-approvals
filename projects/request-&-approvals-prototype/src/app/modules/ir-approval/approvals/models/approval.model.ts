import { AlertConfigPayload } from '@fz-original/app/modules/ir-approval/shared/models/alert-config.model';
import { FzUploadProgress } from '@fz-original/app/modules/ir-approval/shared/models/fz-upload.model';
import { DriveSyncStatus } from '@fz-original/app/shared/models/drive-sync-status.enum';
import { EntityEditHistoryEntry } from '@fz-original/app/shared/models/edit-history/edit-history.model';

import { ApprovalItemCommentsSummary } from './approval-item-comment.model';
import { ApprovalStatus } from './approval-status.enum';
import { ApprovalUploadMethod } from './approval-upload-method.enum';

export interface ApprovalReviewerDecision {
  email: string;
  ziflowDecision?: string;
  decidedAt?: string;
  feedback?: string;
}

export type ApprovalValidationMode = 'only_one' | 'everyone';

export interface ApprovalReviewProgress {
  mode: ApprovalValidationMode;
  ownDecision?: ApprovalStatus;
  ownCanDecide: boolean;
  ownReachesZiflow: boolean;
  decidedReviewers: number;
  totalReviewers: number;
  reviewers: ApprovalReviewerDecision[];
}

export interface ApprovalAsset {
  id: string;
  fileName: string;
  fileSize: number;
  /** Folder segments relative to the linked source root; empty/absent for root-level and legacy assets. */
  folderPath?: string[];
  driveFileId?: string;
  driveUrl?: string;
  driveSyncStatus: DriveSyncStatus;
  hasS3Copy?: boolean;
  mimeType?: string | null;
  importProgress?: FzUploadProgress | null;
  isDriveLinkImport?: boolean;
  isZiflow?: boolean;
  folderId?: string;
  thumbnailUrl?: string | null;
  reviewStatus?: ApprovalStatus;
  reviewFeedback?: string;
  reviewerEmail?: string;
  reviewedAt?: string;
  uploadedAt: Date;
}

export interface ApprovalRow {
  id: string;
  rowIndex: number;
  values: Record<string, string | number | null>;
  status: ApprovalStatus;
  comment?: string;
}

export interface ApprovalTimelineEntry {
  id: string;
  status: ApprovalStatus;
  authorEmail: string;
  comment?: string;
  occurredAt: Date;
}

export type ApprovalAction = 'approve' | 'reject' | 'request_changes' | 'inform_open';

export type ApprovalSheetSyncStatus = 'SYNCED' | 'FAILED' | 'SKIPPED';

export interface ApprovalSheetSync {
  status: ApprovalSheetSyncStatus;
  error?: string;
  errorCode?: string;
  serviceAccountEmail?: string;
  lastAttemptAt?: string;
}

export interface Approval {
  id: string;
  launchId: string;
  partnerId: number;
  status: ApprovalStatus;
  availableActions: ApprovalAction[];
  uploadMethod: ApprovalUploadMethod;
  driveUrl?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  isHubPermissionsEnabled: boolean;
  title?: string;
  category?: string;
  description: string;
  dueDate?: string;
  payload?: Record<string, unknown>;
  sheetSync?: ApprovalSheetSync;
  assets: ApprovalAsset[];
  rows: ApprovalRow[];
  timeline: ApprovalTimelineEntry[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  editHistory: EntityEditHistoryEntry[];
  skippedDriveFiles: string[];
  alertConfig?: AlertConfigPayload | null;
  /** Required items still undecided, as computed by the backend. Empty means the next decision completes nothing. */
  pendingRequiredItemIds: string[];
  reviewProgressByItem: Record<string, ApprovalReviewProgress>;
  /**
   * Whether the viewer is one of the approval's reviewers, as resolved by the backend from the same
   * roster it uses to refuse a decision. Absent or `null` maps to `true`, so a backend that does not
   * report it yet offers the validation controls exactly as before.
   */
  ownCanReview: boolean;
  itemComments: ApprovalItemCommentsSummary;
}
