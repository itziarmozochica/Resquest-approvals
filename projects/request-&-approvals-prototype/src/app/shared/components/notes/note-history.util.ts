import { OrderNote } from '@fz-original/app/shared/models/order/order-note.model';

const NOTE_HISTORY_PREFIX = '__FZ_NOTES__';

interface RawNoteHistoryPayload {
  entries: unknown[];
}

export interface NoteHistoryAuthor {
  email: string;
  userId: number | null;
}

export interface NoteHistoryEntry {
  author: NoteHistoryAuthor;
  createdAt: string;
  message: string;
  title: string;
}

export interface ParsedNoteHistory {
  entries: NoteHistoryEntry[];
  hasMalformedPayload: boolean;
  isStructured: boolean;
}

export interface NewNoteEntryInput {
  author: NoteHistoryAuthor;
  createdAt: string;
  message: string;
  title: string | null;
}

export interface SerializedNoteResult {
  history: ParsedNoteHistory;
  latestEntry: NoteHistoryEntry;
  message: string;
  modifiedAt: string;
  title: string;
}

export interface BuildNotePayloadParams {
  author: NoteHistoryAuthor;
  existingNote: OrderNote | null;
  isAppendOnlyEnabled: boolean;
  noteChanges: { message: string; title: string | null };
  timestamp?: string;
}

export interface BuiltNotePayload {
  createdAt: string;
  message: string;
  title: string;
}

function isStructuredNoteMessage(message: string): boolean {
  return message.startsWith(NOTE_HISTORY_PREFIX);
}

export function parseNoteHistory(note: OrderNote | null): ParsedNoteHistory {
  if (!note || !hasNoteContent(note.title, note.message)) {
    return {
      entries: [],
      hasMalformedPayload: false,
      isStructured: false,
    };
  }

  if (!isStructuredNoteMessage(note.message)) {
    return createLegacyHistory(note, false);
  }

  const payload = parseStructuredPayload(note.message);
  if (!payload) {
    return createLegacyHistory(note, true);
  }

  const entries = payload.entries.map(entry => normalizeHistoryEntry(entry)).filter((entry): entry is NoteHistoryEntry => entry !== null);

  if (entries.length === 0) {
    return createLegacyHistory(note, true);
  }

  return {
    entries,
    hasMalformedPayload: false,
    isStructured: true,
  };
}

export function appendNoteHistoryEntry(note: OrderNote | null, newEntry: NewNoteEntryInput): SerializedNoteResult {
  const nextEntry = createEntry(newEntry);
  const previousHistory = parseNoteHistory(note);
  const history: ParsedNoteHistory = {
    entries: [...previousHistory.entries, nextEntry],
    hasMalformedPayload: false,
    isStructured: true,
  };

  return {
    history,
    latestEntry: nextEntry,
    message: serializeHistoryEntries(history.entries),
    modifiedAt: nextEntry.createdAt,
    title: nextEntry.title,
  };
}

export function buildNotePayload(params: BuildNotePayloadParams): BuiltNotePayload {
  const createdAt = params.timestamp ?? new Date().toISOString();
  const title = params.noteChanges.title ?? '';
  const message = params.noteChanges.message;

  if (!params.isAppendOnlyEnabled) {
    return {
      createdAt,
      message,
      title,
    };
  }

  const serialized = appendNoteHistoryEntry(params.existingNote, {
    author: params.author,
    createdAt,
    message,
    title,
  });

  return {
    createdAt,
    message: serialized.message,
    title: serialized.title,
  };
}

function createEntry(input: NewNoteEntryInput): NoteHistoryEntry {
  return {
    author: {
      email: input.author.email,
      userId: input.author.userId,
    },
    createdAt: input.createdAt,
    message: input.message ?? '',
    title: input.title ?? '',
  };
}

function createLegacyHistory(note: OrderNote, hasMalformedPayload: boolean): ParsedNoteHistory {
  return {
    entries: [
      {
        author: {
          email: note.userEmail ?? note.username ?? '',
          userId: note.userId ?? null,
        },
        createdAt: note.createdAt ?? note.modifiedAt ?? '',
        message: note.message ?? '',
        title: note.title ?? '',
      },
    ],
    hasMalformedPayload,
    isStructured: false,
  };
}

function hasNoteContent(title: string | null | undefined, message: string | null | undefined): boolean {
  const normalizedTitle = title ?? '';
  const normalizedMessage = message ?? '';

  return normalizedTitle.length > 0 || normalizedMessage.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeHistoryEntry(value: unknown): NoteHistoryEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : '';
  const message = typeof value.message === 'string' ? value.message : '';
  const title = typeof value.title === 'string' ? value.title : '';

  if (!hasNoteContent(title, message)) {
    return null;
  }

  const authorRecord = isRecord(value.author) ? value.author : null;
  const email =
    typeof authorRecord?.email === 'string' ? authorRecord.email : typeof authorRecord?.username === 'string' ? authorRecord.username : '';
  const userId = typeof authorRecord?.userId === 'number' ? authorRecord.userId : null;

  return {
    author: {
      email,
      userId,
    },
    createdAt,
    message,
    title,
  };
}

function parseStructuredPayload(message: string): RawNoteHistoryPayload | null {
  const serializedPayload = message.slice(NOTE_HISTORY_PREFIX.length);

  try {
    const parsed = JSON.parse(serializedPayload);
    if (!isRecord(parsed) || !Array.isArray(parsed.entries)) {
      return null;
    }

    return { entries: parsed.entries };
  } catch {
    return null;
  }
}

function serializeHistoryEntries(entries: NoteHistoryEntry[]): string {
  return `${NOTE_HISTORY_PREFIX}${JSON.stringify({ entries })}`;
}
