import type { IndividualAgreement } from '@fz-original/app/agreements/signing/models/individual-agreement.model';

export type OrderAgreementsListState = 'hidden' | 'loading' | 'error' | 'loaded';

export interface OrderAgreementsView {
  agreements: Array<IndividualAgreement>;
  errorKey: string | null;
  pending: number;
  state: OrderAgreementsListState;
}

export interface OrderAgreementsRequest {
  hasReleaseConditions: boolean;
  orderId: number | null;
  partnerId: number | null;
}
