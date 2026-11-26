import type { AvailabilityQueryBase } from '../models/availability-query.model';

export function resolveWireChannel(query: Pick<AvailabilityQueryBase, 'channel' | 'channelId'>): string | undefined {
  return query.channelId !== undefined && query.channelId.length > 0 ? query.channelId : query.channel;
}
