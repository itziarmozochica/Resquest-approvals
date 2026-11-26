import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import type { DistributorTarget } from '@fz/reservations';

import { ReservationBusinessChooseStateService } from '../../../modules/reservation/services/reservation-state.service';
import { Business } from '../../../modules/settings/shared/models/business.model';
import { PartnerService } from '../partner/partner.service';
import { Permissions } from '../user/permissions';
import { UserService } from '../user/user.service';
import { BusinessAsOrganizationFlagService } from './business-as-organization-flag.service';
import { DistributorTargetService } from './distributor-target.service';

const RESERVATION_MODULE_SEGMENT = 'reservations';
const ON_BEHALF_CREATION_SEGMENT = 'create-on-behalf';

@Injectable({ providedIn: 'root' })
export class OnBehalfTargetService {
  readonly #businessChoice = inject(ReservationBusinessChooseStateService);
  readonly #distributorTarget = inject(DistributorTargetService);
  readonly #businessAsOrganizationFlag = inject(BusinessAsOrganizationFlagService);
  readonly #partnerService = inject(PartnerService);
  readonly #router = inject(Router);
  readonly #userService = inject(UserService);

  channel(): string | null {
    return this.target() === null ? null : (this.#servedBusiness()?.channel ?? null);
  }

  /**
   * Whether this session is a partner allowed to act for a distributor. The reservation or the
   * served business says which distributor; this says whether to look. `permissions` are the ones
   * the on-behalf call accepts; holding any of them is enough.
   */
  actsOnBehalf(permissions: readonly Permissions[] = [Permissions.CAN_RESERVE_ON_BEHALF]): boolean {
    return (
      this.#businessAsOrganizationEnabled() &&
      !this.#distributorTarget.isDistributorSession() &&
      permissions.some(permission => this.#userService.hasPermission(permission))
    );
  }

  target(): DistributorTarget | null {
    if (!this.actsOnBehalf() || !this.#insideTheOnBehalfCreation()) {
      return null;
    }

    const distributorId = this.#servedBusiness()?.organizationId;
    const actingPartnerId = this.#partnerService.getActingOrganizationId();

    if (distributorId == null || actingPartnerId === null) {
      return null;
    }

    return { distributorId, targetOrganizationId: actingPartnerId };
  }

  #insideTheOnBehalfCreation(): boolean {
    const segments = this.#router.url.split('?')[0].split('#')[0].split('/').filter(Boolean);

    return segments.includes(RESERVATION_MODULE_SEGMENT) && segments.includes(ON_BEHALF_CREATION_SEGMENT);
  }

  #businessAsOrganizationEnabled(): boolean {
    return this.#businessAsOrganizationFlag.isEnabled();
  }

  #servedBusiness(): Business | null {
    return this.#businessChoice.getBusinessUser()()?.business ?? null;
  }
}
