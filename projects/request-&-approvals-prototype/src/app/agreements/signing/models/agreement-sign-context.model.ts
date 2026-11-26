import { SignerRole } from '../../requirements/enums/signer-role.enum';

export interface SignContextAgreement {
  individualAgreementIds: string[];
  agreementId: string;
  agreementVersionId: string;
  version: number;
  validityDays: number | null;
  title: string;
  legalText: string;
  signerRole: SignerRole;
}

export interface AgreementSignContext {
  agreements: SignContextAgreement[];
}
