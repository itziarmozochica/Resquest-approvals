import { GoogleDriveFileSelection } from '@fz-original/app/shared/models/google-drive-file-selection.model';
import { Observable } from 'rxjs';

export type FzUploadStatus = 'uploading' | 'uploaded' | 'processing' | 'failed';
export type FzUploadSource = 'computer' | 'drive';

export interface FzUploadItem {
  name: string;
  size: number;
  source: FzUploadSource;
  status: FzUploadStatus;
  uid: string;
  /** Google Drive file/folder id for drive-sourced items. */
  driveFileId?: string;
  errorKey?: string;
  /** Backend id once a committed upload resolves (asset/attachment id). */
  id?: string;
  ids?: string[];
  localPreviewUrl?: string;
  mimeType?: string;
  progress?: FzUploadProgress | null;
  /** Path relative to the picked folder in `webkitRelativePath` format; absent for loose files. */
  relativePath?: string;
  trackingKey?: string;
  url?: string;
}

export interface FzUploadProgress {
  done: number;
  total: number;
}

export interface FzTrackedUpload {
  ids: string[];
  key: string;
  name: string;
  status: 'processing' | 'uploaded' | 'failed';
  driveFileId?: string;
  errorKey?: string;
  progress?: FzUploadProgress | null;
}

/** Outcome a commit handler reports back to the IR/Approval upload component. */
export interface FzUploadResult {
  ok: boolean;
  /** Human-readable reason when the commit was rejected (shown to the user). */
  errorMessage?: string;
  id?: string;
  ids?: string[];
  /** When true the upload is queued asynchronously and has no immediate id. */
  processing?: boolean;
  trackingKey?: string;
}

export type FzDriveSelection = GoogleDriveFileSelection;

/**
 * Commits a picked/dropped file. `relativePath` is the file's path relative to the upload root in
 * `webkitRelativePath` format (folder segments + filename); empty/absent = root.
 */
export type FzFileCommit = (file: File, relativePath?: string) => Observable<FzUploadResult>;
export type FzDriveCommit = (selection: FzDriveSelection) => Observable<FzUploadResult>;
export type FzUrlParser = (raw: string) => FzDriveSelection | null;
/** Resolves a short-lived preview URL (e.g. a backend-signed S3 URL) for an uploaded item. */
export type FzPreviewResolver = (item: FzUploadItem) => Observable<string>;

export type FzPasteErrorKey = 'invalidUrl' | 'duplicate';
