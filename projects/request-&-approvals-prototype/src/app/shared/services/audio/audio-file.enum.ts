export const audioFile = {
  scanError: 'assets/sounds/scan_error_sound.m4a',
} as const;

export type AudioFileET = (typeof audioFile)[keyof typeof audioFile];
