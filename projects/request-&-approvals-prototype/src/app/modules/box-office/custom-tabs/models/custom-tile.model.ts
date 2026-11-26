export const CustomTileColors = {
  primary: '#0089e3', // $palette-primary-500
  accent: '#ae92ed', // $palette-accent-300
  positive: '#24a865', // $palette-positive-500
  warning: '#ff8c00', // $palette-warning-500
  danger: '#eb0052', // $palette-danger-500
} as const;

export type CustomTileColorKeys = keyof typeof CustomTileColors;
export type CustomTileColorValues = (typeof CustomTileColors)[CustomTileColorKeys];
