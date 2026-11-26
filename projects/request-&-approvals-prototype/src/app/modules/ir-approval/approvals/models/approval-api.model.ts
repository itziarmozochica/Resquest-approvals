import { AlertConfigPayload } from '@fz-original/app/modules/ir-approval/shared/models/alert-config.model';
import { EditHistoryEntryApiDto } from '@fz-original/app/shared/models/edit-history/edit-history-api.model';

export interface ReviewerDecisionApiDto {
  email: string;
  ziflow_decision?: string | null;
  decided_at?: string | null;
  feedback?: string | null;
  is_me?: boolean;
}

export interface ReviewProgressApiDto {
  mode?: string | null;
  own_decision?: string | null;
  own_decided_at?: string | null;
  own_can_decide?: boolean;
  own_reaches_ziflow?: boolean;
  decided_reviewers?: number;
  total_reviewers?: number;
  reviewers?: ReviewerDecisionApiDto[];
}

export interface ApprovalAssetImportProgressApiDto {
  done: number;
  total: number;
}

export interface ApprovalAssetApiDto {
  id: string;
  file_name: string;
  file_size: number;
  folder_path?: string[] | null;
  drive_file_id?: string;
  drive_url?: string;
  drive_sync_status?: string;
  has_s3_copy?: boolean;
  mime_type?: string | null;
  import_progress?: ApprovalAssetImportProgressApiDto | null;
  is_ziflow?: boolean;
  folder_id?: string;
  thumbnail_url?: string | null;
  review_status?: string;
  review_feedback?: string;
  reviewer_email?: string;
  reviewed_at?: string;
  uploaded_at: string;
}

export interface ApprovalRowApiDto {
  id: string;
  row_index: number;
  values: Record<string, string | number | null>;
  status: string;
  comment?: string;
}

export interface ApprovalTimelineEntryApiDto {
  id: string;
  status: string;
  author_email: string;
  comment?: string;
  occurred_at: string;
}

export interface ApprovalMentionableApiDto {
  email: string;
  name?: string | null;
  has_access?: boolean | null;
}

export interface ApprovalItemCommentsSummaryApiDto {
  enabled?: boolean;
  can_post?: boolean;
  counts?: Record<string, number> | null;
  mentionable?: ApprovalMentionableApiDto[] | null;
}

export interface ApprovalItemCommentApiDto {
  id: string;
  item_id: string;
  author_email: string;
  author_name?: string | null;
  body: string;
  kind?: string | null;
  mentioned_emails?: string[] | null;
  created_at: string;
  edited_at?: string | null;
  unnotified_mention_emails?: string[] | null;
}

export interface ApprovalItemCommentMentionAccessGrantApiDto extends ApprovalItemCommentApiDto {
  access_granted?: boolean | null;
}

export interface ApprovalItemCommentsApiResponse {
  comments: ApprovalItemCommentApiDto[];
}

export interface ApprovalApiDto {
  id: string;
  launch_id?: string;
  project_id?: string | null;
  partner_id: number;
  status: string;
  available_actions?: string[];
  upload_method: string;
  drive_url?: string;
  drive_folder_id?: string | null;
  drive_folder_url?: string | null;
  hub_permissions_enabled?: boolean;
  title?: string;
  approval_type?: string;
  description?: string;
  due_date?: string | null;
  payload?: Record<string, unknown>;
  assets: ApprovalAssetApiDto[];
  rows: ApprovalRowApiDto[];
  timeline: ApprovalTimelineEntryApiDto[];
  created_by: string;
  created_at: string;
  updated_at: string;
  edit_history?: EditHistoryEntryApiDto[];
  skipped_drive_files?: string[];
  alert_config?: AlertConfigPayload | null;
  pending_required_item_ids?: string[];
  review_progress_by_item?: Record<string, ReviewProgressApiDto> | null;
  own_can_review?: boolean | null;
  item_comments?: ApprovalItemCommentsSummaryApiDto | null;
}

export interface ApprovalsListApiResponse {
  approvals: ApprovalApiDto[];
}
