import { normalizeError, type BaseResponse } from '@fz/http-models';

import type {
  Distributor,
  DistributorApi,
  DistributorCapability,
  DistributorCheckoutPath,
  DistributorPartnerConfig,
  DistributorPartnerConfigApi,
} from '../models/distributor.model';

const CAPABILITIES: readonly string[] = ['full_agent', 'checkout_agent'];
const CHECKOUT_PATHS: readonly string[] = ['commission', 'wholesale'];

/**
 * Maps the distributor payload to the domain shape.
 *
 * `data.id` is the business id and `data.organization_id` is the organization id. A `Distributor`
 * is an organization, so its `id` is the organization's one.
 *
 * No partner is picked here. Every config comes through as it is, because which of them is usable
 * is the consumer's rule.
 */
export function adaptDistributor(response: BaseResponse<DistributorApi>): BaseResponse<Distributor> {
  return { data: adaptDistributorData(response.data), error: normalizeError(response.error) };
}

function adaptDistributorData(data: DistributorApi | null | undefined): Distributor | null {
  if (data === null || data === undefined) {
    return null;
  }
  return {
    allowedCheckoutPaths: (data.allowed_checkout_paths ?? []).filter(isCheckoutPath),
    business: {
      address: data.address,
      billingName: data.billing_name ?? undefined,
      cityCode: data.city_code ?? undefined,
      contactName: data.contact_name,
      countryCode: data.country_code ?? undefined,
      description: data.description ?? undefined,
      email: data.email,
      id: data.id,
      language: data.language,
      name: data.name,
      ownerUserId: data.owner_user_id,
      phone: data.phone,
      postalCode: data.postal_code ?? undefined,
      region: data.region ?? undefined,
      selfManaged: data.self_managed,
      taxIdentificationNumber: data.tax_identification_number,
      userId: data.user_id,
    },
    category: 'distributors',
    id: data.organization_id,
    name: data.name,
    partnerConfigs: (data.partner_configs ?? []).map(adaptPartnerConfig),
  };
}

function adaptPartnerConfig(config: DistributorPartnerConfigApi): DistributorPartnerConfig {
  return {
    capability: adaptCapability(config.capability),
    channel: config.channel ?? '',
    hasCustomChannel: config.has_custom_channel ?? false,
    partnerOrganizationId: config.partner_organization_id,
    partnerOrganizationName: config.partner_organization_name ?? '',
    type: config.type,
  };
}

/** An unknown path is dropped: a client cannot offer a way to sell it does not know. */
function isCheckoutPath(value: string): value is DistributorCheckoutPath {
  return CHECKOUT_PATHS.includes(value);
}

/** An unknown capability maps to `null`: a client cannot act on one it does not know. */
function adaptCapability(value: string | null): DistributorCapability | null {
  return value !== null && CAPABILITIES.includes(value) ? (value as DistributorCapability) : null;
}
