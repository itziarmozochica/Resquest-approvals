import type { PolicyStatus } from '../enums/policy-status.enum';

export interface AcceptancePolicy {
  agreementId: string;
  createdAt: string;
  crossPartnerReuseAllowed: boolean;
  effectiveFrom: string;
  effectiveUntil: string | null;
  expiresAfterDays: number | null;
  groupAcceptanceAllowed: boolean;
  guardianAcceptanceAllowed: boolean;
  id: string;
  status: PolicyStatus;
  updatedAt: string;
}
