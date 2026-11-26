import { Observable } from 'rxjs';

import { BaseResponse } from '../../../models/base-response';
import { ResendPurchaseConfirmationEmailData } from './resend-purchase-confirmation-email-data.model';
import { ResendWhatsappPurchaseConfirmationData } from './resend-whatsapp-purchase-confirmation-data.model';

export interface PurchaseConfirmationResendService {
  resendPurchaseConfirmationEmail(data: ResendPurchaseConfirmationEmailData): Observable<BaseResponse<unknown>>;
  resendWhatsappPurchaseConfirmation(data: ResendWhatsappPurchaseConfirmationData): Observable<BaseResponse<unknown>>;
}
