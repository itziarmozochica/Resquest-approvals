import type { IconProp } from '@fortawesome/fontawesome-svg-core';

export interface ImmersivePlanChannel {
  id: string;
  name: string;
}

export interface PlansWithChannelsResponse {
  data: { plans: { channels: { channel_id: string; name: string | null; type: string | null }[]; id: number }[] } | null;
}

export const CHANNEL_I18N_PREFIX = 'planEdition.immersiveContentPlan.channelVariants';
export const CHANNEL_ADD_ICON: IconProp = ['fas', 'plus'];
export const CHANNEL_GAPS_ICON: IconProp = ['fas', 'exclamation-triangle'];
