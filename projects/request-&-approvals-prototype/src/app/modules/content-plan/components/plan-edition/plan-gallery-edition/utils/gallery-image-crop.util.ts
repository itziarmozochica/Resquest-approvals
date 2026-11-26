import { ImageCroppedEvent, type CropperPosition } from 'ngx-image-cropper';
import { Observable, of, timeout } from 'rxjs';

import {
  GALLERY_ASPECT_TOLERANCE,
  GALLERY_CROP_SQUARE_TOLERANCE_PX,
  GALLERY_IMAGE_16_9_MIN_HEIGHT,
  GALLERY_IMAGE_16_9_MIN_WIDTH,
  GALLERY_IMAGE_ACCEPTED_TYPES,
  GALLERY_IMAGE_MAX_SIZE_BYTES,
  GALLERY_IMAGE_MIN_SIZE_PX,
  GALLERY_SIXTEEN_BY_NINE_RATIO,
  GALLERY_VIDEO_ACCEPTED_TYPES,
  GALLERY_VIDEO_MAX_SIZE_BYTES,
} from './gallery-image-upload.constants';

export type GalleryCropAspect = 'square' | 'sixteenByNine';

export interface GalleryCropAspectSpec {
  minHeight: number;
  minWidth: number;
  ratio: number;
}

export const GALLERY_CROP_ASPECTS: Record<GalleryCropAspect, GalleryCropAspectSpec> = {
  square: { minHeight: GALLERY_IMAGE_MIN_SIZE_PX, minWidth: GALLERY_IMAGE_MIN_SIZE_PX, ratio: 1 },
  sixteenByNine: {
    minHeight: GALLERY_IMAGE_16_9_MIN_HEIGHT,
    minWidth: GALLERY_IMAGE_16_9_MIN_WIDTH,
    ratio: GALLERY_SIXTEEN_BY_NINE_RATIO,
  },
};

export type ImagePreCropValidationResult =
  | { status: 'valid'; width: number; height: number }
  | { status: 'invalid_file' }
  | { status: 'too_small'; width: number; height: number; minSize: number };

export interface CropSquareDimensions {
  height: number;
  width: number;
}

export function canFitSquareCropMinSize(width: number, height: number, minSize = GALLERY_IMAGE_MIN_SIZE_PX): boolean {
  return Math.min(width, height) >= minSize;
}

export function getCroppedSquareDimensions(event: ImageCroppedEvent): CropSquareDimensions {
  const position = event.imagePosition;
  if (position) {
    return getCropDimensionsFromImagePosition(position);
  }

  return {
    height: event.height,
    width: event.width,
  };
}

export function getCropDimensionsFromCropperPosition(
  cropper: CropperPosition,
  displayWidth: number,
  transformedImageWidth: number,
): CropSquareDimensions | null {
  if (displayWidth <= 0 || transformedImageWidth <= 0) {
    return null;
  }

  const ratio = transformedImageWidth / displayWidth;
  return {
    height: Math.round((cropper.y2 - cropper.y1) * ratio),
    width: Math.round((cropper.x2 - cropper.x1) * ratio),
  };
}

export function getCropDimensionsFromImagePosition(position: CropperPosition): CropSquareDimensions {
  return {
    height: Math.round(position.y2 - position.y1),
    width: Math.round(position.x2 - position.x1),
  };
}

/**
 * The shared aspect test: an absolute difference on `width / height`, matching fever2 exactly.
 * Roots keep the stricter 1px square check below instead of going through this.
 */
export function matchesAspectRatio(width: number, height: number, ratio: number): boolean {
  if (height <= 0) {
    return false;
  }
  return Math.abs(width / height - ratio) <= GALLERY_ASPECT_TOLERANCE;
}

export function isSixteenByNine(width: number, height: number): boolean {
  return matchesAspectRatio(width, height, GALLERY_SIXTEEN_BY_NINE_RATIO);
}

export function isValidSixteenByNineDimensions(
  dimensions: CropSquareDimensions,
  spec: GalleryCropAspectSpec = GALLERY_CROP_ASPECTS.sixteenByNine,
): boolean {
  return isSixteenByNine(dimensions.width, dimensions.height) && dimensions.width >= spec.minWidth && dimensions.height >= spec.minHeight;
}

export function isValidDimensionsForAspect(dimensions: CropSquareDimensions, aspect: GalleryCropAspect): boolean {
  return aspect === 'square'
    ? isValidSquareDimensions(dimensions, GALLERY_CROP_ASPECTS.square.minWidth)
    : isValidSixteenByNineDimensions(dimensions);
}

export function canFitCropMinSize(width: number, height: number, aspect: GalleryCropAspect): boolean {
  const spec = GALLERY_CROP_ASPECTS[aspect];
  const cropWidth = Math.min(width, height * spec.ratio);
  const cropHeight = cropWidth / spec.ratio;
  return cropWidth >= spec.minWidth && cropHeight >= spec.minHeight;
}

export function isValidSquareDimensions(dimensions: CropSquareDimensions, minSize = GALLERY_IMAGE_MIN_SIZE_PX): boolean {
  const isSquare = Math.abs(dimensions.width - dimensions.height) <= GALLERY_CROP_SQUARE_TOLERANCE_PX;
  return isSquare && dimensions.width >= minSize && dimensions.height >= minSize;
}

export function isValidCroppedSquare(event: ImageCroppedEvent, minSize = GALLERY_IMAGE_MIN_SIZE_PX): boolean {
  return isValidSquareDimensions(getCroppedSquareDimensions(event), minSize);
}

export function croppedEventToFile(event: ImageCroppedEvent, originalFile: File): File | null {
  if (!event.blob || event.blob.size > GALLERY_IMAGE_MAX_SIZE_BYTES) {
    return null;
  }

  const isPng = originalFile.type === 'image/png';
  const extension = isPng ? 'png' : 'jpg';
  const mimeType = isPng ? 'image/png' : 'image/jpeg';
  const baseName = originalFile.name.replace(/\.[^.]+$/, '') || 'gallery-image';

  return new File([event.blob], `${baseName}.${extension}`, { type: mimeType, lastModified: Date.now() });
}

export function getOutputFormat(file: File): 'png' | 'jpeg' {
  return file.type === 'image/png' ? 'png' : 'jpeg';
}

export function isAcceptedImageFile(file: File): boolean {
  // widening for the lookup only, it claims nothing about `file.type`
  const isAcceptedType = (GALLERY_IMAGE_ACCEPTED_TYPES as readonly string[]).includes(file.type);
  return isAcceptedType && file.size <= GALLERY_IMAGE_MAX_SIZE_BYTES;
}

export function isValidGalleryVideo(file: File): boolean {
  const isAcceptedType = (GALLERY_VIDEO_ACCEPTED_TYPES as readonly string[]).includes(file.type);
  return isAcceptedType && file.size <= GALLERY_VIDEO_MAX_SIZE_BYTES;
}

export const VIDEO_METADATA_TIMEOUT_MS = 15000;

/**
 * Reads a video's intrinsic size by letting the browser parse its metadata. Emits `null` when the
 * size cannot be read at all: a file that fails to decode, metadata that never arrives, or a
 * `loadedmetadata` reporting 0x0, which some browsers do for a blob url. That is not the same as
 * failing the aspect check, and the caller says so rather than claiming the file is not 16:9.
 */
export function readVideoDimensions(file: File): Observable<CropSquareDimensions | null> {
  return new Observable<CropSquareDimensions | null>(subscriber => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');

    const release = (): void => {
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute('src');
      URL.revokeObjectURL(objectUrl);
    };

    const emit = (dimensions: CropSquareDimensions | null): void => {
      release();
      subscriber.next(dimensions);
      subscriber.complete();
    };

    video.onloadedmetadata = (): void => {
      const { videoHeight: height, videoWidth: width } = video;
      emit(width > 0 && height > 0 ? { height, width } : null);
    };
    video.onerror = (): void => emit(null);

    video.preload = 'metadata';
    video.src = objectUrl;

    // Unsubscribing before the metadata lands stops the fetch and drops the object url with it,
    // which is also what the timeout below leans on.
    return release;
  }).pipe(timeout({ first: VIDEO_METADATA_TIMEOUT_MS, with: () => of(null) }));
}

export function validateImagePreCrop(file: File, aspect: GalleryCropAspect = 'square'): Observable<ImagePreCropValidationResult> {
  if (!isAcceptedImageFile(file)) {
    return new Observable(subscriber => {
      subscriber.next({ status: 'invalid_file' });
      subscriber.complete();
    });
  }

  return new Observable(subscriber => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = (): void => {
      URL.revokeObjectURL(objectUrl);
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      if (!canFitCropMinSize(width, height, aspect)) {
        subscriber.next({
          height,
          minSize: GALLERY_CROP_ASPECTS[aspect].minWidth,
          status: 'too_small',
          width,
        });
        subscriber.complete();
        return;
      }

      subscriber.next({ height, status: 'valid', width });
      subscriber.complete();
    };

    img.onerror = (): void => {
      URL.revokeObjectURL(objectUrl);
      subscriber.next({ status: 'invalid_file' });
      subscriber.complete();
    };

    img.src = objectUrl;
  });
}
