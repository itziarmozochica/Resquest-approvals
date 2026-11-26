import { FzTrackedUpload, FzUploadItem } from '../models/fz-upload.model';

const TRACKED_FIELDS = ['errorKey', 'id', 'ids', 'progress', 'status'] as const satisfies readonly (keyof FzUploadItem)[];

export function trackedPatch(upload: FzTrackedUpload): Partial<FzUploadItem> {
  if (upload.status === 'uploaded') {
    return { id: upload.ids.length === 1 ? upload.ids[0] : undefined, ids: upload.ids, progress: null, status: 'uploaded' };
  }
  if (upload.status === 'failed') {
    return { errorKey: upload.errorKey ?? 'importFailed', progress: null, status: 'failed' };
  }
  return { progress: upload.progress ?? null };
}

export function isPatchApplied(item: FzUploadItem, patch: Partial<FzUploadItem>): boolean {
  return TRACKED_FIELDS.every(field => !(field in patch) || JSON.stringify(item[field] ?? null) === JSON.stringify(patch[field] ?? null));
}
