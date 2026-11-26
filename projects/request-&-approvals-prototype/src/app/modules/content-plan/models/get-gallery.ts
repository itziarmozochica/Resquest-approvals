/** Wire shapes for the B2B gallery GET endpoint. See `plans/PARTNERS/PARTNERS-10455_hero-gallery.md` §5.4.1. */

export type GalleryAspectRatio = '1:1' | '16:9';

export const GALLERY_ROOT_ASPECT_RATIO = '1:1' satisfies GalleryAspectRatio;
export const GALLERY_VARIANT_ASPECT_RATIO = '16:9' satisfies GalleryAspectRatio;

export type GalleryLayoutMode = 'one' | 'two' | 'three' | 'four' | 'five' | 'expanded';

export const GALLERY_LAYOUT_MODES: ReadonlyArray<GalleryLayoutMode> = ['one', 'two', 'three', 'four', 'five', 'expanded'];

export interface PlanGalleryLayoutDTO {
  desktop: GalleryLayoutMode | null;
  mobile: GalleryLayoutMode | null;
}

export interface PlanPhotoDTO {
  id: number;
  name: string;
  order: number;
  role: string;
  url: string;
}

/** The `1:1` entry repeats the root and carries the root id; only the `16:9` entry has its own id, which is what PATCH keeps it by. */
export interface PlanMediaVariantDTO {
  id: number;
  name: string;
  media_type: 'photo' | 'video';
  url: string;
  aspect_ratio: GalleryAspectRatio;
  poster: string | null;
  playback_rate: number | null;
}

export interface PlanMediaDTO {
  id: number;
  media_type: 'photo' | 'video';
  url: string;
  name: string;
  poster?: string;
  playback_rate?: number;
  variants?: Array<PlanMediaVariantDTO>;
}

export interface PlanGalleryDTO {
  id: number | null;
  name: string | null;
  num_plans_using_gallery: number;
  gallery_layout?: PlanGalleryLayoutDTO;
  media?: Array<PlanMediaDTO>;
}

export type PlanPhoto = PlanPhotoDTO;
export type PlanMediaVariant = PlanMediaVariantDTO;
export type PlanMedia = PlanMediaDTO;

export interface PlanGallery extends Omit<PlanGalleryDTO, 'gallery_layout' | 'media'> {
  gallery_layout: PlanGalleryLayoutDTO;
  media: Array<PlanMediaDTO>;
}

export const EMPTY_GALLERY_LAYOUT: PlanGalleryLayoutDTO = { desktop: null, mobile: null };

export function isGalleryLayoutMode(value: unknown): value is GalleryLayoutMode {
  return (GALLERY_LAYOUT_MODES as readonly unknown[]).includes(value); // widening for the lookup only, it claims nothing about `value`
}

/** The `1:1` entry is the root repeated, so it is never a variant row and must not be sent back as one. */
export function getSixteenByNineVariant(media: Pick<PlanMediaDTO, 'variants'>): PlanMediaVariantDTO | undefined {
  return media.variants?.find(variant => variant.aspect_ratio === GALLERY_VARIANT_ASPECT_RATIO);
}
