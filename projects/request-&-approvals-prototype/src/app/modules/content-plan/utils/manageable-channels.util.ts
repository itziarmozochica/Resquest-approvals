import { PartnerChannel } from '../models/partner-channels.model';
import { PlanSessionType } from '../models/plan-session-types.model';

export function computeManageableChannelIds(
  partnerChannels: readonly PartnerChannel[],
  planChannels: readonly { id: string }[],
  planSessionTypes: readonly PlanSessionType[],
): ReadonlySet<string> {
  const catalog = new Set<string>(partnerChannels.map((channel: PartnerChannel) => channel.id));
  const manageable = new Set<string>();
  for (const channel of planChannels) {
    if (catalog.has(channel.id)) {
      manageable.add(channel.id);
    }
  }
  for (const sessionType of planSessionTypes) {
    for (const channelId of sessionType.channels ?? []) {
      if (catalog.has(channelId)) {
        manageable.add(channelId);
      }
    }
  }
  return manageable;
}
