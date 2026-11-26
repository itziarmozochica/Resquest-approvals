import { GoogleDriveFileSelection } from '@fz-original/app/shared/models/google-drive-file-selection.model';

const DRIVE_HOSTS = ['drive.google.com', 'docs.google.com'];
const DRIVE_ID_PATTERNS = [/\/d\/([a-zA-Z0-9_-]{10,})/, /\/folders\/([a-zA-Z0-9_-]{10,})/, /[?&]id=([a-zA-Z0-9_-]{10,})/];

export function parseDriveUrl(value: string): GoogleDriveFileSelection | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (!DRIVE_HOSTS.includes(url.hostname)) {
    return null;
  }
  for (const pattern of DRIVE_ID_PATTERNS) {
    const match = url.pathname.match(pattern) ?? url.search.match(pattern);
    if (match?.[1]) {
      return { driveFileId: match[1], name: value, mimeType: '', url: value };
    }
  }
  return null;
}
