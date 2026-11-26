import type { BaseResponse } from '@fz/http-models';

/**
 * The code the distributor endpoint answers with when the organization is not in the
 * `distributors` category.
 */
export const NOT_A_DISTRIBUTOR_CODE = 'ORGANIZATION_NOT_OF_EXPECTED_CATEGORY';

/**
 * Whether a distributor response means "this organization is not a distributor".
 *
 * A separate question from "something went wrong": this one tells a consumer to use whatever path
 * it used before, so it must not be handled as a failure. Every other error — including
 * `DISTRIBUTOR_ORGANIZATION_NOT_FOUND` — is a real one.
 *
 * Exported so a consumer branches on this instead of hardcoding the string.
 */
export function isNotADistributorOrganization(response: BaseResponse<unknown>): boolean {
  return response.error?.code === NOT_A_DISTRIBUTOR_CODE;
}
