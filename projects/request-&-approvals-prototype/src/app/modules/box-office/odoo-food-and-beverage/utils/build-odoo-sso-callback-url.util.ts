import type { OdooHandoffIssue } from '../models/odoo-handoff.api';

export function buildOdooSsoCallbackUrl(posLink: string, handoff: Pick<OdooHandoffIssue, 'token'>): string {
  const posUrl = new URL(posLink);
  const callbackUrl = new URL('/fever/sso/callback', posUrl.origin);

  callbackUrl.searchParams.set('token', handoff.token);
  callbackUrl.searchParams.set('redirect', `${posUrl.pathname}${posUrl.search}`);

  return callbackUrl.toString();
}
