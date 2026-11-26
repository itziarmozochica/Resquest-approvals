export function isLogoutRouteUrl(url: string): boolean {
  return url === '/logout' || url.startsWith('/logout?');
}
