import { inject, Injectable } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

import { KioskStateService } from '@fz-original/app/modules/kiosk/services/kiosk-state/kiosk-state.service';
import type { AnnouncementContext, AnnouncementsContextPort } from 'product-marketing';
import { combineLatest, map, type Observable } from 'rxjs';

import { AuthenticationService } from '../../core/authentication/authentication.service';
import { OrganizationTypeEnum } from '../models/partner/organization-type.enum';
import type { Partner } from '../models/partner/partner.model';
import type { User } from '../models/user/user.model';
import { PartnerService } from '../services/partner/partner.service';
import { Permissions } from '../services/user/permissions';
import { UserService } from '../services/user/user.service';

/**
 * Supplies partner-admin context to `product-marketing` from FeverZone's
 * user and partner services.
 *
 * Emits a context only for the audience that may see announcements — a partner
 * admin holding `can_view_announcements` who is neither a "my business" user, a
 * kiosk user, nor on a kiosk route — mirroring the exclusions the previous inline
 * splash logic enforced. Every other case emits `null` so no announcement is shown.
 *
 * The permission is the same one the backend enforces on both announcement
 * endpoints (`permission_mapper.py`), so checking it here keeps a user who would
 * only get a 403 from being asked at all.
 *
 * The kiosk-route signal and `permissions$` are in the stream so eligibility
 * re-evaluates on navigation and once permissions land, rather than being
 * sampled once.
 *
 * Gated on the authenticated id because `user$` is not reset on logout while
 * `savePartner()` pushes immediately, so an in-tab re-login would otherwise emit
 * the previous user's id against the new organisation.
 */
@Injectable({ providedIn: 'root' })
export class AnnouncementsContextService implements AnnouncementsContextPort {
  readonly #userService = inject(UserService);
  readonly #partnerService = inject(PartnerService);
  readonly #authentication = inject(AuthenticationService);
  readonly #isKioskRoute = inject(KioskStateService).getStateProp('isKioskRoute');

  readonly context$: Observable<AnnouncementContext | null> = combineLatest([
    this.#userService.getUserObservable(),
    this.#partnerService.partner$(),
    this.#authentication.observeUser(),
    toObservable(this.#isKioskRoute),
    this.#userService.permissions$,
  ]).pipe(
    map(([user, partner, authUserId, isKioskRoute]) => (authUserId === user.id ? this.#toContext(user, partner, isKioskRoute) : null)),
  );

  #toContext(user: User, partner: Partner | null, isKioskRoute: boolean): AnnouncementContext | null {
    const isPartner = partner?.type === OrganizationTypeEnum.PARTNER;
    const isMyBusiness = user.business?.userId === user.id;
    const canViewAnnouncements = this.#userService.hasPermission(Permissions.CAN_VIEW_ANNOUNCEMENTS);
    const isEligible = canViewAnnouncements && isPartner && !isMyBusiness && !user.isKiosk() && !isKioskRoute;
    if (!isEligible || partner === null) {
      return null;
    }
    return { userId: user.id, partnerId: partner.id };
  }
}
