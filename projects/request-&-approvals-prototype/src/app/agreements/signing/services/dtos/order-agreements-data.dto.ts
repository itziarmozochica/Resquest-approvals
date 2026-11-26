import { IndividualAgreementDto } from './individual-agreement.dto';

export interface OrderAgreementsSummaryDto {
  required: number;
  signed: number;
}

/** Mirrors fever2's `PartnerOrderAgreementsDataSchema`. */
export interface OrderAgreementsDataDto {
  individual_agreements: IndividualAgreementDto[];
  order_id: number;
  summary: OrderAgreementsSummaryDto;
}
