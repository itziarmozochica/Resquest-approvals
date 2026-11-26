import { CoverageRule } from '../../requirements/enums/coverage-rule.enum';
import { SignerRole } from '../../requirements/enums/signer-role.enum';
import { IndividualAgreementStatus } from '../enums/individual-agreement-status.enum';

export interface IndividualAgreementSummary {
  id: string;
  title: string;
}

export interface IndividualAgreementParticipant {
  label: string;
}

export interface IndividualAgreement {
  agreement: IndividualAgreementSummary;
  coverageRule: CoverageRule;
  expiresAt: string | null;
  id: string;
  identified: boolean;
  isClaimed: boolean;
  /** Null on a `per_order` agreement, which covers the booking rather than one attendee. */
  orderItemId: number | null;
  participant: IndividualAgreementParticipant | null;
  signerRole: SignerRole;
  signUrl: string;
  status: IndividualAgreementStatus;
  ticketId: number | null;
}
