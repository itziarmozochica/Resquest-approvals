import type { AgreementStatus } from '../enums/agreement-status.enum';
import type { AgreementType } from '../enums/agreement-type.enum';

export interface AgreementListFilters {
  agreementType?: AgreementType;
  status?: AgreementStatus;
}
