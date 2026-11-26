import { GoogleDriveFileSelection } from '@fz-original/app/shared/models/google-drive-file-selection.model';

export interface ApprovalDriveAcceptedFile {
  driveFileId: string;
  name: string;
  mimeType: string;
  path: string[];
}

export interface ApprovalDriveFileSelection extends GoogleDriveFileSelection {
  selectedChildDriveFileIds?: string[];
}

export function isApprovalDriveFileSelectionActive(selection: ApprovalDriveFileSelection): boolean {
  return selection.selectedChildDriveFileIds === undefined || selection.selectedChildDriveFileIds.length > 0;
}
