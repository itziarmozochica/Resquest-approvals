import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';

import { Channel } from '../../../../shared/services/session-availability/channel.enum';

export function getChannelsAndIncludeCurrentWhenMissing(
  partnerChannelOptions: SelectOption[],
  currentChannelId: string | null | undefined,
): SelectOption[] {
  if (partnerChannelOptions.length === 0) {
    return [];
  }

  if (currentChannelId == null || currentChannelId.length === 0 || partnerChannelOptions.some(option => option.id === currentChannelId)) {
    return partnerChannelOptions;
  }

  return [...partnerChannelOptions, { id: currentChannelId, title: currentChannelId }];
}

export function resolveDefaultChannelId(partnerChannelOptions: SelectOption[]): string {
  if (partnerChannelOptions.some(option => option.id === Channel.BoxOffice)) {
    return Channel.BoxOffice;
  }

  return partnerChannelOptions[0]?.id ?? Channel.BoxOffice;
}

export function shouldShowChannelSelector(channelSelectOptions: SelectOption[]): boolean {
  if (channelSelectOptions.length === 0) {
    return false;
  }

  return !(channelSelectOptions.length === 1 && channelSelectOptions[0].id === Channel.BoxOffice);
}
