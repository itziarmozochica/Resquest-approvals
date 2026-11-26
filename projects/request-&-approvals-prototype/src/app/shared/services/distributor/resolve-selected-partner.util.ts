import type { DistributorPartnerConfig } from '@fz/b2b-iam';

import { matchPartnerParam } from '../../search-bar/utils/distributor-partner-param.util';

export type RememberedPartnerLookup = (partners: readonly DistributorPartnerConfig[]) => DistributorPartnerConfig | null;

const NOTHING_REMEMBERED: RememberedPartnerLookup = () => null;

/**
 * Which partner a URL's `distributorPartnerId` puts in play, or `null` when it names none
 * (B2BR-5591 · WI-15).
 *
 * **The single definition of that decision.** `selectedPartnerResolver` uses it to write the session
 * store and `AgreementGateService` to decide who to ask about; sharing one pure function is what makes
 * it impossible for the gate to judge a different partner than the screen ends up acting as.
 *
 * A single usable partner is auto-selected even when the param names nothing or names something
 * unusable: there is nothing to choose between, so asking would be theatre.
 */
export function resolveSelectedPartner(
  partnerParam: string | null,
  partners: readonly DistributorPartnerConfig[],
  lookUpRemembered: RememberedPartnerLookup = NOTHING_REMEMBERED,
): DistributorPartnerConfig | null {
  const matched = matchPartnerParam(partnerParam, partners);
  if (matched !== null) {
    return matched;
  }

  if (partners.length === 1) {
    return partners[0];
  }

  return partnerParam === null ? lookUpRemembered(partners) : null;
}
