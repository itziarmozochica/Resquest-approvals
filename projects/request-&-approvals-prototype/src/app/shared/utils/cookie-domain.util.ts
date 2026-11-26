/**
 * Widest `Domain` a cookie may use so that it also reaches the Insights Portal, which is served
 * from a sibling subdomain of the registrable domain Feverzone runs on
 * (`partners.feverup.com` → `host.example.invalid`).
 *
 * A cookie scoped this way is readable by **every** host under that registrable domain and is
 * attached to every request they receive, so only values that can afford that blast radius belong
 * in one. See `SessionTokenCookieStore` for what that means for the session token.
 *
 * Returns `null` — meaning "host-only cookie", the narrowest scope a cookie can have — for every
 * hostname that cannot carry a `Domain`: an absent host, `localhost`, bare IPv4 and single-label
 * hosts.
 */
export function getSharedCookieDomain(hostname: string = window.location.hostname): string | null {
  if (!hostname || hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return null;
  }

  const labels = hostname.split('.');
  if (labels.length < 2) {
    return null;
  }

  const parentDomain = labels.slice(-2).join('.');
  return `.${parentDomain}`;
}
