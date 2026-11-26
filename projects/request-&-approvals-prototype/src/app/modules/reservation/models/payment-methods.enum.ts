export enum PaymentMethod {
  BALANCE = 'balance',
  BOX_OFFICE = 'box-office',
  CARD = 'card',
  FREE = 'free',
  MARK_AS_PAID = 'mark-as-paid',
  PAYMENT_LINK = 'payment-link',
}

/**
 * @todo rename this, since it creates a clash
 * with the model declared at
 * `src/app/modules/box-office/checkout/models/payment-method.model.ts`
 * Also it should be placed in a `*.model.ts` file.
 */
export interface PaymentMethodOption {
  description?: string;
  label: string;
  value: string;
}
