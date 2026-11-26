import { Observable } from 'rxjs';

export interface PreviewFile {
  driveFileId: string;
  webViewLink: string;
  originalName: string;
  mimeType: string;
  /** Backend-signed (presigned) S3 URL for files not yet synced to Drive. */
  signedUrl?: string;
  refreshSignedUrl?: () => Observable<string>;
}

export type PreviewKind = 'image' | 'video' | 'audio' | 'embed' | 'other';
