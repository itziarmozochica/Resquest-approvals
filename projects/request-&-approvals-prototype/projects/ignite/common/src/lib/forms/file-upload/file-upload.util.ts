import type { IgntFileUploadFile } from './models/file-upload.model';

const bytesPerUnit = 1024;
const sizeUnits = ['K', 'M', 'G'];

export function fileUploadPillLabel(file: IgntFileUploadFile): string {
  if (file.sizeInBytes === undefined) {
    return file.name;
  }

  return `${file.name} (${fileUploadSizeLabel(file.sizeInBytes)})`;
}

function fileUploadSizeLabel(sizeInBytes: number): string {
  const wholeBytes = Math.round(sizeInBytes);

  if (wholeBytes < bytesPerUnit) {
    return `${wholeBytes}B`;
  }

  let value = wholeBytes / bytesPerUnit;
  let unitIndex = 0;

  while (value >= bytesPerUnit && unitIndex < sizeUnits.length - 1) {
    value /= bytesPerUnit;
    unitIndex += 1;
  }

  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);

  return `${rounded}${sizeUnits[unitIndex]}`;
}
