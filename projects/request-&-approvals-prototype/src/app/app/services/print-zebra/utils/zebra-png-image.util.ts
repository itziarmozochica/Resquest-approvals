import { PrintDocumentRenderError } from '@fz-original/app/shared/services/ticket-pdf-generator/errors/print-document-render.error';

import { ZebraImagePixels } from '../models/zebra-image-pixels.model';

const pngDataUrlPrefix = 'data:image/png;base64,';

export function toPngDataUrl(base64: string): string {
  return `${pngDataUrlPrefix}${base64}`;
}

export async function rotatePngDataUrl180(dataUrl: string): Promise<string> {
  const image: HTMLImageElement = await loadImage(dataUrl);
  const canvas: HTMLCanvasElement = document.createElement('canvas');
  const context: CanvasRenderingContext2D | null = canvas.getContext('2d');
  if (context === null) {
    throw new PrintDocumentRenderError('Could not get the canvas context to rotate the ticket image', 'raster_error');
  }
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  context.translate(canvas.width, canvas.height);
  context.rotate(Math.PI);
  context.drawImage(image, 0, 0);

  return canvas.toDataURL('image/png');
}

export async function readPngDataUrlPixels(dataUrl: string): Promise<ZebraImagePixels> {
  const image: HTMLImageElement = await loadImage(dataUrl);
  const canvas: HTMLCanvasElement = document.createElement('canvas');
  const context: CanvasRenderingContext2D | null = canvas.getContext('2d');
  if (context === null) {
    throw new PrintDocumentRenderError('Could not get the canvas context to read the ticket image', 'raster_error');
  }
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  context.drawImage(image, 0, 0);
  const { data, height, width }: ImageData = context.getImageData(0, 0, canvas.width, canvas.height);

  return { data, height, width };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve: (image: HTMLImageElement) => void, reject: (reason: unknown) => void) => {
    const image: HTMLImageElement = new Image();
    image.onload = (): void => resolve(image);
    image.onerror = (): void => reject(new PrintDocumentRenderError('Could not decode the ticket image', 'raster_error'));
    image.src = dataUrl;
  });
}
