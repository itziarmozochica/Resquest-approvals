export enum CreateEventGalleryUploadErrorReason {
  fileTooLarge = 'fileTooLarge',
  unsupportedFileType = 'unsupportedFileType',
  uploadFailed = 'uploadFailed',
}

export type CreateEventGalleryUploadResult = { error: CreateEventGalleryUploadErrorReason } | { fileName: string; fileUrl: string };

export const CREATE_EVENT_GALLERY_UPLOAD_ERROR_I18N_KEYS: Record<CreateEventGalleryUploadErrorReason, string> = {
  [CreateEventGalleryUploadErrorReason.fileTooLarge]: 'createEvent.quickSetupWizard.galleryUploadErrors.fileTooLarge',
  [CreateEventGalleryUploadErrorReason.unsupportedFileType]: 'createEvent.quickSetupWizard.galleryUploadErrors.unsupportedFileType',
  [CreateEventGalleryUploadErrorReason.uploadFailed]: 'planEdition.contentEdition.uploadingPhotoError',
};
