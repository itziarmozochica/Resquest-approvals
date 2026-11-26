import { DriveSyncStatus, isDriveSyncStopped } from '@fz-original/app/shared/models/drive-sync-status.enum';

import { ApprovalStatus } from '../models/approval-status.enum';
import { Approval, ApprovalAsset } from '../models/approval.model';

export type ApprovalResult = 'approved' | 'partial' | 'rejected';

const outdatedItemErrorCodes: ReadonlySet<string | number> = new Set([
  'approval_cancelled',
  'approval_not_found',
  'approval_not_open',
  'file_not_removable',
  'file_sync_not_failed',
  'file_sync_not_found',
  'item_not_found',
]);

/**
 * All item ids of an approval — assets, URL items and spreadsheet rows, including the files not in
 * Drive yet. approvalResult reads it, because the overall outcome counts every known item.
 */
export function collectApprovalItemIds(approval: Approval): string[] {
  return [...assetItemIds(approval), ...urlItemIds(approval), ...rowItemIds(approval)];
}

/**
 * The subset of collectApprovalItemIds a reviewer may decide from Fever Hub. A Ziflow folder is
 * decided in Ziflow and a file not in Drive yet cannot be decided at all, so a list-level action
 * leaves both out instead of pushing a decision for them. The full set still drives approvalResult.
 */
export function collectHubDecidableItemIds(approval: Approval): string[] {
  return [...hubDecidableAssetItemIds(approval), ...urlItemIds(approval), ...rowItemIds(approval)];
}

/**
 * Whether a reviewer may decide anything of this approval from Fever Hub. Derived from
 * collectHubDecidableItemIds so the two never disagree; the second clause keeps the
 * approval-level fallback for an approval that carries no items at all.
 */
export function hasHubDecidableItem(approval: Approval): boolean {
  return collectHubDecidableItemIds(approval).length > 0 || collectApprovalItemIds(approval).length === 0;
}

export function hasReachedReviewTool(asset: ApprovalAsset): boolean {
  return asset.isZiflow === true || asset.driveSyncStatus === DriveSyncStatus.IN_DRIVE;
}

export function isHubDecidableAsset(asset: ApprovalAsset): boolean {
  return asset.isZiflow !== true && asset.driveSyncStatus === DriveSyncStatus.IN_DRIVE;
}

export function isRemovableBeforeDrive(asset: ApprovalAsset): boolean {
  return asset.driveSyncStatus === DriveSyncStatus.SYNCING_TO_DRIVE || isDriveSyncStopped(asset.driveSyncStatus);
}

export function isOutdatedItemError(code: string | number): boolean {
  return outdatedItemErrorCodes.has(code);
}

export function driveSyncFingerprint(approval: Approval | null): string {
  return (approval?.assets ?? []).map(asset => `${asset.id}:${asset.driveSyncStatus}`).join('|');
}

export function hasDriveImportRunning(approval: Approval): boolean {
  return approval.assets.some((asset: ApprovalAsset) => asset.driveSyncStatus === DriveSyncStatus.IMPORTING_FROM_DRIVE);
}

/**
 * Aggregate outcome of a completed approval from its per-item decisions:
 * 'approved' (all approved), 'rejected' (all rejected) or 'partial' (a mix).
 * Returns null when no item has been decided yet.
 */
export function approvalResult(approval: Approval): ApprovalResult | null {
  const reviews = (approval.payload?.['item_reviews'] ?? {}) as Record<string, unknown>;
  const statusOf = (id: string): string | undefined => {
    const asset = approval.assets.find(item => item.id === id);
    if (asset?.reviewStatus) {
      return asset.reviewStatus;
    }
    // item_reviews entries are objects shaped like { status: 'APPROVED' | 'REJECTED' } (legacy: a bare string).
    const review = reviews[id];
    if (typeof review === 'string') {
      return review;
    }
    if (review && typeof review === 'object' && typeof (review as { status?: unknown }).status === 'string') {
      return (review as { status: string }).status;
    }
    return approval.rows.find(row => row.id === id)?.status;
  };
  const decided = collectApprovalItemIds(approval)
    .map(statusOf)
    .filter((status): status is string => status === ApprovalStatus.APPROVED || status === ApprovalStatus.REJECTED);
  if (decided.length === 0) {
    return null;
  }
  const hasApproved = decided.includes(ApprovalStatus.APPROVED);
  const hasRejected = decided.includes(ApprovalStatus.REJECTED);
  if (hasApproved && hasRejected) {
    return 'partial';
  }
  return hasRejected ? 'rejected' : 'approved';
}

function assetItemIds(approval: Approval): string[] {
  return approval.assets.map(asset => asset.id);
}

function hubDecidableAssetItemIds(approval: Approval): string[] {
  return approval.assets.filter(isHubDecidableAsset).map(asset => asset.id);
}

function urlItemIds(approval: Approval): string[] {
  const urls = approval.payload?.['urls'];
  if (!Array.isArray(urls)) {
    return [];
  }
  const ids: string[] = [];
  urls.forEach((rawUrl, index) => {
    if (formatValue(rawUrl).trim()) {
      ids.push(`url-${index}`);
    }
  });
  return ids;
}

function rowItemIds(approval: Approval): string[] {
  if (approval.rows.length > 0) {
    return approval.rows.map(row => row.id);
  }
  const preview = approval.payload?.['sheetPreview'];
  if (!hasPreviewRows(preview)) {
    return [];
  }
  const dataRowCount = preview.rows.length - 1; // first row is the header
  return Array.from({ length: dataRowCount }, (_, index) => `sheet-preview-${index}`);
}

function hasPreviewRows(value: unknown): value is { rows: unknown[] } {
  if (typeof value !== 'object' || value === null || !('rows' in value)) {
    return false;
  }
  const rows = (value as { rows?: unknown }).rows;
  return Array.isArray(rows) && rows.length > 1 && rows.every(row => Array.isArray(row));
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value
      .map(item => formatValue(item))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
