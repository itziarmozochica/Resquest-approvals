import { PaymentCheckoutTransaction } from '@fz-original/app/app/models/payment.model';

export class SquareConfiguration {
  constructor(
    public locationId: string,
    public applicationId: string,
  ) {}

  clone(): SquareConfiguration {
    return new SquareConfiguration(this.locationId, this.applicationId);
  }

  isEqual(other?: SquareConfiguration): boolean {
    return this.locationId === other?.locationId && this.applicationId === other?.applicationId;
  }
}

export interface SquareCreateCheckoutBodyData {
  application_id: string;
  channel_id: string;
  device_id: string;
  idempotency_key: string;
  location_id: string;
  payment_method_type?: string;
  user_id: number;
  skip_receipt_screen?: boolean;
}

export interface SquareCreateCheckoutBody {
  applicationId: string;
  channelId: string;
  deviceId: string;
  idempotencyKey: string;
  locationId: string;
  paymentMethodType?: string;
  skipReceiptScreen?: boolean;
}

export interface CreateSquarePairingCodeRequestBody {
  application_id: string;
  idempotency_key: string;
  location_id: string;
  name?: string;
  plan_id: number;
}

export interface CreateSquarePairingCode {
  applicationId: string;
  idempotencyKey: string;
  locationId: string;
  name?: string;
  planId: number;
}

export interface SquarePairingCodeResponse {
  pairing_code: string;
  terminal_pairing_intent_id: string;
}

export interface SquarePairingCode {
  pairingCode: string;
  pairingCodeId: string;
}

export interface SquarePairingStatusResponse {
  external_id: string;
}

export interface PairingStatus {
  externalId: string;
}

export interface SquareCheckout extends PaymentCheckoutTransaction {
  idempotencyKey?: string;
}
