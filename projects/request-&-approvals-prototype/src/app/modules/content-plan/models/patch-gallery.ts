/** Wire shapes for the B2B gallery PATCH / POST endpoints. See `plans/PARTNERS/PARTNERS-10455_hero-gallery.md` §5.4.2 and §5.4.3. */
import { GALLERY_VARIANT_ASPECT_RATIO, GalleryLayoutMode } from './get-gallery';

/** The API also accepts `null` for the same effect. */
export const AUTOMATIC_GALLERY_LAYOUT = 'automatic';

export type GalleryLayoutPatchValue = GalleryLayoutMode | typeof AUTOMATIC_GALLERY_LAYOUT | null;

interface ExistingVariantPatchDTO {
  id: number;
}

/** A nested create is always the `16:9` variant; the `1:1` asset is the root itself. */
interface NewVariantPatchDTO {
  url: string;
  name: string;
  aspect_ratio: typeof GALLERY_VARIANT_ASPECT_RATIO;
  poster?: string;
  playback_rate?: string;
}

export type PlanMediaVariantPatchDTO = ExistingVariantPatchDTO | NewVariantPatchDTO;

interface ExistingPlanMediaPatchDTO {
  id: number;
  /**
   * Full replace of that root's variants: omitting the key leaves them unchanged, `[]` deletes
   * them all. Never send an existing variant id and a new upload of the same aspect ratio together.
   */
  variants?: Array<PlanMediaVariantPatchDTO>;
}

interface NewPlanMediaPatchDTO {
  url: string;
  name: string;
  poster?: string;
  playback_rate?: string;
  variants?: Array<PlanMediaVariantPatchDTO>;
}

export type PlanMediaDTO = ExistingPlanMediaPatchDTO | NewPlanMediaPatchDTO;

/** Omitting the whole `gallery_layout` key leaves both columns unchanged. */
export interface PlanGalleryLayoutPatchDTO {
  desktop?: GalleryLayoutPatchValue;
  /** v1 accepts only automatic on mobile; the API rejects a mode here. */
  mobile?: typeof AUTOMATIC_GALLERY_LAYOUT | null;
}

export interface PlanGalleryPatchDTO {
  photos: PlanMediaDTO[];
  gallery_layout?: PlanGalleryLayoutPatchDTO;
}

export interface PlanGalleryPostDTO {
  media: PlanMediaDTO[];
  gallery_layout?: PlanGalleryLayoutPatchDTO;
}

export type PlanGalleryPatch = PlanGalleryPatchDTO;

export type PlanGalleryPost = PlanGalleryPostDTO;

export function toGalleryLayoutPatchValue(mode: GalleryLayoutMode | null): GalleryLayoutPatchValue {
  return mode ?? AUTOMATIC_GALLERY_LAYOUT;
}
