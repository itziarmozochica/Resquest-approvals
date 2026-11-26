import { PendingUploadFile } from '../models/directory-upload.model';

/** System/metadata files that must never be uploaded when a directory is expanded. */
const JUNK_FILE_NAMES = new Set(['thumbs.db', 'desktop.ini']);

/**
 * Reads a drag-and-drop `DataTransfer`, walking any dropped directories via the FileSystem entries
 * API so each file keeps its relative path. A dropped folder contributes its *contents* — its own
 * name is not part of the path — matching the Drive-link import, where the linked folder is the
 * root. Falls back to the flat file list when the entries API is unavailable.
 */
export async function readDroppedEntries(dataTransfer: DataTransfer): Promise<PendingUploadFile[]> {
  const entries = (dataTransfer.items ? Array.from(dataTransfer.items) : [])
    .filter(item => item.kind === 'file')
    .map(item => item.webkitGetAsEntry?.() ?? null)
    .filter((entry): entry is FileSystemEntry => entry !== null);

  if (entries.length === 0) {
    return toPendingFromWebkitPath(Array.from(dataTransfer.files));
  }

  const collected: PendingUploadFile[] = [];
  for (const entry of entries) {
    if (isDirectoryEntry(entry)) {
      // The dropped folder itself is the root: walk its children with no ancestors.
      for (const child of await readAllDirectoryEntries(entry)) {
        await collectEntry(child, [], collected);
      }
    } else {
      await collectEntry(entry, [], collected);
    }
  }
  return collected;
}

/**
 * Maps plain `File`s to pending uploads using each file's `webkitRelativePath`. The browser
 * includes the picked root folder as the first segment; it is stripped so the path is relative to
 * the root, matching `readDroppedEntries` and the Drive-link import.
 */
export function toPendingFromWebkitPath(files: File[]): PendingUploadFile[] {
  return files.map(file => ({ file, relativePath: stripRootSegment(file.webkitRelativePath) }));
}

/**
 * Splits an expanded directory into the files to upload and the ones rejected by the accept filter
 * (extensions like `.png`, exact MIME types, or `type/*` wildcards; no tokens accepts everything).
 * System/metadata files (dot-files, `Thumbs.db`, `desktop.ini`) are dropped from both lists: they
 * are never uploaded and never reported.
 */
export function partitionUploadableFiles(
  pending: PendingUploadFile[],
  acceptTokens: readonly string[],
): { accepted: PendingUploadFile[]; unsupported: PendingUploadFile[] } {
  const uploadable = pending.filter(({ file }) => !isJunkFile(file));
  return {
    accepted: uploadable.filter(({ file }) => matchesAccept(file, acceptTokens)),
    unsupported: uploadable.filter(({ file }) => !matchesAccept(file, acceptTokens)),
  };
}

function isJunkFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.startsWith('.') || JUNK_FILE_NAMES.has(name);
}

function matchesAccept(file: File, acceptTokens: readonly string[]): boolean {
  const tokens = acceptTokens.map(token => token.trim().toLowerCase()).filter(token => token.length > 0);
  if (tokens.length === 0) {
    return true;
  }
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some(token => {
    if (token.startsWith('.')) {
      return name.endsWith(token);
    }
    if (token.endsWith('/*')) {
      return type.startsWith(token.slice(0, -1));
    }
    return type === token;
  });
}

function stripRootSegment(path: string | null | undefined): string {
  if (!path) {
    return '';
  }
  const segments = path.split('/');
  return segments.length > 1 ? segments.slice(1).join('/') : '';
}

function isFileEntry(entry: FileSystemEntry): entry is FileSystemFileEntry {
  return entry.isFile;
}

function isDirectoryEntry(entry: FileSystemEntry): entry is FileSystemDirectoryEntry {
  return entry.isDirectory;
}

async function collectEntry(entry: FileSystemEntry, ancestors: string[], out: PendingUploadFile[]): Promise<void> {
  if (isFileEntry(entry)) {
    const file = await fileFromEntry(entry);
    out.push({ file, relativePath: ancestors.length > 0 ? [...ancestors, file.name].join('/') : '' });
    return;
  }
  if (isDirectoryEntry(entry)) {
    for (const child of await readAllDirectoryEntries(entry)) {
      await collectEntry(child, [...ancestors, entry.name], out);
    }
  }
}

function fileFromEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function readAllDirectoryEntries(directory: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = directory.createReader();
  const all: FileSystemEntry[] = [];
  let batch = await readEntriesBatch(reader);
  while (batch.length > 0) {
    all.push(...batch);
    batch = await readEntriesBatch(reader);
  }
  return all;
}

function readEntriesBatch(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}
