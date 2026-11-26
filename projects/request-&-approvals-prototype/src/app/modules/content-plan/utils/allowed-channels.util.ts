import { PartnerChannel } from '../models/partner-channels.model';

/**
 * The partner's channel catalog intersected with the channels the plan or its
 * session types sell through. Shared by the translations and content surfaces so
 * both list the same set.
 */
export function allowedChannelsForPlan(
  partnerChannels: readonly PartnerChannel[],
  planChannelIds: readonly string[],
  sessionTypeChannelIds: readonly string[],
): PartnerChannel[] {
  const usedByPlan = new Set<string>([...planChannelIds, ...sessionTypeChannelIds]);
  return partnerChannels.filter((channel: PartnerChannel) => usedByPlan.has(channel.id));
}
