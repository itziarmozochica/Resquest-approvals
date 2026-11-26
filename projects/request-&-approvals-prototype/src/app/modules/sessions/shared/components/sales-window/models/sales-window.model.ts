export type SalesWindowMaxBoundType = 'sessionEnd' | 'defaultWindowEnd';

export interface SalesWindow {
  salesStart: Date | null;
  salesEnd: Date | null;
}

export interface SalesWindowConfig {
  defaultWindow: SalesWindow | null;
  channelOverrides: ChannelOverride[];
}

export interface ChannelOverride extends SalesWindow {
  channelId: string;
}
