/**
 * Raw envelope of `GET /1.0/organizations/{organization_id}/agreement-permissions` (B2BR-5567).
 *
 * `permissions` is optional so shape drift is a mapping decision in the adapter, not a `TypeError`.
 */
export interface AgreementPermissionsApi {
  permissions?: AgreementPermission[];
}

/**
 * One resolved permission name, as the authorization engine spells it (e.g. `can_…`).
 *
 * Deliberately a bare `string` and **not** a union of known names: enumerating them here would
 * put the consumer's authorization rule inside the client, and would date the library every time
 * the backend grows a permission.
 */
export type AgreementPermission = string;
