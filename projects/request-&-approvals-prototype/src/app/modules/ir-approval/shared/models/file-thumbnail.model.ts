import { IgntIconName } from '@ignite/icon';

export type FileThumbnailKind = 'image' | 'video' | 'pdf' | 'spreadsheet' | 'csv' | 'archive' | 'file';

export type BrowserPreviewKind = 'image' | 'pdf' | 'video' | 'audio' | 'text';

export interface ThumbnailSource {
  isRemote: boolean;
  url: string;
}

export interface RemoteThumbnailEntry {
  hasRetried: boolean;
  isFailed: boolean;
  pinnedAt: number;
  url: string;
}

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp|tiff?|heic|heif|svg)$/i;
const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|avi|mkv|webm|mpe?g|wmv)$/i;
const PDF_EXTENSIONS = /\.pdf$/i;
const SPREADSHEET_EXTENSIONS = /\.(xlsx?|xlsm|ods|numbers)$/i;
const CSV_EXTENSIONS = /\.(csv|tsv)$/i;
const ARCHIVE_EXTENSIONS = /\.(zip|rar|7z|tar|gz|bz2|exe|dmg|bin|iso|psd|ai|sketch)$/i;

const ICON_BY_KIND: Record<FileThumbnailKind, IgntIconName> = {
  archive: 'archive',
  csv: 'file-csv',
  file: 'file-alt',
  image: 'image',
  pdf: 'file-pdf',
  spreadsheet: 'file-excel',
  video: 'play',
};

const DRIVE_NON_THUMBNAILABLE_KINDS: readonly FileThumbnailKind[] = ['archive'];

export const FILE_THUMBNAIL_WIDTH_PX = 64;
export const FILE_THUMBNAIL_HEIGHT_PX = 40;

export function fileThumbnailKind(mimeType: string | undefined, fileName: string | undefined): FileThumbnailKind {
  const mime = (mimeType ?? '').toLowerCase();
  const name = fileName ?? '';

  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.test(name)) {
    return 'image';
  }
  if (mime.startsWith('video/') || VIDEO_EXTENSIONS.test(name)) {
    return 'video';
  }
  if (mime === 'application/pdf' || PDF_EXTENSIONS.test(name)) {
    return 'pdf';
  }
  if (mime === 'text/csv' || CSV_EXTENSIONS.test(name)) {
    return 'csv';
  }
  if (mime.includes('spreadsheet') || mime.includes('ms-excel') || SPREADSHEET_EXTENSIONS.test(name)) {
    return 'spreadsheet';
  }
  if (ARCHIVE_EXTENSIONS.test(name)) {
    return 'archive';
  }
  return 'file';
}

export function fileThumbnailIcon(kind: FileThumbnailKind): IgntIconName {
  return ICON_BY_KIND[kind];
}

export function isDriveThumbnailable(kind: FileThumbnailKind): boolean {
  return !DRIVE_NON_THUMBNAILABLE_KINDS.includes(kind);
}

export function driveThumbnailUrl(driveFileId: string, widthPx: number): string {
  return `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w${widthPx}`;
}
