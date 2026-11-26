import { FzUploadItem } from '@fz-original/app/modules/ir-approval/shared/models/fz-upload.model';

/**
 * Maps each uploaded computer asset picked from a folder to its path inside that folder, so the
 * backend recreates the same subfolders in Drive. Loose files have no path and stay at the root.
 */
export function uploadedAssetRelativePaths(items: readonly FzUploadItem[]): Record<string, string> {
  return Object.fromEntries(
    items
      .filter(item => item.source === 'computer' && item.status === 'uploaded' && item.id && item.relativePath)
      .map(item => [item.id as string, item.relativePath as string]),
  );
}
