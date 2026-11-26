import { KioskImageBox, kioskImageMaxDevicePixelRatio, kioskImageWidthStepPx } from '../models/kiosk-image.model';

const cloudinaryUploadUrl = /^(https?:\/\/[^/]+\/image\/upload\/)((?:[a-z]{1,3}_[^/]*\/)*)(.+)$/;

export function fitKioskImageUrl(url: string, box: KioskImageBox): string {
  const match = cloudinaryUploadUrl.exec(url);
  if (match === null) {
    return url;
  }
  const uploadBase = match[1];
  const assetPath = match[3];
  return `${uploadBase}f_auto,q_auto:good,w_${box.widthPx},h_${box.heightPx},c_fill,g_auto/${assetPath}`;
}

export function toKioskImageBox(cssWidthPx: number, cssHeightPx: number, devicePixelRatio: number): KioskImageBox | null {
  if (!(cssWidthPx > 0) || !(cssHeightPx > 0)) {
    return null;
  }
  const safeRatio = Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1;
  const ratio = Math.min(Math.max(safeRatio, 1), kioskImageMaxDevicePixelRatio);
  const widthPx = Math.ceil((cssWidthPx * ratio) / kioskImageWidthStepPx) * kioskImageWidthStepPx;
  const heightPx = Math.round((widthPx * cssHeightPx) / cssWidthPx);
  return { heightPx, widthPx };
}
