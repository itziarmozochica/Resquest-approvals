import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntButtonComponent, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { CropperPosition, Dimensions, ImageCropperComponent, LoadedImage } from 'ngx-image-cropper';

import {
  canFitCropMinSize,
  croppedEventToFile,
  CropSquareDimensions,
  GALLERY_CROP_ASPECTS,
  GalleryCropAspect,
  getCropDimensionsFromCropperPosition,
  getCroppedSquareDimensions,
  getOutputFormat,
  isValidDimensionsForAspect,
} from '../utils/gallery-image-crop.util';

export interface GalleryImageCropModalData {
  readonly imageFile: File;
  readonly aspect?: GalleryCropAspect;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntDialogModule, ImageCropperComponent, TranslateModule],
  selector: 'app-gallery-image-crop-modal',
  standalone: true,
  styleUrl: './gallery-image-crop-modal.component.scss',
  templateUrl: './gallery-image-crop-modal.component.html',
})
export class GalleryImageCropModalComponent {
  protected readonly data = inject<GalleryImageCropModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<File>>(IGNT_DIALOG_REF);
  private readonly imageCropper = viewChild<ImageCropperComponent>('imageCropper');

  protected readonly aspect: GalleryCropAspect = this.data.aspect ?? 'square';
  protected readonly aspectSpec = GALLERY_CROP_ASPECTS[this.aspect];
  protected readonly minSizePx = this.aspectSpec.minWidth;
  protected readonly minHeightPx = this.aspectSpec.minHeight;
  protected readonly aspectRatio = this.aspectSpec.ratio;
  protected readonly isSixteenByNine = this.aspect === 'sixteenByNine';
  protected readonly outputFormat = getOutputFormat(this.data.imageFile);

  protected readonly cropDimensions = signal<CropSquareDimensions | null>(null);
  protected readonly sourceTooSmall = signal(false);
  protected readonly sourceDimensions = signal<{ height: number; width: number } | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly isSaving = signal(false);

  #displayWidth = 0;
  #pendingCropperPosition: CropperPosition | null = null;
  #transformedImageWidth = 0;

  protected readonly maxCropWidth = computed(() => {
    const dimensions = this.sourceDimensions();
    return dimensions ? Math.round(Math.min(dimensions.width, dimensions.height * this.aspectRatio)) : 0;
  });

  protected readonly maxCropHeight = computed(() => Math.round(this.maxCropWidth() / this.aspectRatio));

  protected readonly canSave = computed(() => {
    const dimensions = this.cropDimensions();
    return !!dimensions && !this.sourceTooSmall() && !this.loadFailed() && isValidDimensionsForAspect(dimensions, this.aspect);
  });

  protected readonly showCropTooSmallHint = computed(() => {
    const dimensions = this.cropDimensions();
    return !!dimensions && !this.sourceTooSmall() && !this.loadFailed() && !isValidDimensionsForAspect(dimensions, this.aspect);
  });

  protected dismiss(): void {
    this.#dialogRef.close();
  }

  protected onCropperChange(position: CropperPosition): void {
    this.#pendingCropperPosition = position;
    this.#updateCropDimensions();
  }

  protected onCropperReady(size: Dimensions): void {
    this.#displayWidth = size.width;
    this.#updateCropDimensions();
  }

  protected onImageLoaded(image: LoadedImage): void {
    const height = image.original.size.height;
    const width = image.original.size.width;
    this.#transformedImageWidth = image.transformed.size.width;
    this.sourceDimensions.set({ height, width });
    this.sourceTooSmall.set(!canFitCropMinSize(width, height, this.aspect));
    this.loadFailed.set(false);
    this.#updateCropDimensions();
  }

  protected onLoadImageFailed(): void {
    this.loadFailed.set(true);
    this.cropDimensions.set(null);
  }

  protected async save(): Promise<void> {
    if (!this.canSave() || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    const cropper = this.imageCropper();
    const cropResult = cropper?.crop('blob');
    if (!cropResult) {
      this.isSaving.set(false);
      this.loadFailed.set(true);
      return;
    }

    try {
      const event = await cropResult;
      if (!isValidDimensionsForAspect(getCroppedSquareDimensions(event), this.aspect)) {
        this.cropDimensions.set(getCroppedSquareDimensions(event));
        this.isSaving.set(false);
        return;
      }

      const croppedFile = croppedEventToFile(event, this.data.imageFile);
      if (!croppedFile) {
        this.isSaving.set(false);
        this.loadFailed.set(true);
        return;
      }

      this.#dialogRef.close(croppedFile);
    } catch {
      this.isSaving.set(false);
      this.loadFailed.set(true);
    }
  }

  #updateCropDimensions(): void {
    const position = this.#pendingCropperPosition;
    if (!position) {
      return;
    }

    this.cropDimensions.set(getCropDimensionsFromCropperPosition(position, this.#displayWidth, this.#transformedImageWidth));
  }
}
