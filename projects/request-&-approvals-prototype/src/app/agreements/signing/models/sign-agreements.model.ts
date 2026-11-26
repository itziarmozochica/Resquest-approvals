import { IndividualAgreementStatus } from '../enums/individual-agreement-status.enum';
import { SignerIdentity } from './signer-identity.model';

/**
 * A row to sign. The participant's name travels only when a guardian signs on a minor's behalf:
 * the Agreement Service rejects names on a self-signed row, and demands them on a guardian one.
 */
export interface IndividualAgreementToSign {
  id: string;
  firstName?: string;
  lastName?: string;
}

export interface SignAgreementsPayload {
  individualAgreements: IndividualAgreementToSign[];
  agreementVersionId: string;
  signer: SignerIdentity;
  guardianDeclarationAccepted: boolean;
}

export interface SignedIndividualAgreement {
  id: string;
  status: IndividualAgreementStatus;
}

export interface SignAgreementsResult {
  acceptanceId: string;
  acceptedAt: string;
  individualAgreements: SignedIndividualAgreement[];
}
