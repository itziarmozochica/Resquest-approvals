export function parseHttpUrl(value?: string): URL | undefined {
  if (value === undefined) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  return url.protocol === 'http:' || url.protocol === 'https:' ? url : undefined;
}
