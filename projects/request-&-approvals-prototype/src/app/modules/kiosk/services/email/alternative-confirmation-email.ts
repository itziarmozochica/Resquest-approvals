import { Observable } from 'rxjs';

import { BaseResponse } from '../../../../shared/models/base-response';
import { KioskConfirmationEmailData } from './kiosk-confirmation-email.model';

export interface AlternativeConfirmationEmailService {
  sendAlternativeConfirmationEmail(data: KioskConfirmationEmailData): Observable<BaseResponse<null>>;
}
