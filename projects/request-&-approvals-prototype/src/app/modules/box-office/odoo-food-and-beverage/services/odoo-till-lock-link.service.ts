import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { STORAGE_SERVICE } from '@fz/storage';
import { catchError, defer, map, of, tap, throwError, type Observable } from 'rxjs';

import type { GenerateLinkResponse } from '../models/generate-link.api';
import type { OnsiteSetupChannel } from '../models/onsite-setup-channel.model';
import type { StoredOdooTillLockLink } from '../models/stored-odoo-till-lock-link.model';
import { adaptGenerateLinkResponse } from '../utils/adapt-generate-link-response.util';
import { generateLinkChannelParams, generateLinkUrl } from '../utils/generate-link.util';

export const GENERATE_LINK_POS_LOCK_PATH = 'generate-link/pos-lock';

const LOCK_SCREEN_PATH_SUFFIX = '/login';

/**
 * The Odoo point of sale's lock screen (`{odoo_base_url}/pos/ui/{external_pos_id}/login`) for the operator's
 * onsite setup, so a Feverzone logout inside the Fever POS for Funlab app can lock the till instead of landing
 * on the Feverzone login.
 *
 * It reads the stored onsite setup through `STORAGE_SERVICE`, not `TicketingOnsiteSetupStorageService`: that one is
 * provided only on the box-office route, and this service is reached from the root logout chain on any page.
 *
 * Every resolved link is kept in storage across logouts. Shops needs a live session to resolve it, and the
 * Feverzone login still has to send an expired or logged-out operator back to the till lock.
 */
@Injectable({ providedIn: 'root' })
export class OdooTillLockLinkService {
  readonly #http = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);
  readonly #storage = inject(STORAGE_SERVICE);

  /** Emits `null` when there is no onsite setup channel or no acting partner to ask Shops with. */
  getLockLink(): Observable<string | null> {
    return defer(() => {
      const { channelId, onsiteSetupId } = this.#onsiteSetup();
      const partnerId = this.#partnerService.getActingOrganizationId();

      if (channelId === null || partnerId === null) {
        return of(null);
      }

      const channelParams = generateLinkChannelParams(channelId);
      const params = onsiteSetupId === null ? channelParams : channelParams.set('onsite_setup_id', onsiteSetupId);

      return this.#http.get<GenerateLinkResponse>(generateLinkUrl(partnerId, GENERATE_LINK_POS_LOCK_PATH), { params }).pipe(
        map((response: GenerateLinkResponse): string => adaptGenerateLinkResponse(response).link),
        tap((link: string) => this.#storage.set<StoredOdooTillLockLink>(StorageKey.odooTillLockLink, { channelId, link, onsiteSetupId })),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound) {
            this.#storage.remove(StorageKey.odooTillLockLink);
          }

          return throwError(() => error);
        }),
      );
    });
  }

  /** The last resolved link, when it was resolved for the onsite setup selected now. Needs no session. */
  getStoredLockLink(): string | null {
    const { channelId, onsiteSetupId } = this.#onsiteSetup();
    const stored = this.#storage.get<StoredOdooTillLockLink | null>(StorageKey.odooTillLockLink);

    if (
      channelId === null ||
      stored?.channelId !== channelId ||
      (stored.onsiteSetupId ?? null) !== onsiteSetupId ||
      typeof stored.link !== 'string' ||
      stored.link === ''
    ) {
      return null;
    }

    return stored.link;
  }

  /**
   * The point of sale the stored lock screen belongs to (`{odoo_base_url}/pos/ui/{external_pos_id}`), to go back to
   * the till without locking it. Needs no session.
   */
  getStoredPointOfSaleLink(): string | null {
    const lockLink = this.getStoredLockLink();

    if (lockLink === null) {
      return null;
    }

    const url = toUrl(lockLink);

    if (url === null || !url.pathname.endsWith(LOCK_SCREEN_PATH_SUFFIX)) {
      return null;
    }

    url.pathname = url.pathname.slice(0, -LOCK_SCREEN_PATH_SUFFIX.length);

    return url.toString();
  }

  /**
   * The stored setup's channel and id. Shops resolves the till by onsite setup first (B2BS-1982) and by channel
   * otherwise, so the id goes along whenever there is one.
   */
  #onsiteSetup(): { channelId: string | null; onsiteSetupId: string | null } {
    const onsiteSetup = this.#storage.get<OnsiteSetupChannel | null>(StorageKey.onsiteSetupConfig);

    return { channelId: toNonEmptyString(onsiteSetup?.channel_id), onsiteSetupId: toNonEmptyString(onsiteSetup?.id) };
  }
}

function toUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function toNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}
