import { IndividualAgreement } from './individual-agreement.model';

/** Named after the `AgreementSigningService` method that runs it. */
export type OrderAgreementAction = 'recheck' | 'reopen' | 'waive';

export interface OrderAgreementsSummary {
  required: number;
  signed: number;
}

export interface OrderAgreements {
  individualAgreements: IndividualAgreement[];
  orderId: number;
  summary: OrderAgreementsSummary;
}
