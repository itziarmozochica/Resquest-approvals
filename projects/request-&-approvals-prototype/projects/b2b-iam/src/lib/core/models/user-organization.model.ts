/**
 * One organization row from `/1.0/users/{user_id}/organizations`. Only the
 * fields b2b-iam consumers need are modelled; the payload also carries
 * `country_code`, `city_code`, `type` and `deleted_at`.
 */
export interface UserOrganizationApi {
  id: number;
  name: string;
  /**
   * Which kind of organization this is. Optional because an older payload may omit it, and a
   * consumer that cannot tell should treat it as unknown rather than guess.
   */
  category?: UserOrganizationCategory;
  /** The distributor members pilot partners of a distributor organization; absent on any other. */
  partner_organization_ids?: number[];
}

/**
 * Envelope of `/1.0/users/{user_id}/organizations`. Both fields are optional so
 * shape drift is a mapping decision in the adapter rather than a `TypeError`.
 */
export interface UserOrganizationsApi {
  count?: number;
  organizations?: UserOrganizationApi[];
  other_operating_platforms?: UserOrganizationOperatingPlatform[];
}

/** Domain organization membership consumed by b2b-iam clients. */
export interface UserOrganization {
  id: number;
  name: string;
  /** Carried through from the payload: it is what tells a distributor apart from a partner. */
  category?: UserOrganizationCategory;
  /** The distributor members pilot partners of a distributor organization; absent on any other. */
  partnerOrganizationIds?: number[];
}

/** Organization types accepted by `organization_type` (b2b-iam `OrganizationType`). */
export type UserOrganizationType = 'partner' | 'reseller';

/** Organization categories accepted by `organization_category` (b2b-iam `OrganizationCategory`). */
export type UserOrganizationCategory = 'ambassadors' | 'distributors' | 'partners' | 'public_relations';

export type UserOrganizationOperatingPlatform = 'b2b_marketplace' | 'feverzone';

export interface UserOrganizationListing {
  organizations: UserOrganization[];
  otherOperatingPlatforms: UserOrganizationOperatingPlatform[];
}

/**
 * Permission names accepted by `with_permission`. The union lists the permissions this client is
 * known to send so a typo fails to compile; `string & {}` keeps any other b2b-iam permission valid
 * without widening the union away in tooltips.
 */
export type UserOrganizationPermission = 'can_view_marketplace_catalog' | (string & {});

/** Scoping for `/1.0/users/{user_id}/organizations`. */
export interface UserOrganizationsFilter {
  includeBookingAgents?: boolean;
  operatingPlatform?: UserOrganizationOperatingPlatform;
  organizationCategory?: UserOrganizationCategory;
  organizationType?: UserOrganizationType;
  /**
   * Keeps the listing scoped to the user's own memberships. Defaults to `true` in the request
   * builder; pass `false` to opt into the server's superuser behaviour, which drops the
   * membership scope and returns every matching organization.
   */
  strictMembership?: boolean;
  withPermission?: UserOrganizationPermission;
}
