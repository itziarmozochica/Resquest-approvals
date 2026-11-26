import { Injectable } from '@angular/core';

import { ChannelDataWithPermissions, ChannelsDataWithPermissions } from '@fz-original/app/shared/services/channel/channel.model';

import { IBaseResponse } from '../../models/base-response';
import { ChannelWithUserPermissions } from '../../models/channel/channel.model';

@Injectable({
  providedIn: 'root',
})
export class ChannelsWithPermissionsAdapter {
  fromApi(response: IBaseResponse<ChannelsDataWithPermissions>): ChannelWithUserPermissions[] {
    if (response.error || response.data === null) {
      throw response.error;
    }

    return this.#getChannelsWithUserPermissionsData(response.data);
  }

  #getChannelsWithUserPermissionsData(data: ChannelsDataWithPermissions): ChannelWithUserPermissions[] {
    return data.channels.map((channelData: ChannelDataWithPermissions) => ({
      id: String(channelData.id),
      name: channelData.name,
      type: channelData.type,
      permissions: channelData.permissions,
    }));
  }
}
