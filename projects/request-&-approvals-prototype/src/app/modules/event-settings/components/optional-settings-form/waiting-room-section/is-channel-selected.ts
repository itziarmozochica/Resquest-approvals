export function isChannelSelected(channelId: string | null | undefined): boolean {
  const length = channelId?.length ?? 0;
  return length > 0;
}
