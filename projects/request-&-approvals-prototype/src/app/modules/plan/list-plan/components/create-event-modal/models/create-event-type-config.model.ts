import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import type { IgntIconVariant } from '@ignite/icon';

import { CreateEventType } from '../create-event.model';

export interface CreateEventTypeConfig {
  icon: string;
  type: CreateEventType;
  iconVariant?: IgntIconVariant;
  permission?: Permissions;
}

export const CREATE_EVENT_TYPE_CONFIGS: readonly CreateEventTypeConfig[] = [
  { icon: 'star', type: 'standard' },
  { icon: 'clipboard-list', permission: Permissions.CAN_MANAGE_WAITLISTS, type: 'waitlist' },
  { icon: 'thumbs-up', permission: Permissions.CAN_MANAGE_AUCTIONS, type: 'auction' },
  { icon: 'external-link', permission: Permissions.CAN_MANAGE_LINK_OUTS, type: 'link_out' },
  { icon: 'crown', permission: Permissions.CAN_MANAGE_PRIZE_DRAWS, type: 'prize_draw' },
  { icon: 'badge-percent', permission: Permissions.CAN_MANAGE_REDEEM_NOW, type: 'redeem_now' },
  { icon: 'bags-shopping', permission: Permissions.CAN_MANAGE_SHOWCASE, type: 'showcase' },
  { icon: 'gift', permission: Permissions.CAN_MANAGE_GIVEAWAYS, type: 'giveaway' },
  { icon: 'play', permission: Permissions.CAN_MANAGE_MOVIES, type: 'movie' },
  { icon: 'gift-card', permission: Permissions.CAN_MANAGE_GIFT_CARDS, type: 'gift_card' },
] as const;
