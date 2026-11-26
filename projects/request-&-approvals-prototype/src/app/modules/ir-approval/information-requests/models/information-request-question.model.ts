export enum InformationRequestQuestionType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  RICH_TEXT = 'RICH_TEXT',
  NUMBER = 'NUMBER',
  PERCENTAGE = 'PERCENTAGE',
  DATE = 'DATE',
  TIME = 'TIME',
  DATETIME = 'DATETIME',
  EMAIL = 'EMAIL',
  NAME = 'NAME',
  PHONE = 'PHONE',
  WEBSITE = 'WEBSITE',
  PICKLIST = 'PICKLIST',
  DROPDOWN = 'DROPDOWN',
  MULTIPICKLIST = 'MULTIPICKLIST',
  FILE = 'FILE',
  MULTIFILE = 'MULTIFILE',
  TICKET_TYPES = 'TICKET_TYPES',
  CATALOG_GRID = 'CATALOG_GRID',
  FAQ = 'FAQ',
  VENUE = 'VENUE',
  STEPPER_REF = 'STEPPER_REF',
}

export enum InformationRequestFileKind {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  DOC = 'DOC',
  ANY = 'ANY',
}

export interface InformationRequestQuestionValidation {
  min?: number | null;
  max?: number | null;
  regex?: string | null;
}

export interface InformationRequestFileAnswer {
  driveFileId: string;
  webViewLink: string;
  originalName: string;
  mimeType: string;
  uploadedAt?: string | null;
  importJobId?: string;
  syncStatus?: string;
  thumbnailUrl?: string | null;
  /**
   * Ordered folder names between the upload root and the file, excluding the file itself
   * (e.g. `['Photos', 'Hero']`). Absent or empty means the file lives at the question root.
   * Backwards-compatible: files stored before folder preservation shipped have no value.
   */
  folderPath?: string[];
  announced?: boolean;
}

export function isFileAnswerInDrive(file: InformationRequestFileAnswer): boolean {
  return !!file.webViewLink && file.syncStatus !== 'SYNCING_TO_DRIVE' && file.syncStatus !== 'DRIVE_SYNC_FAILED';
}

export function isFileAnswerSyncing(file: InformationRequestFileAnswer): boolean {
  return file.syncStatus === 'SYNCING_TO_DRIVE';
}

export function isFileAnswerAwaitingSave(file: InformationRequestFileAnswer, fromDriveLink = false): boolean {
  return isFileAnswerSyncing(file) && file.announced === false && !fromDriveLink;
}

export function fileAnswerSyncStatusKey(
  file: InformationRequestFileAnswer,
  { fromDriveLink = false, stalled = false }: { fromDriveLink?: boolean; stalled?: boolean } = {},
): string {
  if (file.syncStatus === 'DRIVE_SYNC_FAILED') {
    return 'informationRequests.question.file.syncFailed';
  }
  if (isFileAnswerAwaitingSave(file, fromDriveLink)) {
    return 'informationRequests.question.file.awaitingSave';
  }
  return stalled ? 'informationRequests.question.file.importStillRunning' : 'informationRequests.question.file.syncing';
}

export function fileAnswerKey(file: InformationRequestFileAnswer): string {
  return file.driveFileId || file.importJobId || '';
}

/** MIME type stored on a file answer that is a pasted Google Sheet link rather than an uploaded file. */
export const GOOGLE_SHEET_MIME_TYPE = 'application/vnd.google-apps.spreadsheet';

export interface InformationRequestQuestion {
  id: string;
  type: InformationRequestQuestionType;
  label: string;
  options?: string[] | null;
  required: boolean;
  helpText?: string | null;
  section?: string | null;
  requiredLocked?: boolean;
  removalLocked?: boolean;
  validation?: InformationRequestQuestionValidation | null;
  acceptedFileKinds?: InformationRequestFileKind[] | null;
  compositeMetadata?: Record<string, unknown> | null;
  stepperTemplateKey?: string | null;
  multiInstance?: boolean | null;
  answer?: unknown;
}

export interface InformationRequestQuestionApiDto {
  id: string;
  type: string;
  label: string;
  options?: string[] | null;
  required?: boolean;
  help_text?: string | null;
  section?: string | null;
  required_locked?: boolean;
  removal_locked?: boolean;
  validation?: InformationRequestQuestionValidation | null;
  accepted_file_kinds?: string[] | null;
  composite_metadata?: Record<string, unknown> | null;
  stepper_template_key?: string | null;
  multi_instance?: boolean | null;
  answer?: unknown;
}

const FILE_KIND_VALUES = new Set<string>(Object.values(InformationRequestFileKind));

function parseFileKinds(values: string[] | null | undefined): InformationRequestFileKind[] | null {
  if (!values || values.length === 0) {
    return null;
  }
  const out = values.filter(v => FILE_KIND_VALUES.has(v)) as InformationRequestFileKind[];
  return out.length > 0 ? out : null;
}

const KNOWN_QUESTION_TYPES = new Set<string>([
  InformationRequestQuestionType.TEXT,
  InformationRequestQuestionType.TEXTAREA,
  InformationRequestQuestionType.RICH_TEXT,
  InformationRequestQuestionType.NUMBER,
  InformationRequestQuestionType.PERCENTAGE,
  InformationRequestQuestionType.DATE,
  InformationRequestQuestionType.TIME,
  InformationRequestQuestionType.DATETIME,
  InformationRequestQuestionType.EMAIL,
  InformationRequestQuestionType.NAME,
  InformationRequestQuestionType.PHONE,
  InformationRequestQuestionType.WEBSITE,
  InformationRequestQuestionType.PICKLIST,
  InformationRequestQuestionType.DROPDOWN,
  InformationRequestQuestionType.MULTIPICKLIST,
  InformationRequestQuestionType.FILE,
  InformationRequestQuestionType.MULTIFILE,
  InformationRequestQuestionType.TICKET_TYPES,
  InformationRequestQuestionType.CATALOG_GRID,
  InformationRequestQuestionType.FAQ,
  InformationRequestQuestionType.VENUE,
  InformationRequestQuestionType.STEPPER_REF,
]);

const BACKEND_TYPE_ALIASES: Record<string, InformationRequestQuestionType> = {
  text: InformationRequestQuestionType.TEXT,
  textarea: InformationRequestQuestionType.TEXTAREA,
  rich_text: InformationRequestQuestionType.RICH_TEXT,
  number: InformationRequestQuestionType.NUMBER,
  percentage: InformationRequestQuestionType.PERCENTAGE,
  date: InformationRequestQuestionType.DATE,
  time: InformationRequestQuestionType.TIME,
  datetime: InformationRequestQuestionType.DATETIME,
  email: InformationRequestQuestionType.EMAIL,
  name: InformationRequestQuestionType.NAME,
  phone: InformationRequestQuestionType.PHONE,
  website: InformationRequestQuestionType.WEBSITE,
  picklist: InformationRequestQuestionType.PICKLIST,
  dropdown: InformationRequestQuestionType.DROPDOWN,
  multipicklist: InformationRequestQuestionType.MULTIPICKLIST,
  file: InformationRequestQuestionType.FILE,
  multifile: InformationRequestQuestionType.MULTIFILE,
  photo: InformationRequestQuestionType.FILE,
  video: InformationRequestQuestionType.FILE,
  ticket_types_repeater: InformationRequestQuestionType.TICKET_TYPES,
  catalog_grid_repeater: InformationRequestQuestionType.CATALOG_GRID,
  custom_schedule: InformationRequestQuestionType.CATALOG_GRID,
  faq_repeater: InformationRequestQuestionType.FAQ,
  venue_places: InformationRequestQuestionType.VENUE,
  stepper_ref: InformationRequestQuestionType.STEPPER_REF,
};

const BACKEND_TYPE_TO_FILE_KIND: Record<string, InformationRequestFileKind> = {
  photo: InformationRequestFileKind.PHOTO,
  video: InformationRequestFileKind.VIDEO,
};

export function parseInformationRequestQuestionType(value: string): InformationRequestQuestionType {
  if (KNOWN_QUESTION_TYPES.has(value)) {
    return value as InformationRequestQuestionType;
  }
  const lower = value?.toLowerCase?.() ?? '';
  if (BACKEND_TYPE_ALIASES[lower]) {
    return BACKEND_TYPE_ALIASES[lower];
  }
  const upper = value?.toUpperCase?.() ?? '';
  if (KNOWN_QUESTION_TYPES.has(upper)) {
    return upper as InformationRequestQuestionType;
  }
  return InformationRequestQuestionType.TEXT;
}

const QUESTION_TYPE_TO_BACKEND_TOKEN: Record<InformationRequestQuestionType, string> = {
  [InformationRequestQuestionType.TEXT]: 'text',
  [InformationRequestQuestionType.TEXTAREA]: 'textarea',
  [InformationRequestQuestionType.RICH_TEXT]: 'rich_text',
  [InformationRequestQuestionType.NUMBER]: 'number',
  [InformationRequestQuestionType.PERCENTAGE]: 'percentage',
  [InformationRequestQuestionType.DATE]: 'date',
  [InformationRequestQuestionType.TIME]: 'time',
  [InformationRequestQuestionType.DATETIME]: 'datetime',
  [InformationRequestQuestionType.EMAIL]: 'email',
  [InformationRequestQuestionType.NAME]: 'name',
  [InformationRequestQuestionType.PHONE]: 'phone',
  [InformationRequestQuestionType.WEBSITE]: 'website',
  [InformationRequestQuestionType.PICKLIST]: 'picklist',
  [InformationRequestQuestionType.DROPDOWN]: 'dropdown',
  [InformationRequestQuestionType.MULTIPICKLIST]: 'multipicklist',
  [InformationRequestQuestionType.FILE]: 'file',
  [InformationRequestQuestionType.MULTIFILE]: 'multifile',
  [InformationRequestQuestionType.TICKET_TYPES]: 'ticket_types_repeater',
  [InformationRequestQuestionType.CATALOG_GRID]: 'catalog_grid_repeater',
  [InformationRequestQuestionType.FAQ]: 'faq_repeater',
  [InformationRequestQuestionType.VENUE]: 'venue_places',
  [InformationRequestQuestionType.STEPPER_REF]: 'stepper_ref',
};

export function questionTypeToBackendToken(type: InformationRequestQuestionType): string {
  return QUESTION_TYPE_TO_BACKEND_TOKEN[type] ?? 'text';
}

function inferFileKindsFromBackendType(rawType: string): InformationRequestFileKind[] | null {
  const kind = BACKEND_TYPE_TO_FILE_KIND[rawType?.toLowerCase?.() ?? ''];
  return kind ? [kind] : null;
}

const TOP_LEVEL_COMPOSITE_KEYS = [
  'table_column_types',
  'table_column_picklists',
  'table_column_labels',
  'table_column_help_text',
  'ticket_table_header_fields',
  'picklist_option_helpers',
  'picklist_option_ask_detail',
  'textarea_min_rows',
  'faq_min_pairs',
  'grid_columns',
  'grid_min_rows',
] as const;

function extractCompositeMetadata(dto: InformationRequestQuestionApiDto): Record<string, unknown> | null {
  const explicit = dto.composite_metadata;
  if (explicit && typeof explicit === 'object' && Object.keys(explicit).length > 0) {
    return explicit;
  }
  const bag = dto as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of TOP_LEVEL_COMPOSITE_KEYS) {
    const value = bag[key];
    if (value !== undefined && value !== null) {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function mapInformationRequestQuestionDto(dto: InformationRequestQuestionApiDto): InformationRequestQuestion {
  const explicitFileKinds = parseFileKinds(dto.accepted_file_kinds);
  return {
    id: dto.id,
    type: parseInformationRequestQuestionType(dto.type),
    label: dto.label,
    options: dto.options ?? null,
    required: dto.required ?? false,
    helpText: dto.help_text ?? null,
    section: dto.section ?? null,
    requiredLocked: dto.required_locked ?? false,
    removalLocked: dto.removal_locked ?? false,
    validation: dto.validation ?? null,
    acceptedFileKinds: explicitFileKinds ?? inferFileKindsFromBackendType(dto.type),
    compositeMetadata: extractCompositeMetadata(dto),
    stepperTemplateKey: dto.stepper_template_key ?? null,
    multiInstance: dto.multi_instance ?? null,
    answer: dto.answer,
  };
}

const KIND_TO_MIME: Record<InformationRequestFileKind, string[]> = {
  [InformationRequestFileKind.PHOTO]: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
  [InformationRequestFileKind.VIDEO]: ['video/mp4', 'video/webm', 'video/quicktime'],
  [InformationRequestFileKind.DOC]: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  [InformationRequestFileKind.ANY]: [],
};

const KIND_TO_EXTENSIONS: Record<InformationRequestFileKind, string[]> = {
  [InformationRequestFileKind.PHOTO]: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
  [InformationRequestFileKind.VIDEO]: ['.mp4', '.webm', '.mov'],
  [InformationRequestFileKind.DOC]: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
  [InformationRequestFileKind.ANY]: [],
};

export function fileKindsToMimeTypes(kinds: InformationRequestFileKind[] | null | undefined): string[] {
  return collectForKinds(kinds, KIND_TO_MIME);
}

export function fileKindsToExtensions(kinds: InformationRequestFileKind[] | null | undefined): string[] {
  return collectForKinds(kinds, KIND_TO_EXTENSIONS);
}

function collectForKinds(
  kinds: InformationRequestFileKind[] | null | undefined,
  table: Record<InformationRequestFileKind, string[]>,
): string[] {
  if (!kinds || kinds.length === 0 || kinds.includes(InformationRequestFileKind.ANY)) {
    return [];
  }
  return [...new Set(kinds.flatMap(kind => table[kind] ?? []))];
}

/** Whether a file question accepts a spreadsheet, and so can offer the "paste a Google Sheet link" option. */
export function acceptsSpreadsheet(kinds: InformationRequestFileKind[] | null | undefined): boolean {
  return !kinds || kinds.length === 0 || kinds.includes(InformationRequestFileKind.ANY) || kinds.includes(InformationRequestFileKind.DOC);
}
