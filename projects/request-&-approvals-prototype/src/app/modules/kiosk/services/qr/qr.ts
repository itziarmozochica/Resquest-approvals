import { Observable } from 'rxjs';

import { QRData } from './kiosk-qr.model';

export interface QRService {
  generateQr(data: QRData): Observable<string>;
}
