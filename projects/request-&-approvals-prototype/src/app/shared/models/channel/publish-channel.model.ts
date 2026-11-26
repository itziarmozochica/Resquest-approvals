export interface PublishChannelDTO {
  channel: string;
  is_visible?: boolean;
  payment_collector?: string;
}

export interface PublishChannelBodyDTO {
  data: PublishChannelDTO[];
  b2b_user_id: number;
  send_push_notifications: boolean;
}
