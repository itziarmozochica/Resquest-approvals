import { AlertConfigPayload } from '@fz-original/app/modules/ir-approval/shared/models/alert-config.model';

import {
  isSheetBasedSubtype,
  isUrlBasedSubtype,
  SubtypePayloadValue,
  toApprovalPayload,
} from '../../components/subtype-payload-editor/subtype-payload-editor.types';
import {
  ApprovalSubtypePayloadFormValue,
  subtypePayloadValueFromForm,
} from '../../components/subtype-payload-editor/subtype-payload-form.util';
import { ApprovalDriveFileSelection, isApprovalDriveFileSelectionActive } from '../../models/approval-drive-file.model';
import { ApprovalUploadMethod } from '../../models/approval-upload-method.enum';
import { CreateApprovalPayload } from '../../services/approvals.service';

export interface ApprovalFormSnapshot {
  title: string;
  category: string;
  subtype: string;
  description: string;
  dueDate: string;
  marketingRequestLink: string;
  specificCampaignName: string;
  specificCampaignStartDate: string;
  specificCampaignEndDate: string;
  subtypePayload: ApprovalSubtypePayloadFormValue;
  assetIds: string[];
  assetRelativePaths: Record<string, string>;
  driveFiles: ApprovalDriveFileSelection[];
  ziflowFolder: string | null;
  ziflowFolderThumbnail: string | null;
}

export interface BuildPayloadOptions {
  alertConfig: AlertConfigPayload | null | undefined;
  saveAsDraft: boolean;
  supersedeId: string | null;
}

/** Marketing campaign-context fields, serialized into the free-form approval payload. */
export function buildCampaignPayload(
  isMarketing: boolean,
  link: string,
  name: string,
  startDate: string,
  endDate: string,
): Record<string, unknown> {
  if (!isMarketing || !link) {
    return {};
  }
  const out: Record<string, unknown> = { marketingRequestLink: link };
  if (link === 'specific') {
    if (name.trim()) {
      out.specificCampaignName = name.trim();
    }
    if (startDate.trim()) {
      out.specificCampaignStartDate = startDate.trim();
    }
    if (endDate.trim()) {
      out.specificCampaignEndDate = endDate.trim();
    }
  }
  return out;
}

/** Assembles the create-approval request body from the wizard form snapshot. */
export function buildApprovalCreatePayload(
  snapshot: ApprovalFormSnapshot,
  isMarketing: boolean,
  options: BuildPayloadOptions,
): CreateApprovalPayload {
  const driveFiles = snapshot.driveFiles.filter(isApprovalDriveFileSelectionActive);
  const useDrive = driveFiles.length > 0;
  const subtypePayload = toApprovalPayload(snapshot.subtype, subtypePayloadValueFromForm(snapshot.subtype, snapshot.subtypePayload));
  return {
    title: snapshot.title.trim(),
    category: snapshot.category,
    subtype: snapshot.subtype,
    ...(snapshot.description.trim() ? { description: snapshot.description.trim() } : {}),
    ...(snapshot.dueDate ? { dueDate: snapshot.dueDate } : {}),
    payload: {
      ...subtypePayload,
      ...buildCampaignPayload(
        isMarketing,
        snapshot.marketingRequestLink,
        snapshot.specificCampaignName,
        snapshot.specificCampaignStartDate,
        snapshot.specificCampaignEndDate,
      ),
    },
    uploadMethod: useDrive ? ApprovalUploadMethod.LINK : ApprovalUploadMethod.COMPUTER,
    assetIds: useDrive ? undefined : snapshot.assetIds,
    assetRelativePaths: useDrive ? undefined : snapshot.assetRelativePaths,
    driveFiles: useDrive ? driveFiles : undefined,
    ...(options.alertConfig ? { alertConfig: options.alertConfig } : {}),
    ...(options.saveAsDraft ? { saveAsDraft: true } : {}),
    ...(!options.saveAsDraft && options.supersedeId ? { supersedeDraftId: options.supersedeId } : {}),
    ...(snapshot.ziflowFolder && snapshot.subtype === 'marketing_asset'
      ? { ziflowFolder: snapshot.ziflowFolder, ziflowFolderThumbnail: snapshot.ziflowFolderThumbnail }
      : {}),
  };
}

export interface DraftSource {
  title?: string | null;
  category?: string | null;
  description?: string | null;
  dueDate?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface ParsedDraft {
  patch: {
    title: string;
    category: string;
    subtype: string;
    description: string;
    dueDate: string;
    marketingRequestLink: string;
    specificCampaignName: string;
    specificCampaignStartDate: string;
    specificCampaignEndDate: string;
  };
  subtypePayload: SubtypePayloadValue | null;
}

/** Splits a persisted draft's payload back into form-control values + the subtype editor payload. */
export function parseDraftPayload(approval: DraftSource): ParsedDraft {
  const rawPayload = (approval.payload ?? {}) as {
    subtype?: unknown;
    marketingRequestLink?: unknown;
    specificCampaignName?: unknown;
    specificCampaignStartDate?: unknown;
    specificCampaignEndDate?: unknown;
  };
  const {
    subtype: subtypeRaw,
    marketingRequestLink,
    specificCampaignName,
    specificCampaignStartDate,
    specificCampaignEndDate,
    ...rest
  } = rawPayload;
  const subtype = typeof subtypeRaw === 'string' ? subtypeRaw : '';
  return {
    patch: {
      title: approval.title ?? '',
      category: approval.category ?? '',
      subtype,
      description: approval.description ?? '',
      dueDate: approval.dueDate ?? '',
      marketingRequestLink: typeof marketingRequestLink === 'string' ? marketingRequestLink : '',
      specificCampaignName: typeof specificCampaignName === 'string' ? specificCampaignName : '',
      specificCampaignStartDate: typeof specificCampaignStartDate === 'string' ? specificCampaignStartDate : '',
      specificCampaignEndDate: typeof specificCampaignEndDate === 'string' ? specificCampaignEndDate : '',
    },
    subtypePayload: subtype ? (rest as SubtypePayloadValue) : null,
  };
}

/** True when the marketing campaign-context step has the data it needs to advance. */
export function isCampaignComplete(isMarketing: boolean, link: string, name: string, startDate: string, endDate: string): boolean {
  if (!isMarketing) {
    return true;
  }
  if (!link) {
    return false;
  }
  if (link !== 'specific') {
    return true;
  }
  return name.trim().length > 0 && startDate.trim().length > 0 && endDate.trim().length > 0 && startDate.trim() <= endDate.trim();
}

/** True when the configure step is complete for the given subtype (links / sheet / uploads). */
export function isConfigureComplete(subtype: string, title: string, payload: SubtypePayloadValue | null, hasUploads: boolean): boolean {
  if (title.trim().length === 0) {
    return false;
  }
  if (isUrlBasedSubtype(subtype)) {
    return (payload?.urls?.length ?? 0) > 0;
  }
  if (isSheetBasedSubtype(subtype)) {
    return !!payload?.spreadsheetId && (payload.sheetPreview?.rows.length ?? 0) > 0;
  }
  return hasUploads;
}
