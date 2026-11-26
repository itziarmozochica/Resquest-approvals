const ALLOWED_PROTOCOLS: readonly string[] = ['http:', 'https:', 'mailto:', 'tel:'];

export function isValidLinkUrl(url: string): boolean {
  const trimmed = url.trim();

  if (trimmed === '') {
    return false;
  }

  try {
    const parsed = new URL(trimmed);

    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return false;
    }

    return trimmed.length > parsed.protocol.length;
  } catch {
    return false;
  }
}
