import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import {
  AuctionSettings,
  AuctionSettingsData,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/auction/auction-settings.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

@Injectable({
  providedIn: 'root',
})
export class AuctionSettingsAdapter implements AdapterInterface<AuctionSettings, BaseResponse<AuctionSettingsData>> {
  fromApi(response: BaseResponse<AuctionSettingsData>): AuctionSettings {
    const data = response.data;
    return {
      auctionStartsAt: data?.auction_starts_at ? new Date(data.auction_starts_at) : null,
      auctionEndsAt: data?.auction_ends_at ? new Date(data.auction_ends_at) : null,
      eventStartsAt: data?.event_starts_at ? new Date(data.event_starts_at) : null,
      eventEndsAt: data?.event_ends_at ? new Date(data.event_ends_at) : null,
      maximumBidIncrement: data?.maximum_bid_increment ?? null,
      minimumBidIncrement: data?.minimum_bid_increment ?? null,
      status: data?.status ?? null,
      startingBidAmount: data?.starting_bid_amount ?? null,
    };
  }

  toApi(model: AuctionSettings): AuctionSettingsData {
    return {
      auction_starts_at: model.auctionStartsAt != null ? model.auctionStartsAt.toISOString() : null,
      auction_ends_at: model.auctionEndsAt != null ? model.auctionEndsAt.toISOString() : null,
      event_starts_at: model.eventStartsAt != null ? model.eventStartsAt.toISOString() : null,
      event_ends_at: model.eventEndsAt != null ? model.eventEndsAt.toISOString() : null,
      extension_duration_minutes: 2,
      extension_window_minutes: 2,
      max_extension_count: 5,
      maximum_bid_increment: model.maximumBidIncrement,
      minimum_bid_increment: model.minimumBidIncrement ?? 1,
      starting_bid_amount: model.startingBidAmount,
    };
  }
}
