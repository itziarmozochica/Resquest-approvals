export const APPROVAL_UPLOAD_MIME_TYPES: string[] = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export const APPROVAL_UPLOAD_EXTENSIONS: string[] = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.mp4',
  '.mov',
  '.webm',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.csv',
  '.txt',
];

export const APPROVAL_UPLOAD_ACCEPT: string = [...APPROVAL_UPLOAD_MIME_TYPES, ...APPROVAL_UPLOAD_EXTENSIONS].join(',');

export const APPROVAL_UPLOAD_FORMATS_LABEL = APPROVAL_UPLOAD_EXTENSIONS.join(', ');
