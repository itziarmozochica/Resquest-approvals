export function urlPath(url: string): string {
  return url.split(/[?#]/, 1)[0] ?? url;
}
