import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { Partner } from '../../models/partner/partner.model';
import { PartnerService } from '../../services/partner/partner.service';
import { readForcedPartnerId } from '../../utils/single-id-query-param.util';

/**
 * On the plan dashboard resellers are served their own graph groups (`ambassadors`,
 * `affiliates`, `affiliates-network`), none of which the new dashboard requests — it would
 * render empty for them. Keeps them on the legacy plan dashboard, which `/my-plans` mounts
 * from this same routing module.
 *
 * The organization is resolved from an id rather than waited for. `canMatch` runs during route
 * recognition, and the two things that put a partner in `observePartner()` — `HasForcedPartnerGuard`
 * applying `forcedPartnerId`, and the app hydrating the stored one — both happen during activation,
 * after this guard. Waiting for them here waits for something the router is itself holding up: the
 * navigation never completes and the page stays blank, which is what the backoffice
 * "View on FeverZone" link used to hit.
 *
 * `getActingOrganizationId()` has no such dependency — it reads the id straight off the stored
 * partner, and unlike `getPartner()` it does not require `name`, `countryCode` and `email` to be
 * there too, so it also answers for a partner that is only half hydrated.
 */
export const canMatchNonResellerGuard: CanMatchFn = (): Observable<boolean> => {
  const partnerService = inject(PartnerService);
  const isNonReseller = (partner: Partner | null): boolean =>
    partner === null || partner.type === undefined || !partnerService.isReseller(partner.type);

  const forcedPartner = readForcedPartnerId(inject(Router));
  const organizationId: number | null = forcedPartner.id ?? partnerService.getActingOrganizationId();

  /**
   * No id anywhere means no session to speak of, and `canMatchViewReportsGuard` answers that case
   * first: it throws `Partner Id not set`, resolves `false`, and the router falls through to the
   * legacy sibling. Matching here keeps this guard out of a decision it cannot inform.
   */
  if (organizationId === null) {
    return of(true);
  }

  const selectedPartner: Partner | null = partnerService.getPartner();
  if (selectedPartner !== null && selectedPartner.id === organizationId) {
    return of(isNonReseller(selectedPartner));
  }

  return partnerService.get(organizationId).pipe(map(response => isNonReseller(response.data)));
};
