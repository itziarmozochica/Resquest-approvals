import { Injectable } from '@angular/core';

import QRCode from 'qrcode';

@Injectable({
  providedIn: 'root',
})
export class QrGeneratorService {
  generateQr(url: string, options?: { width: number }): Promise<string> {
    return options ? QRCode.toDataURL(url, options) : QRCode.toDataURL(url);
  }
}
