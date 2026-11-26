import type { UserOrganizationCategory } from './user-organization.model';

/**
 * What a distributor can do for one partner it holds a config with.
 *
 * `full_agent` is the manager capability, `checkout_agent` the cashier one. A capability lives
 * on a partner config, not on the organization.
 *
 * Which of them a session may use is the consumer's rule, not this library's.
 */
export type DistributorCapability = 'full_agent' | 'checkout_agent';

/**
 * How a distributor may sell: `wholesale` pays the partner up front, `commission` is paid by Fever
 * (Pay-by-Link). A distributor may hold both.
 */
export type DistributorCheckoutPath = 'commission' | 'wholesale';

/** Raw payload of one `partner_configs[]` entry, snake_case. */
export interface DistributorPartnerConfigApi {
  capability: string | null;
  channel: string | null;
  has_custom_channel: boolean | null;
  partner_organization_id: number;
  partner_organization_name?: string | null;
  type: string;
}

/**
 * Raw payload of `GET /1.0/distributors/{organization_id}`, snake_case.
 *
 * Only the fields a consumer needs. The endpoint returns more, but nothing here reads it.
 */
export interface DistributorApi {
  address: string;
  billing_name: string | null;
  city_code: string | null;
  contact_name: string;
  /** Optional: absent until the field ships; `null` once it has, for a business that wrote none. */
  description?: string | null;
  country_code: string | null;
  email: string;
  id: string;
  language: string;
  name: string;
  organization_id: number;
  owner_user_id: number | null;
  phone: string;
  postal_code: string | null;
  region: string | null;
  /** Optional: a reply without it is tolerated and read as not self-managed. */
  self_managed?: boolean;
  tax_identification_number: string;
  user_id: number;
  /** Optional: a reply from a deployment that does not send it yet is tolerated. */
  allowed_checkout_paths?: string[] | null;
  /** Optional: a reply without it is tolerated. */
  partner_configs?: DistributorPartnerConfigApi[];
}

/**
 * Body of `PUT /1.0/distributors/{organization_id}`. Wire format, snake_case — **internal**.
 *
 * Consumers pass {@link UpdateDistributor} instead; `toUpdateDistributorRequest` translates, the
 * mirror of `adaptDistributor` on the read side.
 *
 * Every field is optional and the endpoint rejects unknown ones (`additionalProperties: false`).
 */
export interface UpdateDistributorRequest {
  readonly address?: string | null;
  readonly billing_name?: string | null;
  readonly city_code?: string | null;
  readonly contact_name?: string;
  readonly description?: string;
  readonly country_code?: string | null;
  readonly email?: string;
  readonly name?: string;
  readonly phone?: string;
  readonly postal_code?: string | null;
  readonly region?: string | null;
  readonly tax_identification_number?: string;
}

/** One partner the distributor holds a config with, and the channel that config grants. */
export interface DistributorPartnerConfig {
  readonly capability: DistributorCapability | null;
  /** Channel value, in whatever vocabulary the consumer's session uses. */
  readonly channel: string;
  readonly hasCustomChannel: boolean;
  readonly partnerOrganizationId: number;
  readonly partnerOrganizationName: string;
  readonly type: string;
}

/**
 * The business details the distributor endpoint returns.
 *
 * This library's own shape, not a consumer's business model. Each app maps it into what it needs.
 */
export interface DistributorBusiness {
  readonly address: string;
  readonly contactName: string;
  /** The business's own short summary of what it does. Absent until the field ships. */
  readonly description?: string;
  readonly email: string;
  readonly id: string;
  readonly language: string;
  readonly name: string;
  readonly ownerUserId: number | null;
  readonly phone: string;
  readonly taxIdentificationNumber: string;
  readonly userId: number;
  readonly billingName?: string;
  readonly cityCode?: string;
  readonly countryCode?: string;
  readonly postalCode?: string;
  readonly region?: string;
  readonly selfManaged?: boolean;
}

/**
 * A distributor organization, as `GET /1.0/distributors/{organization_id}` returns it.
 *
 * `category` is pinned to `'distributors'`, so an object of this type is a distributor by
 * construction — the endpoint only answers for organizations in that category.
 *
 * `id` is the **organization** id, the one in the route, not the business id. The business keeps
 * its own inside, and both arrive in the same reply, which is why start-up needs one request.
 */
export interface Distributor {
  /** The checkout paths Sales Ops allowed, unknown ones dropped. Empty when the reply carries none. */
  readonly allowedCheckoutPaths: readonly DistributorCheckoutPath[];
  readonly business: DistributorBusiness;
  readonly category: Extract<UserOrganizationCategory, 'distributors'>;
  readonly id: number;
  readonly name: string;
  readonly partnerConfigs: readonly DistributorPartnerConfig[];
}

/**
 * The business details a distributor can change through `PUT /1.0/distributors/{organization_id}`.
 *
 * The write-side counterpart of {@link DistributorBusiness}: this library's own camelCase shape, so
 * no consumer hand-builds a wire body. Every field is optional — send only what changed.
 */
export interface UpdateDistributor {
  readonly address?: string | null;
  readonly billingName?: string | null;
  readonly cityCode?: string | null;
  readonly contactName?: string;
  /** An empty string clears the stored one; omit to leave it untouched. */
  readonly description?: string;
  readonly countryCode?: string | null;
  readonly email?: string;
  readonly name?: string;
  readonly phone?: string;
  readonly postalCode?: string | null;
  readonly region?: string | null;
  readonly taxIdentificationNumber?: string;
}
