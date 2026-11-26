import { Injectable } from '@angular/core';

import moment from 'moment-timezone';

import {
  SalesWindowChannelRequestDTO,
  SalesWindowChannelResponseDTO,
  SalesWindowsRequestDTO,
  SalesWindowsResponseDTO,
} from '../models/sales-window-dto.model';
import { ChannelOverride, SalesWindowConfig } from '../models/sales-window.model';

@Injectable({
  providedIn: 'root',
})
export class SalesWindowAdapter {
  fromApi(salesWindows: SalesWindowsResponseDTO): SalesWindowConfig {
    return {
      defaultWindow: this.#mapDefaultWindowFromApi(salesWindows.default),
      channelOverrides: this.#mapChannelOverridesFromApi(salesWindows.by_channel),
    };
  }

  toApi(formValue: SalesWindowConfig): SalesWindowsRequestDTO {
    // B2B-15229: toApi sends full snapshots, so an empty by_channel array deletes existing overrides.
    if (!formValue.defaultWindow) {
      throw new Error('Sales window default window is required.');
    }
    const defaultWindow = formValue.defaultWindow;
    return {
      default: {
        since: this.#toNullableUtcIso(defaultWindow.salesStart),
        until: this.#toUtcIso(defaultWindow.salesEnd!),
      },
      by_channel: this.#mapChannelOverridesToApi(formValue.channelOverrides),
    };
  }

  #mapDefaultWindowFromApi(defaultWindow: SalesWindowsResponseDTO['default']): SalesWindowConfig['defaultWindow'] {
    if (defaultWindow === null) {
      return null;
    }
    return {
      salesStart: this.#toDate(defaultWindow.since),
      salesEnd: this.#toDate(defaultWindow.until),
    };
  }

  #mapChannelOverridesFromApi(byChannel: SalesWindowChannelResponseDTO[] | null | undefined): ChannelOverride[] {
    if (!byChannel) {
      return [];
    }

    return byChannel.map(ch => ({
      channelId: ch.channel_id,
      salesStart: this.#toDate(ch.since),
      salesEnd: this.#toDate(ch.until),
    }));
  }

  #mapChannelOverridesToApi(overrides: ChannelOverride[]): SalesWindowChannelRequestDTO[] {
    return overrides.map(override => ({
      channel_id: override.channelId,
      since: this.#toNullableUtcIso(override.salesStart),
      until: this.#toUtcIso(override.salesEnd!),
    }));
  }

  #toDate(utcIso: string | null): Date | null {
    if (utcIso === null) {
      return null;
    }
    return new Date(utcIso);
  }

  #toNullableUtcIso(date: Date | null): string | null {
    return date === null ? null : this.#toUtcIso(date);
  }

  #toUtcIso(date: Date): string {
    const utc = moment.utc(date);
    if (date == null || !utc.isValid()) {
      throw new Error('Sales window date is required and must be valid.');
    }

    // The BE forces second precision, so we have to drop the milliseconds.
    return utc.format('YYYY-MM-DDTHH:mm:ss[Z]');
  }
}
