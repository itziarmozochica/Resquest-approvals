/**
 * A file the consumer shows as a removable pill under the drop zone.
 * `sizeInBytes` is optional: a file just picked from the device has one, a file
 * already stored may only have a name.
 */
export interface IgntFileUploadFile {
  readonly name: string;
  readonly sizeInBytes?: number;
}
