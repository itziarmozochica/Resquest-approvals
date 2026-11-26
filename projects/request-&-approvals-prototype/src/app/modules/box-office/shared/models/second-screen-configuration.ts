/**
 * The idle banner is either `standby_images` or one `standby_video_url`, never both: the kind is read from which one is set.
 * `standby_video_url` and `farewell_image_url` are optional until the backend serves them (B2BO-9598).
 */
export interface SecondScreenConfiguration {
  created_at: string;
  id: string;
  logo_url: string | null;
  name: string;
  partner_id: number;
  qr_url: string | null;
  standby_images: string[];
  standby_title: string | null;
  updated_at: string;
  farewell_image_url?: string | null;
  standby_video_url?: string | null;
}

export interface SecondScreenConfigurationBody {
  logo_url: string | null;
  name: string;
  qr_url: string | null;
  standby_images: string[];
  standby_title: string | null;
  farewell_image_url?: string | null;
  standby_video_url?: string | null;
}

/** Response `data` of a media upload: the stored URL, images and videos alike. */
export interface SecondScreenConfigurationMediaUpload {
  image_url: string;
}

/** Multipart `usage` of a media upload: the backend checks the file type and size against it. */
export type SecondScreenConfigurationMediaUsage = 'farewell_image' | 'logo' | 'standby_image' | 'standby_video';

export const SECOND_SCREEN_CONFIGURATION_IMAGE_TYPES = ['image/png', 'image/jpeg'] as const;
export const SECOND_SCREEN_CONFIGURATION_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const;

export const SECOND_SCREEN_CONFIGURATION_MAX_STANDBY_IMAGES = 8;

export const SecondScreenConfigurationErrorCode = {
  doesNotBelongToPartner: 'SECOND_SCREEN_CONFIGURATION_DOES_NOT_BELONG_TO_PARTNER',
  inUse: 'SECOND_SCREEN_CONFIGURATION_IN_USE',
  invalidUrl: 'SECOND_SCREEN_CONFIGURATION_INVALID_URL',
  notFound: 'SECOND_SCREEN_CONFIGURATION_NOT_FOUND',
  tooManyStandbyImages: 'SECOND_SCREEN_CONFIGURATION_TOO_MANY_STANDBY_IMAGES',
} as const;

export type SecondScreenConfigurationErrorCodes =
  (typeof SecondScreenConfigurationErrorCode)[keyof typeof SecondScreenConfigurationErrorCode];

/** Error body of a 409 on delete: the configuration is still linked to live onsite setups. */
export interface SecondScreenConfigurationInUseData {
  onsite_setup_count: number;
}
