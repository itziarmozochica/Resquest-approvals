export type QuickSetupScheduleColorKey = 'accent' | 'danger' | 'neutral' | 'positive' | 'primary' | 'warning';

export const quickSetupScheduleColorSequence: readonly QuickSetupScheduleColorKey[] = [
  'accent',
  'warning',
  'danger',
  'positive',
  'primary',
  'neutral',
];

export const getQuickSetupScheduleColorKey = (index: number): QuickSetupScheduleColorKey => {
  const normalizedIndex = Math.max(0, index);

  return quickSetupScheduleColorSequence[normalizedIndex % quickSetupScheduleColorSequence.length];
};

export const buildQuickSetupScheduleCardClass = (index: number): string => {
  const colorKey = getQuickSetupScheduleColorKey(index);

  return `quick-setup-schedule-card quick-setup-schedule-card--${colorKey}`;
};
