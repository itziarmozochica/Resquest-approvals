import { OboSecondScreenPaymentStatus } from './obo-second-screen-payment-status.model';

export class OboSecondScreenPayment {
  constructor(public status: OboSecondScreenPaymentStatus) {}

  static from(payment: OboSecondScreenPayment): OboSecondScreenPayment {
    return new OboSecondScreenPayment(payment.status);
  }
}
