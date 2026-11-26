import { ChannelPermission } from '../../models/channel/channel.model';

export interface ChannelsData {
  channels: ChannelData[];
}

export interface ChannelData {
  id: string;
  name: string;
  type: string;
}

export interface ChannelsDataWithPermissions {
  channels: ChannelDataWithPermissions[];
}
export interface ChannelDataWithPermissions extends ChannelData {
  permissions: ChannelPermission[];
}
