import { Injectable } from '@angular/core';

import { ChannelData, ChannelsData } from '@fz-original/app/shared/services/channel/channel.model';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import { Channel } from '../../models/channel/channel.model';

@Injectable({
  providedIn: 'root',
})
export class ChannelsAdapter implements AdapterInterface<BaseResponse<Channel[]>> {
  fromApi(response: BaseResponse<ChannelsData>): BaseResponse<Channel[]> {
    return new BaseResponse<Channel[]>(this.getData(response?.data), this.getError(response?.error));
  }

  private getData(data: ChannelsData | null): Channel[] | null {
    if (data == null) {
      return null;
    }
    return data.channels.map((channelData: ChannelData) => ({
      id: String(channelData.id),
      name: channelData.name,
      type: channelData.type,
    }));
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: `errors.${data.code}` };
  }
}
