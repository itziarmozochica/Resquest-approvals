import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import {
  LinkOut,
  LinkOutData,
  LinkOutSettings,
  LinkOutSettingsData,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/link-out/link-out-settings.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

@Injectable({
  providedIn: 'root',
})
export class LinkOutSettingsAdapter implements AdapterInterface<LinkOutSettings, BaseResponse<LinkOutSettingsData>> {
  fromApi(response: BaseResponse<LinkOutSettingsData>): LinkOutSettings {
    const data = response.data;
    if (!data) {
      throw new Error('No data received from link-outs endpoint');
    }

    return {
      linkOuts: data.link_outs.map((dto: LinkOutData) => this.#mapLinkOutFromApi(dto)),
      attendText: data.attend_text,
      startsAt: data.starts_at ? new Date(data.starts_at) : null,
      endsAt: data.ends_at ? new Date(data.ends_at) : null,
      ticketPrice: data.ticket_price,
    };
  }

  toApi(settings: LinkOutSettings): LinkOutSettingsData {
    return {
      link_outs: settings.linkOuts.map((linkOut: LinkOut) => this.#mapLinkOutToApi(linkOut)),
      attend_text: settings.attendText,
      starts_at: settings.startsAt ? settings.startsAt.toISOString() : null,
      ends_at: settings.endsAt ? settings.endsAt.toISOString() : null,
      ticket_price: settings.ticketPrice,
    };
  }

  #mapLinkOutFromApi(dto: LinkOutData): LinkOut {
    return {
      redirectionUrl: dto.redirection_url,
      channelId: dto.channel_id,
      language: dto.language,
      shouldShowMainPlanView: dto.should_show_main_plan_view,
    };
  }

  #mapLinkOutToApi(linkOut: LinkOut): LinkOutData {
    return {
      redirection_url: linkOut.redirectionUrl,
      channel_id: linkOut.channelId,
      language: linkOut.language,
      should_show_main_plan_view: linkOut.shouldShowMainPlanView,
    };
  }
}
