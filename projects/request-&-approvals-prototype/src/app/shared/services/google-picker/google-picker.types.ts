export interface PickedFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
}

export interface GooglePickerOpenOptions {
  parentFolderId?: string;
  acceptedMimeTypes?: string[];
  selectFolders?: boolean;
}
