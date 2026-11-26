/** A file queued for upload together with the relative path it should preserve. */
export interface PendingUploadFile {
  file: File;
  /**
   * Path relative to the upload root in `webkitRelativePath` format — folder segments plus the
   * filename, `/`-separated (e.g. `Photos/Hero/banner.jpg`). Empty string = root (no structure).
   * The backend derives the directory by dropping the last element.
   */
  relativePath: string;
}
