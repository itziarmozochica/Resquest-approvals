import { SecondScreenConfiguration } from '@fz-original/app/modules/box-office/shared/models/second-screen-configuration';
import { SliderItem } from '@fz-original/app/shared/components/sliders/ken-burns-slider/ken-burns-slider.component';

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isOptionalNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || isNullableString(value);
}

/** Narrows a value read from storage to a second screen configuration; anything else is treated as no configuration. */
export function isSecondScreenConfiguration(value: unknown): value is SecondScreenConfiguration {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>; // narrowed to an object above; each field is checked below
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.standby_images) &&
    candidate.standby_images.every(image => typeof image === 'string') &&
    isNullableString(candidate.logo_url) &&
    isNullableString(candidate.standby_title) &&
    isNullableString(candidate.qr_url) &&
    isOptionalNullableString(candidate.standby_video_url) &&
    isOptionalNullableString(candidate.farewell_image_url)
  );
}

/** The standby slider items of a configuration: one per image, in the stored order. */
export function toStandbySliderItems(configuration: SecondScreenConfiguration): SliderItem[] {
  return configuration.standby_images.map(image => ({ alt: '', image }));
}

/**
 * The host shown under a QR and in the farewell line: `example.com` for `https://example.com/menu`. Anything that is not a URL
 * with a host is `null`, never the raw input, so the caller shows its default.
 */
export function getUrlHost(url: string): string | null {
  try {
    const { host } = new URL(url);
    return host === '' ? null : host;
  } catch {
    return null;
  }
}

/** A configuration field left empty in settings (`null`, absent or blank) reads as unset, so the screen shows its default. */
export function toFilledValue(value: string | null | undefined): string | null {
  return value == null || value.trim().length === 0 ? null : value;
}

/**
 * Whether `candidate` replaces the `stored` configuration: another configuration, or the same one edited later. A stale copy (the one
 * embedded in a setup read from storage) never overwrites a fresher one, and an unchanged one is not written again.
 */
export function shouldStoreSecondScreenConfiguration(
  candidate: SecondScreenConfiguration,
  stored: SecondScreenConfiguration | null,
): boolean {
  return stored === null || stored.id !== candidate.id || candidate.updated_at > stored.updated_at;
}
