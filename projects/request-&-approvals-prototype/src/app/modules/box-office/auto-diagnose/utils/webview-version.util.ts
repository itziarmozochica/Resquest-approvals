const CHROME_VERSION = /Chrome\/(\d+(?:\.\d+)*)/;

export const MIN_WEBVIEW_MAJOR_VERSION = 133;

/** The Android System WebView reports its own version as the Chrome version in the user agent. */
export function toWebViewVersion(userAgent: string): string | null {
  return CHROME_VERSION.exec(userAgent)?.[1] ?? null;
}

export function isWebViewOutdated(version: string | null, minMajorVersion: number = MIN_WEBVIEW_MAJOR_VERSION): boolean {
  if (version === null) {
    return false;
  }

  return Number.parseInt(version, 10) < minMajorVersion;
}
