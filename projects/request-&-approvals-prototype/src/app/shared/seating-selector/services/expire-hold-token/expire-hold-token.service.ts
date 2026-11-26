import { inject, Injectable } from '@angular/core';

import { environment } from '../../../../../environments/environment';
import { AuthenticationService } from '../../../../core/authentication/authentication.service';
import { SeatingProviderEnum } from '../../components/seating-selector/__data__/seating-provider.enum';

export type SeatingProviderApi = 'onebox' | 'seats-io';

export interface ExpireHoldTokenPayload {
  hold_token: string;
  seating_provider: SeatingProviderEnum;
  provider_public_key?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ExpireHoldTokenService {
  readonly #authenticationService = inject(AuthenticationService);

  expireHoldToken(partnerId: number, payload: ExpireHoldTokenPayload): void {
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/seating/expire-hold-token/`;

    const body: Record<string, string> = {
      hold_token: payload.hold_token,
      seating_provider: this.#toSeatingProviderApi(payload.seating_provider),
    };
    const publicKey = payload.provider_public_key?.trim();
    if (publicKey) {
      body.provider_public_key = publicKey;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.#authenticationService.hasApiKey()) {
      headers['x-api-key'] = this.#authenticationService.getApiKey() ?? '';
    } else if (this.#authenticationService.isLoggedIn()) {
      headers['Authorization'] = `B2bToken ${this.#authenticationService.getToken()}`;
    }

    try {
      fetch(url, {
        body: JSON.stringify(body),
        headers,
        keepalive: true,
        method: 'POST',
      }).catch(() => {
        // Non-blocking: swallow network errors.
      });
    } catch {
      // Non-blocking: swallow synchronous errors.
    }
  }

  #toSeatingProviderApi(provider: SeatingProviderEnum): SeatingProviderApi {
    switch (provider) {
      case SeatingProviderEnum.SEATSIO:
        return 'seats-io';
      case SeatingProviderEnum.ONEBOX:
        return 'onebox';
    }
  }
}
