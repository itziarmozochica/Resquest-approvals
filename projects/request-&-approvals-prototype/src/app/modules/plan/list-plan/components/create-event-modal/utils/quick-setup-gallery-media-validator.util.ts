import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { CreateMainPlanMediaItem } from '@fz-original/app/shared/services/plan/create-main-plan.service';

export function isQuickSetupGalleryPhoto(item: CreateMainPlanMediaItem): boolean {
  return Boolean(item.url) && item.poster === undefined && item.playback_rate === undefined;
}

export interface QuickSetupGalleryMediaValidatorContext {
  hasGalleryContent: boolean;
  isUploadInProgress: boolean;
}

export function createQuickSetupGalleryMediaValidator(getContext: () => QuickSetupGalleryMediaValidatorContext): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const { hasGalleryContent, isUploadInProgress } = getContext();

    if (isUploadInProgress) {
      return { galleryUploadPending: true };
    }

    if (!hasGalleryContent) {
      return null;
    }

    const media = control.value as CreateMainPlanMediaItem[] | null | undefined;

    if (!media?.some(isQuickSetupGalleryPhoto)) {
      return { required: true };
    }

    return null;
  };
}
