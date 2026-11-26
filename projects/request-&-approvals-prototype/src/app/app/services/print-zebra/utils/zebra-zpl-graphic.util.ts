import { ZebraImagePixels } from '../models/zebra-image-pixels.model';

const hexDigits = '0123456789ABCDEF';
const unitRepeatCounts = 'GHIJKLMNOPQRSTUVWXY';
const twentyRepeatCounts = 'ghijklmnopqrstuvwxyz';
const maxRepeatCount = 400;
const blackLuminanceThreshold = 128;
const opaqueAlphaThreshold = 128;

export function toZplGraphicField(pixels: ZebraImagePixels): string {
  const bytesPerRow: number = Math.ceil(pixels.width / 8);
  const rows: string[] = Array.from({ length: pixels.height }, (_: unknown, y: number) => toHexRow(pixels, y, bytesPerRow));
  const data: string = rows.map((row: string, index: number) => (index > 0 && row === rows[index - 1] ? ':' : compressRow(row))).join('');
  const totalBytes: number = bytesPerRow * pixels.height;

  return `^GFA,${totalBytes},${totalBytes},${bytesPerRow},${data}`;
}

function toHexRow(pixels: ZebraImagePixels, y: number, bytesPerRow: number): string {
  return Array.from({ length: bytesPerRow }, (_: unknown, byteIndex: number) => {
    const byte: number = Array.from({ length: 8 }, (__: unknown, bit: number) => byteIndex * 8 + bit).reduce(
      (value: number, x: number, bit: number) => (x < pixels.width && isBlack(pixels, x, y) ? value | (0x80 >> bit) : value),
      0,
    );

    return `${hexDigits[byte >> 4]}${hexDigits[byte & 0x0f]}`;
  }).join('');
}

function isBlack({ data, width }: ZebraImagePixels, x: number, y: number): boolean {
  const offset: number = (y * width + x) * 4;
  if (data[offset + 3] < opaqueAlphaThreshold) {
    return false;
  }

  return 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2] < blackLuminanceThreshold;
}

function compressRow(row: string): string {
  const withoutTrailingZeros: string = row.replace(/0+$/, '');
  if (withoutTrailingZeros.length < row.length) {
    return `${encodeRuns(withoutTrailingZeros)},`;
  }
  const withoutTrailingOnes: string = row.replace(/F+$/, '');
  if (withoutTrailingOnes.length < row.length) {
    return `${encodeRuns(withoutTrailingOnes)}!`;
  }

  return encodeRuns(row);
}

function encodeRuns(hex: string): string {
  return (hex.match(/(.)\1*/g) ?? []).map((run: string) => encodeRun(run[0], run.length)).join('');
}

function encodeRun(digit: string, length: number): string {
  if (length > maxRepeatCount) {
    return `${encodeRun(digit, maxRepeatCount)}${encodeRun(digit, length - maxRepeatCount)}`;
  }
  if (length === 1) {
    return digit;
  }
  const twenties: number = Math.floor(length / 20);
  const units: number = length % 20;

  return `${twenties > 0 ? twentyRepeatCounts[twenties - 1] : ''}${units > 0 ? unitRepeatCounts[units - 1] : ''}${digit}`;
}
