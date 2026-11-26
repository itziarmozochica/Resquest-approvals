/**
 * The header the acting organization arrives in, now that `/distributors/{d}/partners/{p}` is gone from
 * the reservation read: fever2 reads it as `HTTP_X_SCOPED_ORGANIZATION_ID` and answers **403** when it is
 * missing, so it is not optional the way an ordinary header is.
 */
export const SCOPED_ORGANIZATION_HEADER = 'X-Scoped-Organization-Id';

export function scopedOrganizationHeader(organizationId: number): Record<string, string> {
  return { [SCOPED_ORGANIZATION_HEADER]: String(organizationId) };
}
