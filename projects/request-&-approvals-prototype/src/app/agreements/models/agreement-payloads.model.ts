import type { AgreementType } from '../enums/agreement-type.enum';
import type { PolicyStatus } from '../enums/policy-status.enum';

export interface CreateAgreementPayload {
  agreementType: AgreementType;
  name: string;
}

export interface UpdateAgreementPayload {
  agreementType: AgreementType;
  name: string;
}

export interface PublishVersionPayload {
  content: string;
  priorAcceptanceValid: boolean;
}

export interface SavePolicyPayload {
  crossPartnerReuseAllowed: boolean;
  effectiveFrom: string;
  effectiveUntil: string | null;
  expiresAfterDays: number | null;
  groupAcceptanceAllowed: boolean;
  guardianAcceptanceAllowed: boolean;
  status: PolicyStatus;
}
