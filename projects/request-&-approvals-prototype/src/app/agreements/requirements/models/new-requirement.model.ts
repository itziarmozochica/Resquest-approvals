import { CoverageRule } from '../enums/coverage-rule.enum';
import { SignerRole } from '../enums/signer-role.enum';
import { LocalizedText } from './localized-text.model';

export interface NewRequirement {
  agreementId: string;
  coverageRule: CoverageRule;
  mainPlanId: number;
  sessionTypeId: number | null;
  signerRole: SignerRole;
  translations: LocalizedText;
}
