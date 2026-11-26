import type { AgreementStatus } from '../enums/agreement-status.enum';
import type { AgreementType } from '../enums/agreement-type.enum';
import type { AcceptancePolicy } from './acceptance-policy.model';
import type { AgreementVersion } from './agreement-version.model';

export interface Agreement {
  agreementType: AgreementType;
  createdAt: string;
  id: string;
  name: string;
  partnerId: string;
  policy: AcceptancePolicy | null;
  status: AgreementStatus;
  updatedAt: string;
  versions: AgreementVersion[];
}

export interface AgreementListResult {
  items: Agreement[];
  unreadable: number;
}
