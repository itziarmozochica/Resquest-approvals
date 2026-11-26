import { TranslateService } from '@ngx-translate/core';

import { resolvePaymentMethodLabel } from './payment-method-display.util';

const missingPaymentMethodLabel = '—';

export const NEW_RECEIPT_DOCUMENT_LABEL_KEY = 'businessManagement.paymentSettings.new_receipt_document';

export function resolveOrderPaymentMethodLabel(
  translate: TranslateService,
  paymentMethod: string | null | undefined,
  channelId: string,
  paymentMethodName: string | null = null,
): string {
  if (!paymentMethod) {
    return missingPaymentMethodLabel;
  }
  const key = orderPaymentMethodLabelKey(paymentMethod, channelId);
  const translated: string = translate.instant(key);
  const servedName = key === NEW_RECEIPT_DOCUMENT_LABEL_KEY ? null : paymentMethodName;
  return resolvePaymentMethodLabel(servedName, paymentMethod, translated === key ? null : translated);
}

function orderPaymentMethodLabelKey(paymentMethod: string, channelId: string): string {
  if (channelId !== 'box-office' && channelId !== 'kiosk' && paymentMethod === 'receipt_document') {
    return NEW_RECEIPT_DOCUMENT_LABEL_KEY;
  }
  return `boxOffice.cart.paymentMethods.${paymentMethod}`;
}
