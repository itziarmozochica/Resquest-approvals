export type PartnerReviewMode = 'approve' | 'inform';

export const URL_BASED_SUBTYPES: ReadonlySet<string> = new Set([
  'event',
  'fever_event',
  'marketing_landings',
  'crm_campaign',
  'marketing_secret_media',
]);

export const SHEET_BASED_SUBTYPES: ReadonlySet<string> = new Set(['marketing_copy']);

const DRIVE_FOLDER_SUBTYPES: ReadonlySet<string> = new Set(['marketing_asset']);

export interface UrlListEntry {
  url: string;
  mode: PartnerReviewMode;
  description: string;
}

export interface SubtypePayloadValue {
  urls?: string[];
  urlPartnerReviewModes?: PartnerReviewMode[];
  urlDescriptions?: string[];
  clientCommentsColIndex?: number;
  hiddenColumns?: number[];
  colCount?: number;
  rowCount?: number;
  sheetName?: string;
  sheetPreview?: SheetPreview;
  sheetTabId?: number;
  spreadsheetUrl?: string;
  spreadsheetId?: string;
}

export interface SheetPreview {
  rows: string[][];
}

export interface SheetTab {
  sheetTabId: number;
  title: string;
}

export { parseSheetUrl } from '@fz-original/app/shared/utils/google-sheet-url.util';
export type { ParsedSheetUrl } from '@fz-original/app/shared/utils/google-sheet-url.util';

export function isUrlBasedSubtype(subtype: string): boolean {
  return URL_BASED_SUBTYPES.has(subtype);
}

export function isSheetBasedSubtype(subtype: string): boolean {
  return SHEET_BASED_SUBTYPES.has(subtype);
}

export function supportsDriveFolder(approvalType: string | null | undefined): boolean {
  return approvalType != null && DRIVE_FOLDER_SUBTYPES.has(approvalType);
}

export function toApprovalPayload(subtype: string, value: SubtypePayloadValue): Record<string, unknown> {
  if (isUrlBasedSubtype(subtype)) {
    return {
      urls: value.urls ?? [],
      urlPartnerReviewModes: value.urlPartnerReviewModes ?? [],
      urlDescriptions: value.urlDescriptions ?? [],
    };
  }
  if (isSheetBasedSubtype(subtype)) {
    return {
      spreadsheetUrl: value.spreadsheetUrl ?? '',
      spreadsheetId: value.spreadsheetId ?? '',
      sheetName: value.sheetName ?? '',
      sheetTabId: value.sheetTabId ?? 0,
      sheetPreview: value.sheetPreview ?? { rows: [] },
      rowCount: value.rowCount ?? 0,
      colCount: value.colCount ?? 0,
      clientCommentsColIndex: value.clientCommentsColIndex ?? -1,
      hiddenColumns: value.hiddenColumns ?? [],
    };
  }
  return {};
}
