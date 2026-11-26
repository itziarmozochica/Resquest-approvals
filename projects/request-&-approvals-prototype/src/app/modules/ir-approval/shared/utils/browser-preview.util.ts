import { BrowserPreviewKind } from '../models/file-thumbnail.model';

const browserImageExtensions = /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i;
const browserPdfExtensions = /\.pdf$/i;
const browserVideoExtensions = /\.(mp4|m4v|webm|ogv)$/i;
const browserAudioExtensions = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)$/i;
const browserTextExtensions = /\.(txt|csv)$/i;

const decisiveMimeTypePrefixes: readonly string[] = ['image/', 'video/', 'audio/', 'text/'];
const browserImageMimeTypes: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'image/avif',
];
const browserVideoMimeTypes: readonly string[] = ['video/mp4', 'video/webm', 'video/ogg', 'video/x-m4v'];
const browserAudioMimeTypes: readonly string[] = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/flac',
  'audio/opus',
];
const browserTextMimeTypes: readonly string[] = ['text/plain', 'text/csv'];

export function browserPreviewKind(mimeType: string | null | undefined, fileName: string | null | undefined): BrowserPreviewKind | null {
  const mime = (mimeType ?? '').split(';')[0].trim().toLowerCase();
  if (!isDecisiveMimeType(mime)) {
    return browserPreviewKindFromExtension(fileName ?? '');
  }
  const kind = browserPreviewKindFromMimeType(mime);
  return kind === null && isUnlistedRenderableFamily(mime) ? browserPreviewKindFromExtension(fileName ?? '') : kind;
}

export function isBrowserViewable(mimeType: string | null | undefined, fileName: string | null | undefined): boolean {
  return browserPreviewKind(mimeType, fileName) !== null;
}

function isDecisiveMimeType(mime: string): boolean {
  return decisiveMimeTypePrefixes.some((prefix: string) => mime.startsWith(prefix)) || mime === 'application/pdf';
}

function isUnlistedRenderableFamily(mime: string): boolean {
  return mime.startsWith('image/') || mime.startsWith('audio/') || mime.startsWith('video/');
}

function browserPreviewKindFromMimeType(mime: string): BrowserPreviewKind | null {
  if (browserImageMimeTypes.includes(mime)) {
    return 'image';
  }
  if (mime === 'application/pdf') {
    return 'pdf';
  }
  if (browserVideoMimeTypes.includes(mime)) {
    return 'video';
  }
  if (browserAudioMimeTypes.includes(mime)) {
    return 'audio';
  }
  return browserTextMimeTypes.includes(mime) ? 'text' : null;
}

function browserPreviewKindFromExtension(name: string): BrowserPreviewKind | null {
  if (browserImageExtensions.test(name)) {
    return 'image';
  }
  if (browserPdfExtensions.test(name)) {
    return 'pdf';
  }
  if (browserVideoExtensions.test(name)) {
    return 'video';
  }
  if (browserAudioExtensions.test(name)) {
    return 'audio';
  }
  return browserTextExtensions.test(name) ? 'text' : null;
}
