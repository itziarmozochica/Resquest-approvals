export interface ParsedSheetUrl {
  spreadsheetId: string;
  spreadsheetUrl: string;
  gid: number;
}

const SHEET_ID_PATTERN = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;

/** Extracts the spreadsheet id (and gid tab, if present) from a pasted Google Sheets URL. */
export function parseSheetUrl(value: string): ParsedSheetUrl | null {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.hostname !== 'docs.google.com') {
    return null;
  }
  const match = url.pathname.match(SHEET_ID_PATTERN);
  if (!match?.[1]) {
    return null;
  }
  const gidRaw = url.searchParams.get('gid') ?? new URLSearchParams(url.hash.replace(/^#/, '')).get('gid');
  const gid = gidRaw && /^\d+$/.test(gidRaw) ? Number.parseInt(gidRaw, 10) : 0;
  return { spreadsheetId: match[1], spreadsheetUrl: trimmed, gid };
}
