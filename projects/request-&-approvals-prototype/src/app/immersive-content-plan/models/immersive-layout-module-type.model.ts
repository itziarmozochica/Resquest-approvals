// Manual mirror of data-railway `infrastructure/planview_layout/planview_layout_schema.py`.
// That file wins over any other document, including this one, whenever they disagree.
export const immersiveModuleTypes = [
  'immersive-artists',
  'immersive-campaign-banner',
  'immersive-description',
  'immersive-faqs',
  'immersive-hero',
  'immersive-highlights',
  'immersive-how-it-works',
  'immersive-lineup',
  'immersive-links',
  'immersive-logos',
  'immersive-performers',
  'immersive-photo',
  'immersive-similar',
  'immersive-similar-plans',
  'immersive-user-reviews',
  'immersive-venue',
  'immersive-well-performing-plans',
] as const;

export type ImmersiveModuleType = (typeof immersiveModuleTypes)[number];

export const HERO_MODULE_TYPE: ImmersiveModuleType = 'immersive-hero';
export const DESCRIPTION_MODULE_TYPE: ImmersiveModuleType = 'immersive-description';
