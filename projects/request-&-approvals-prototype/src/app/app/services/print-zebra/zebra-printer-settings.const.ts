import { ZebraCut } from './utils/zebra-print-settings.util';

export const zebraBackfeedCommand = '~JSN';

export const zebraDarknessCommand = '~SD24';

export const zebraCutCommands: Readonly<Record<ZebraCut, string>> = {
  full: '^MMC',
  none: '^MMT',
};

export const zebraTearOffCommands: Readonly<Record<'basic' | 'prePrinted', string>> = {
  basic: '~TA000',
  prePrinted: '~TA012',
};

export const zebraMediaTrackingCommands: Readonly<Record<'basic' | 'prePrinted', string>> = {
  basic: '^MNA',
  prePrinted: '^MNM',
};

export const zebraDesktopResetCommands = '^LT0^LS0^LH0,0^PON';
