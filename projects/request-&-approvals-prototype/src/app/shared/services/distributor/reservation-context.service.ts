import { computed, inject, Injectable, type Signal } from '@angular/core';

import { Channel } from '../session-availability/channel.enum';
import { UserService } from '../user/user.service';
import { DistributorTargetService } from './distributor-target.service';
import { OnBehalfTargetService } from './on-behalf-target.service';

@Injectable({ providedIn: 'root' })
export class ReservationContextService {
  readonly #distributorTarget = inject(DistributorTargetService);
  readonly #onBehalfTarget = inject(OnBehalfTargetService);
  readonly #userService = inject(UserService);

  /** The partner being acted for, or `null` when the flag is off or this is not a distributor session. */
  readonly reservationPartnerId: Signal<number | null> = computed(() => this.#distributorTarget.target()?.targetOrganizationId ?? null);

  /**
   * A distributor session is a business session, so it takes the business branch - and
   * `getBusinessChannel()` cannot answer it: a distributor has no single business channel, so the
   * accessor falls back to `Channel.Business` and the modify flow asks about the wrong concession.
   */
  modifyChannel(reservationChannelId: string): Channel {
    return this.#userService.isBusiness() ? this.reservationChannel() : (reservationChannelId as Channel);
  }

  /**
   * The chosen partner config's channel in a distributor session, the session's business channel in any
   * other. The fall-back is only for the sessions that have a business: `getBusinessChannel()` answers
   * `Channel.Business` for an empty one, and sending `business` here would ask about the wrong
   * concession rather than about any - so a distributor session with no channel answers empty, which
   * every caller omits.
   *
   * Deliberately not a `computed`: the business branch reads `user.business.channel`, a plain field
   * assigned after `markNotADistributor()` runs, so a memoised first read pins `Channel.Business` for
   * the rest of the session.
   */
  reservationChannel(): Channel {
    const onBehalfChannel = this.#onBehalfTarget.channel();
    if (onBehalfChannel !== null) {
      return onBehalfChannel as Channel;
    }
    if (!this.#distributorTarget.isDistributorSession()) {
      return this.#userService.getBusinessChannel();
    }
    return (this.#distributorTarget.channel() ?? '') as Channel;
  }
}
