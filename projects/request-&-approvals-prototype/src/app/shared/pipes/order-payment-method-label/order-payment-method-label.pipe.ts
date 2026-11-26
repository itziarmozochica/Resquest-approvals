import { inject, Pipe, PipeTransform } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { resolveOrderPaymentMethodLabel } from '../../utils/payment-method-display/order-payment-method-label.util';

@Pipe({
  name: 'orderPaymentMethodLabel',
})
export class OrderPaymentMethodLabelPipe implements PipeTransform {
  readonly #translate = inject(TranslateService);

  transform(paymentMethod: string | null | undefined, channelId: string, paymentMethodName: string | null = null): string {
    return resolveOrderPaymentMethodLabel(this.#translate, paymentMethod, channelId, paymentMethodName);
  }
}
