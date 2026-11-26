export type ReservePaymentGateway = 'delegated' | 'fever' | 'free' | 'partners' | 'stripe';

export type ReservePaymentMethod = 'balance' | 'card' | 'cash' | 'invoicing';

export interface ReservePayment {
  readonly paymentGateway: ReservePaymentGateway;
  readonly paymentIntentId?: string | null;
  readonly paymentMethod?: ReservePaymentMethod;
}

export interface ReserveExpirationReminder {
  readonly hoursLeft: number;
}

export interface ReserveB2bEmployee {
  readonly email: string;
  readonly id: number;
  readonly name: string;
  readonly username: string;
}

export interface ReservePayload {
  readonly b2bEmployee?: ReserveB2bEmployee;
  readonly channelId?: string;
  readonly expirationReminders?: readonly ReserveExpirationReminder[];
  readonly externalLocatorId?: string;
  readonly includeDeliveryNoteAttachment?: boolean;
  readonly payment?: ReservePayment;
}
