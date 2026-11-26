import { InjectionToken } from '@angular/core';

import { PurchaseConfirmationResendService } from './purchase-confirmation-resend';

export const PURCHASE_CONFIRMATION_RESEND_SERVICE = new InjectionToken<PurchaseConfirmationResendService>(
  'PURCHASE_CONFIRMATION_RESEND_SERVICE',
);
