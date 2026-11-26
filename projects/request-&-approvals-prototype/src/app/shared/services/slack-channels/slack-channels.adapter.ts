import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseAdapter } from '../../../core/base.adapter';
import { BaseResponse } from '../../models/base-response';
import { mapSlackChannelDto, SlackChannel, SlackChannelsApiData } from './slack-channels.model';

@Injectable({ providedIn: 'root' })
export class SlackChannelsAdapter
  extends BaseAdapter
  implements AdapterInterface<BaseResponse<SlackChannel[]>, BaseResponse<SlackChannelsApiData>>
{
  fromApi(response: BaseResponse<SlackChannelsApiData>): BaseResponse<SlackChannel[]> {
    const data: SlackChannel[] = (response?.data ?? []).map(mapSlackChannelDto);
    return new BaseResponse<SlackChannel[]>(data, this.getError(response?.error));
  }
}
