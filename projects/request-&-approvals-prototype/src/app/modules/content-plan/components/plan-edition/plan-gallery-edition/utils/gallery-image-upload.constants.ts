export const GALLERY_IMAGE_MIN_SIZE_PX = 800;
export const GALLERY_IMAGE_MAX_SIZE_BYTES = 5 * Math.pow(2, 20);
export const GALLERY_IMAGE_ACCEPTED_TYPES = ['image/png', 'image/jpeg'] as const;
export const GALLERY_CROP_SQUARE_TOLERANCE_PX = 1;

export const GALLERY_VIDEO_MAX_SIZE_BYTES = 8 * Math.pow(2, 20);
export const GALLERY_VIDEO_ACCEPTED_TYPES = ['video/mp4'] as const;

/**
 * Absolute difference allowed on the `width / height` ratio — NOT a percentage of it. 16/9 is
 * ~1.7778, so the accepted band is ~1.7578 to ~1.7978. Reading it as "±2% of the ratio" gives a band
 * roughly 1.8x wider and is the exact divergence this constant exists to prevent.
 *
 * fever2 derives its server-side check from the same number, so a file that passes here can never be
 * rejected there.
 */
export const GALLERY_ASPECT_TOLERANCE = 0.02;

export const GALLERY_SIXTEEN_BY_NINE_RATIO = 16 / 9;
export const GALLERY_IMAGE_16_9_MIN_WIDTH = 1920;
export const GALLERY_IMAGE_16_9_MIN_HEIGHT = 1080;
