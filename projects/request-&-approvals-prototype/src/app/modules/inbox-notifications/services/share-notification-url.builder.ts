import { inject, Injectable } from '@angular/core';

import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { environment } from '@fz-original/environments/environment';

import { InboxNotification } from '../models/inbox-notification.model';

/** Query param the receiver's listener reads to auto-open a shared notification. */
export const SHARED_NOTIFICATION_ID_PARAM = 'sharedNotificationId';

/** `HasForcedPartnerGuard` reads this to switch the receiver to the sender's partner, then strips it. */
const FORCED_PARTNER_ID_PARAM = 'forcedPartnerId';

/** Query param that turns a feature flag on for the session (see `OptimizelyService`). */
const OFEAT_PARAM = 'ofeat';

/**
 * Landing route: a private page every partner can reach that keeps its query params. `/plans` fits both;
 * the listener lives in the header bell (rendered on every private route), so it fires wherever we land.
 */
const SHARE_LANDING_PATH = '/plans';

/**
 * Builds the absolute link a user copies to share a notification with a colleague of the same partner. Returns
 * `null` when the notification is not shareable (user-targeted) or there is no active partner. The link carries
 * `ofeat=enable_inbox_notifications` to keep the receiver gated in during the beta — temporary, see ADR-0001.
 */
@Injectable({ providedIn: 'root' })
export class ShareNotificationUrlBuilder {
  readonly #partnerService = inject(PartnerService);

  build(notification: InboxNotification): string | null {
    if (!notification.isShareable) {
      return null;
    }

    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId == null) {
      return null;
    }

    const params = new URLSearchParams();
    params.set(FORCED_PARTNER_ID_PARAM, String(partnerId));
    params.set(SHARED_NOTIFICATION_ID_PARAM, notification.id);
    params.set(OFEAT_PARAM, FeatureFlags.ENABLE_INBOX_NOTIFICATIONS);

    return `${environment.baseUrl}${SHARE_LANDING_PATH}?${params.toString()}`;
  }
}
