export const quickSetupCategoryIds = [
  'live_shows',
  'music',
  'tourism',
  'food_and_drinks',
  'activities',
  'culture',
  'education',
  'nightlife',
  'wellness',
  'live_sports',
  'immersive_exhibits',
] as const;

export type QuickSetupCategoryId = (typeof quickSetupCategoryIds)[number];
