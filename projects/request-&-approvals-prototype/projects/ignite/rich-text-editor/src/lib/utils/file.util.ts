export const IMAGE_MIME_TYPES: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const maxImageDataUriSizeInBytes = 5 * 2 ** 20;

export function isDataUri(url: string): boolean {
  return url.split(':')[0].toLowerCase() === 'data';
}

function getBase64PayloadSizeInBytes(payload: string): number | null {
  if (!/^[A-Za-z0-9+/]*={0,2}$/u.test(payload) || payload.length % 4 === 1) {
    return null;
  }

  const paddingLength = getBase64PaddingLength(payload);

  return Math.floor((payload.length * 3) / 4) - paddingLength;
}

function getBase64PaddingLength(payload: string): number {
  if (payload.endsWith('==')) {
    return 2;
  }

  if (payload.endsWith('=')) {
    return 1;
  }

  return 0;
}

export function isValidImageDataUri(dataUri: string): boolean {
  if (!dataUri.startsWith('data:')) {
    return false;
  }

  const commaIndex = dataUri.indexOf(',');

  if (commaIndex === -1) {
    return false;
  }

  const metadata = dataUri.slice(5, commaIndex);
  const payload = dataUri.slice(commaIndex + 1);

  if (payload.length === 0) {
    return false;
  }

  const metadataParts = metadata.split(';');
  const mimeType = metadataParts[0];
  const isBase64Encoded = metadataParts.includes('base64');
  const payloadSizeInBytes = getBase64PayloadSizeInBytes(payload);

  return (
    isBase64Encoded &&
    IMAGE_MIME_TYPES.includes(mimeType) &&
    payloadSizeInBytes !== null &&
    payloadSizeInBytes <= maxImageDataUriSizeInBytes
  );
}

export function dataUriToBlob(dataUri: string): Blob | null {
  const commaIndex = dataUri.indexOf(',');

  if (commaIndex === -1) {
    return null;
  }

  const metadata = dataUri.slice(5, commaIndex);
  const payload = dataUri.slice(commaIndex + 1);
  const mimeType = metadata.split(';')[0];

  try {
    const byteString = atob(payload);
    const bytesBuffer = new ArrayBuffer(byteString.length);
    const bytesArray = new Uint8Array(bytesBuffer);

    for (let index = 0; index < byteString.length; index += 1) {
      bytesArray[index] = byteString.charCodeAt(index);
    }

    return new Blob([bytesBuffer], { type: mimeType });
  } catch {
    return null;
  }
}

export function extractDataUriFromHtml(htmlContent: string): string | null {
  const match = /src="(?<dataUri>data:[^"]+)"/u.exec(htmlContent);

  return match?.groups?.dataUri ?? null;
}
