export interface ChannelDTO {
  id: string;
  name?: string;
  type?: string;
}

export class Channel {
  constructor(
    public id: string,
    public name?: string,
    public type?: string,
  ) {}
}

export type ChannelPermission = 'can_publish_main_plan_in_channel' | 'can_publish_session_type_in_channel';

export interface ChannelWithUserPermissions extends Channel {
  permissions: ChannelPermission[];
}
