import { PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';

export interface FranceAsyncFiscalContext {
  cartId: string;
  parentTransactionId: string;
  partnerId: number;
  paymentCheckout: PaymentCheckoutET;
  blockBooker?: boolean;
  blocksPurchaseOnFailure?: boolean;
  onFiscalFailureDetected?: () => void;
}
