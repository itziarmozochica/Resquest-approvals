import type { ImmersiveModuleType } from './immersive-layout-module-type.model';

/**
 * Reference screenshot per module type: how the module looks on the immersive page.
 *
 * These are static captures shared by every plan, NOT a preview of the plan being edited. They
 * live outside the descriptor registry on purpose: that file mirrors the backend schema, this one
 * is a UI aid.
 *
 * The Cloudinary URLs below are temporary captures and will be replaced by a designed placeholder.
 * A type with no entry simply renders no preview section.
 */
const CLOUDINARY_BASE = 'https://media.feverup.com/image/upload/t_compressed_width_720';

// `immersive-similar` and `immersive-similar-plans` render the same carousel, so they share one capture.
const SIMILAR_PLANS_CAPTURE = `${CLOUDINARY_BASE}/v1788267766/immersive-similar-plans_bbqw7m.png`;

const modulePreviewImages: Partial<Record<ImmersiveModuleType, string>> = {
  'immersive-campaign-banner': `${CLOUDINARY_BASE}/v1793019179/immersive-campaign-banner-preview_caczzk.png`,
  'immersive-description': `${CLOUDINARY_BASE}/v1788267762/immersive-description_l7pi0a.png`,
  'immersive-faqs': `${CLOUDINARY_BASE}/v1788267762/immersive-faqs_mj7x3z.png`,
  'immersive-hero': `${CLOUDINARY_BASE}/v1788267767/immersive-hero_zyv3pf.png`,
  'immersive-highlights': `${CLOUDINARY_BASE}/v1788267766/immersive-highlights_zhnewp.png`,
  'immersive-how-it-works': `${CLOUDINARY_BASE}/v1788267762/immersive-how-it-works_rdpsvm.png`,
  'immersive-lineup': `${CLOUDINARY_BASE}/v1792135976/immersive-program_t4izl6.png`,
  'immersive-links': `${CLOUDINARY_BASE}/v1788267762/immersive-links_u0qijk.png`,
  'immersive-logos': `${CLOUDINARY_BASE}/v1793019178/immersive-sponsors-preview_wq27ty.png`,
  'immersive-performers': `${CLOUDINARY_BASE}/v1792135976/immersive-performers_kwfqvb.png`,
  'immersive-photo': `${CLOUDINARY_BASE}/v1788267763/immersive-gallery_eb2v09.png`,
  'immersive-similar': SIMILAR_PLANS_CAPTURE,
  'immersive-similar-plans': SIMILAR_PLANS_CAPTURE,
  'immersive-user-reviews': `${CLOUDINARY_BASE}/v1788267766/immersive-reviews_klrw6s.png`,
  'immersive-venue': `${CLOUDINARY_BASE}/v1788267763/immersive-venue_b9wylj.png`,
};

export function getModulePreviewImage(type: string): string | null {
  return modulePreviewImages[type as ImmersiveModuleType] ?? null;
}
